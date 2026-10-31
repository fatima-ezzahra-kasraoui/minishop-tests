// Tests de performance k6 pour minishop-app.
//
// Quatre scénarios exécutés l'un après l'autre (startTime décalés) pour qu'ils ne se
// perturbent pas :
//   1. smoke        un parcours complet, 1 utilisateur : l'application répond-elle ?
//   2. catalog_load lecture du catalogue et recherche, jusqu'à 15 utilisateurs
//   3. auth_load    inscription + connexion à débit constant, volontairement léger
//   4. basket_flow  parcours panier authentifié, 3 utilisateurs
//
// L'authentification est la route la plus coûteuse : le serveur hache les mots de passe
// avec scrypt de façon synchrone (≈ 60 ms de CPU par appel, sur un seul fil d'exécution).
// Les charges d'auth_load et basket_flow sont donc calibrées en conséquence.
//
// Lancer : k6 run -e BASE_URL=http://localhost:3000 k6/minishop.js
// Un seuil dépassé fait échouer k6 (code de sortie 99), donc la CI.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, authHeaders, login, register } from './lib.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      exec: 'smoke',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
      startTime: '0s',
    },
    catalog_load: {
      executor: 'ramping-vus',
      exec: 'catalogLoad',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 15 },
        { duration: '25s', target: 15 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '5s',
      startTime: '5s',
    },
    auth_load: {
      executor: 'constant-arrival-rate',
      exec: 'authLoad',
      rate: 3, // 3 itérations toutes les 2 s, soit 1,5 inscription + 1,5 connexion par seconde
      timeUnit: '2s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      gracefulStop: '5s',
      startTime: '50s',
    },
    basket_flow: {
      executor: 'constant-vus',
      exec: 'basketFlow',
      vus: 3,
      duration: '30s',
      gracefulStop: '5s',
      startTime: '85s',
    },
  },

  thresholds: {
    // smoke : aucune erreur tolérée.
    'checks{scenario:smoke}': ['rate==1'],
    'http_req_failed{scenario:smoke}': ['rate==0'],
    'http_req_duration{scenario:smoke}': ['p(95)<500'],

    // Charges : 95 % des requêtes sous 500 ms et moins de 1 % d'erreurs.
    'http_req_duration{scenario:catalog_load}': ['p(95)<500'],
    'http_req_failed{scenario:catalog_load}': ['rate<0.01'],
    'checks{scenario:catalog_load}': ['rate>0.99'],

    'http_req_duration{scenario:auth_load}': ['p(95)<500'],
    'http_req_failed{scenario:auth_load}': ['rate<0.01'],
    'checks{scenario:auth_load}': ['rate>0.99'],

    'http_req_duration{scenario:basket_flow}': ['p(95)<500'],
    'http_req_failed{scenario:basket_flow}': ['rate<0.01'],
    'checks{scenario:basket_flow}': ['rate>0.99'],
  },
};

// Mots présents (ou non) dans le catalogue de l'application.
const SEARCHES = ['', 'souris', 'clavier', 'hdmi', 'ssd', 'casque', 'introuvable'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 1. Smoke : un parcours complet de l'application.
export function smoke() {
  group('pages et API publiques', () => {
    const home = http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });
    check(home, { 'accueil : 200': (r) => r.status === 200 });

    const health = http.get(`${BASE_URL}/api/health`, { tags: { name: 'GET /api/health' } });
    check(health, {
      'santé : 200': (r) => r.status === 200,
      'santé : status ok': (r) => r.json('status') === 'ok',
    });

    const list = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET /api/products' } });
    check(list, {
      'catalogue : 200': (r) => r.status === 200,
      'catalogue : produits présents': (r) => r.json('count') > 0,
    });

    const search = http.get(`${BASE_URL}/api/products?q=souris`, {
      tags: { name: 'GET /api/products?q=' },
    });
    check(search, {
      'recherche : 200': (r) => r.status === 200,
      'recherche : résultat trouvé': (r) => r.json('count') > 0,
    });
  });

  group('parcours client', () => {
    const { email, id } = register();
    const token = login(email);
    if (!id || !token) return;

    const headers = authHeaders(token);
    const add = http.post(
      `${BASE_URL}/api/basket/items`,
      JSON.stringify({ productId: 1, quantity: 2 }),
      { headers, tags: { name: 'POST /api/basket/items' } },
    );
    check(add, { 'ajout au panier : 200': (r) => r.status === 200 });

    const basket = http.get(`${BASE_URL}/api/basket/${id}`, {
      headers,
      tags: { name: 'GET /api/basket/:userId' },
    });
    check(basket, {
      'panier : 200': (r) => r.status === 200,
      'panier : une ligne': (r) => r.json('items').length === 1,
    });

    const del = http.del(`${BASE_URL}/api/basket/items/1`, null, {
      headers,
      tags: { name: 'DELETE /api/basket/items/:productId' },
    });
    check(del, { 'retrait du panier : 204': (r) => r.status === 204 });
  });
}

// 2. Lecture du catalogue et recherche sous charge.
export function catalogLoad() {
  const list = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET /api/products' } });
  check(list, {
    'catalogue : 200': (r) => r.status === 200,
    'catalogue : produits présents': (r) => r.json('count') > 0,
  });

  const search = http.get(`${BASE_URL}/api/products?q=${encodeURIComponent(pick(SEARCHES))}`, {
    tags: { name: 'GET /api/products?q=' },
  });
  check(search, { 'recherche : 200': (r) => r.status === 200 });

  sleep(0.2 + Math.random() * 0.5);
}

// 3. Inscription puis connexion à débit constant.
export function authLoad() {
  const { email, id } = register();
  if (id) login(email);
}

// 4. Parcours panier. Le compte est créé une seule fois par utilisateur virtuel (variable
// de module, propre à chaque VU) : les itérations suivantes mesurent le panier, pas scrypt.
let session;

export function basketFlow() {
  if (!session) {
    const { email, id } = register();
    const token = id ? login(email) : null;
    if (!id || !token) {
      sleep(1);
      return;
    }
    session = { id, token };
  }

  const headers = authHeaders(session.token);
  const productId = 1 + Math.floor(Math.random() * 12);

  const add = http.post(
    `${BASE_URL}/api/basket/items`,
    JSON.stringify({ productId, quantity: 1 }),
    { headers, tags: { name: 'POST /api/basket/items' } },
  );
  check(add, { 'ajout au panier : 200': (r) => r.status === 200 });

  const basket = http.get(`${BASE_URL}/api/basket/${session.id}`, {
    headers,
    tags: { name: 'GET /api/basket/:userId' },
  });
  check(basket, {
    'panier : 200': (r) => r.status === 200,
    'panier : non vide': (r) => r.status === 200 && r.json('items').length > 0,
  });

  const del = http.del(`${BASE_URL}/api/basket/items/${productId}`, null, {
    headers,
    tags: { name: 'DELETE /api/basket/items/:productId' },
  });
  check(del, { 'retrait du panier : 204': (r) => r.status === 204 });

  sleep(1);
}

// Résumé Markdown : affiché dans la console et réutilisé par la CI (résumé du job).
export function handleSummary(data) {
  const mode = __ENV.MODE || '?';
  const round = (value) => Math.round(value * 1000) / 1000;
  const rows = [];
  let failed = 0;

  for (const [metric, m] of Object.entries(data.metrics)) {
    for (const [expression, threshold] of Object.entries(m.thresholds || {})) {
      const stat = expression.match(/^([\w().]+?)\s*(<=|>=|==|<|>)/)?.[1];
      const measured = stat !== undefined && m.values[stat] !== undefined ? round(m.values[stat]) : '–';
      if (!threshold.ok) failed += 1;
      rows.push(`| \`${metric}\` | \`${expression}\` | ${measured} | ${threshold.ok ? '✅' : '❌'} |`);
    }
  }

  const requests = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const markdown = [
    `### k6 (BUGS=${mode})`,
    '',
    `${requests} requêtes · ${failed === 0 ? 'tous les seuils respectés' : `${failed} seuil(s) dépassé(s)`}`,
    '',
    '| Métrique | Seuil | Mesuré | Résultat |',
    '| --- | --- | ---: | :---: |',
    ...rows,
    '',
  ].join('\n');

  return { stdout: markdown, 'k6-out/summary.md': markdown };
}
