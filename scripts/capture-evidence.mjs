// Génère les preuves citées par docs/bugs/*.md : captures d'écran (défauts d'interface)
// et réponses HTTP brutes (défauts d'API) dans docs/evidence/.
//
// Prérequis : l'application tourne avec BUGS=on.
//   BUGS=on npm run evidence
//
// Le script est reproductible : relancé, il régénère les mêmes fichiers.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'evidence');
const PASSWORD = 'Motdepasse-123';

await mkdir(outDir, { recursive: true });

async function health() {
  const response = await fetch(`${baseURL}/api/health`).catch(() => null);
  if (!response?.ok) throw new Error(`L'application ne répond pas sur ${baseURL}.`);
  return (await response.json()).bugs;
}

const bugs = await health();
if (bugs.mode !== 'on') {
  throw new Error(`Les preuves de défauts exigent BUGS=on (mode actuel : ${bugs.mode}).`);
}

const unique = (prefix) => `${prefix}.${Math.random().toString(36).slice(2, 10)}@minishop-tests.example.com`;

async function http(method, route, { token, body } = {}) {
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseURL}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { response, text };
}

/** Écrit une transcription lisible requête/réponse. */
async function writeTranscript(file, { request, response, text, notes }) {
  const headerLines = [...response.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
  const content = [
    notes ? `# ${notes}\n` : '',
    `> ${request}`,
    '',
    `HTTP ${response.status} ${response.statusText}`,
    headerLines,
    '',
    text.length > 1500 ? `${text.slice(0, 1500)}\n[...tronqué]` : text,
    '',
  ].join('\n');
  await writeFile(path.join(outDir, file), content, 'utf8');
  console.log('écrit', file);
}

async function createUser(prefix) {
  const email = unique(prefix);
  const { text } = await http('POST', '/api/register', { body: { email, password: PASSWORD } });
  const { id } = JSON.parse(text);
  const login = await http('POST', '/api/login', { body: { email, password: PASSWORD } });
  return { id, email, token: JSON.parse(login.text).token };
}

// ---------- Captures d'écran (interface) ----------

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });

async function shot(file, locator) {
  await locator.screenshot({ path: path.join(outDir, file) });
  console.log('écrit', file);
}

// TC-REG-05 : comportement correct (même en BUGS=on, la validation client du minimum est saine).
await page.goto(baseURL);
await page.getByTestId('nav-register').click();
await page.getByTestId('register-email').fill(unique('tc-reg-05'));
await page.getByTestId('register-password').pressSequentially('abcd');
await page.getByTestId('register-submit').click();
await page.getByTestId('register-password-error').waitFor();
await shot('TC-REG-05-pwd-4chars.png', page.getByTestId('view-register'));

// BUG-001 : compteur /20.
await page.goto(baseURL);
await page.getByTestId('nav-register').click();
await page.getByTestId('register-password').pressSequentially('abcde');
await shot('BUG-001-compteur-5-sur-20.png', page.getByTestId('view-register'));

// BUG-003 : a@g accepté.
await page.goto(baseURL);
await page.getByTestId('nav-register').click();
await page.getByTestId('register-email').fill(`a${Math.random().toString(36).slice(2, 8)}@g`);
await page.getByTestId('register-password').fill(PASSWORD);
await page.getByTestId('register-submit').click();
await page.getByTestId('register-success').waitFor();
await shot('BUG-003-email-sans-domaine-accepte.png', page.getByTestId('view-register'));

// BUG-006 : HTML injecté dans le titre de recherche (balisage visible, aucun script exécuté).
await page.goto(baseURL);
await page.getByTestId('search-input').fill('<b style="color:#b3261e;font-size:1.6em">HTML injecté</b>');
await page.getByTestId('search-submit').click();
await page.getByTestId('search-count').filter({ hasText: 'Aucun produit trouvé.' }).waitFor();
await shot('BUG-006-xss-titre-recherche.png', page.getByTestId('view-products'));

await browser.close();

// ---------- Transcriptions HTTP (API) ----------

{
  const email = unique('bug002');
  const { response, text } = await http('POST', '/api/register', { body: { email, password: 'abc' } });
  await writeTranscript('BUG-002-mot-de-passe-3-caracteres-accepte.txt', {
    request: `POST /api/register  {"email":"${email}","password":"abc"}`,
    response,
    text,
    notes: 'Attendu : 400 PASSWORD_LENGTH. Obtenu : le compte est créé.',
  });
}

{
  const alice = await createUser('alice');
  const bob = await createUser('bob');
  await http('POST', '/api/basket/items', { token: alice.token, body: { productId: 1, quantity: 2 } });
  const { response, text } = await http('GET', `/api/basket/${alice.id}`, { token: bob.token });
  await writeTranscript('BUG-004-idor-panier-d-autrui.txt', {
    request: `GET /api/basket/${alice.id}  (jeton de Bob, utilisateur ${bob.id})`,
    response,
    text,
    notes: "Attendu : 403 FORBIDDEN. Obtenu : le panier d'Alice est renvoyé à Bob.",
  });

  const anonymous = await http('GET', `/api/basket/${alice.id}`);
  await writeTranscript('BUG-005-panier-sans-jeton.txt', {
    request: `GET /api/basket/${alice.id}  (aucun en-tête Authorization)`,
    response: anonymous.response,
    text: anonymous.text,
    notes: 'Attendu : 401 AUTH_REQUIRED. Obtenu : le panier est renvoyé sans authentification.',
  });
}

{
  const { response, text } = await http('GET', '/api/products?q=(');
  await writeTranscript('BUG-007-erreur-500-avec-trace.txt', {
    request: 'GET /api/products?q=(',
    response,
    text,
    notes: 'Attendu : 200 avec liste vide. Obtenu : 500 et trace de pile dans le corps.',
  });
}

{
  const { response, text } = await http('GET', '/');
  await writeTranscript('BUG-008-en-tetes-absents.txt', {
    request: 'GET /',
    response,
    text: '[corps HTML omis]',
    notes:
      'Attendu : Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy ; pas de X-Powered-By. ' +
      'Obtenu : aucun en-tête de sécurité, X-Powered-By: Express présent.',
  });
  void text;
}
