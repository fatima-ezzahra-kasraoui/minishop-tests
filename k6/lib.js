// Aides partagées par les scénarios k6.
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

// 8 à 40 caractères, comme l'exige la spécification.
const PASSWORD = 'MotDePasse-k6-2026';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** E-mail unique par VU, itération et instant : aucun conflit (409) entre exécutions. */
export function uniqueEmail() {
  return `k6-${__VU}-${__ITER}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Crée un compte. L'option `name` regroupe les mesures par route et non par URL. */
export function register(email = uniqueEmail()) {
  const res = http.post(
    `${BASE_URL}/api/register`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/register' } },
  );
  const ok = check(res, { 'inscription : 201': (r) => r.status === 201 });
  return { email, id: ok ? res.json('id') : null };
}

/** Ouvre une session et renvoie le jeton (ou null en cas d'échec). */
export function login(email) {
  const res = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/login' } },
  );
  const ok = check(res, {
    'connexion : 200': (r) => r.status === 200,
    'connexion : jeton présent': (r) => r.status === 200 && Boolean(r.json('token')),
  });
  return ok ? res.json('token') : null;
}

export function authHeaders(token) {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}
