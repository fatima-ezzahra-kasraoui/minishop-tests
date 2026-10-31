# minishop-tests

Framework de test automatisé (Playwright, TypeScript) pour [`minishop-app`](https://github.com/fatima-ezzahra-kasraoui/-Minishop-app) : E2E, API et sécurité de premier niveau, avec Page Object Model, une CI à deux modes et une documentation de test complète.

![CI](https://github.com/fatima-ezzahra-kasraoui/minishop-tests/actions/workflows/playwright.yml/badge.svg)


## Principe

L'application existe en deux modes, choisis par la variable `BUGS` :

| Mode | Application | Résultat attendu de la suite |
|---|---|---|
| `BUGS=off` | conforme à la spécification | tous les tests passent |
| `BUGS=on` | 8 défauts volontaires | chaque défaut est détecté par au moins un test |

Un test qui vise un défaut connu appelle `expectBug('BUG-00X')` (`utils/bugs.ts`), basé sur `test.fail()` de Playwright : tant que le défaut est actif, l'échec est attendu et rapporté comme réussi ; si le test se met à passer, Playwright le signale, ce qui indique que le bug est corrigé.

Avant toute exécution, `utils/global-setup.ts` attend l'application et **refuse de tourner si son mode ne correspond pas à `BUGS`** : lancer la suite en `off` contre une application en `on` produirait des échecs trompeurs.

## Prérequis

- Node.js 22 ou plus
- L'application démarrée sur `http://localhost:3000` (variable `BASE_URL` pour changer l'adresse)

## Lancer

```bash
# 1. Application (dépôt minishop-app), mode correct
docker run -d --name minishop -p 3000:3000 -e BUGS=off ghcr.io/fatima-ezzahra-kasraoui/minishop-app
# ou, sans Docker : cd ../minishop-app && npm ci && npm start

# 2. Tests
npm ci
npx playwright install chromium
npm test                       # toute la suite
npm run test:e2e               # ou test:api, test:security
npm run report                 # rapport HTML
```

Pour le mode avec défauts, relancer l'application avec `-e BUGS=on` et lancer les tests avec la **même** valeur :

```bash
BUGS=on npm test
```

Sous Windows PowerShell : `$env:BUGS="on"; npm.cmd test`. Si les scripts sont bloqués par la stratégie d'exécution, utiliser `npm.cmd` et `npx.cmd`.

## Structure

```
minishop-tests/
├── tests/
│   ├── e2e/          interface (inscription, connexion, produits, panier)
│   ├── api/          contrat et validation côté serveur
│   ├── security/     accès, jetons, XSS, en-têtes HTTP
│   └── fixtures.ts   Page Objects et client d'API injectés dans chaque test
├── pages/            Page Objects (Register, Login, Products, Basket)
├── utils/            données uniques, client d'API, messages de la spec, garde de mode
├── scripts/          capture-evidence.mjs : régénère les preuves des bugs
├── docs/
│   ├── test-plan.md       stratégie, analyse de risque, résultats
│   ├── TC-inscription.md  20 cas de test manuels
│   ├── bugs/              BUG-001.md à BUG-008.md
│   └── evidence/          captures et réponses HTTP brutes
└── .github/workflows/playwright.yml
```

Choix de conception :

- les sélecteurs vivent dans les Page Objects (via `data-testid`), jamais dans les tests ;
- chaque test crée ses propres comptes (`uniqueEmail()`) : pas de dépendance entre tests, exécution parallèle ;
- les messages attendus sont centralisés dans `utils/messages.ts` d'après la spécification ;
- pas de relance automatique (`retries: 0`) : un test instable doit se voir.

## Résultats

Exécution du 25 octobre 2026, Chromium, Playwright 1.63.0, une passe sans relance.

| Type de test | Tests | `BUGS=off` : passés | `BUGS=on` : passés | `BUGS=on` : échecs attendus |
|---|---|---|---|---|
| E2E | 36 | 36 | 32 | 4 |
| API | 70 | 70 | 58 | 12 |
| Sécurité | 34 | 34 | 11 | 23 |
| **Total** | **140** | **140** | **101** | **39** |

Aucun échec inattendu dans les deux modes.

| Bug | Famille | Sévérité | Tests en échec attendu |
|---|---|---|---|
| [BUG-001](docs/bugs/BUG-001.md) | Interface | Faible | 1 |
| [BUG-002](docs/bugs/BUG-002.md) | Validation serveur | Moyenne | 2 |
| [BUG-003](docs/bugs/BUG-003.md) | Validation | Moyenne | 5 |
| [BUG-004](docs/bugs/BUG-004.md) | Contrôle d'accès (IDOR) | Haute | 3 |
| [BUG-005](docs/bugs/BUG-005.md) | Authentification | Haute | 2 |
| [BUG-006](docs/bugs/BUG-006.md) | Injection (XSS) | Haute | 3 |
| [BUG-007](docs/bugs/BUG-007.md) | Robustesse | Moyenne | 8 |
| [BUG-008](docs/bugs/BUG-008.md) | Configuration | Moyenne | 15 |

## CI

Le workflow `.github/workflows/playwright.yml` :

1. récupère l'image de l'application publiée par `minishop-app` sur `ghcr.io` ;
2. lance, pour chaque valeur de la matrice `BUGS` (`off` et `on`), un conteneur et attend que `/api/health` réponde ;
3. exécute la suite Playwright ;
4. publie le rapport HTML en artefact (`playwright-report-bugs-off` et `-on`).

Un job `zap` lance en parallèle un scan passif **OWASP ZAP baseline** contre l'application, dans les deux modes :

- `BUGS=off` : le job échoue si ZAP déclenche une alerte de niveau FAIL ;
- `BUGS=on` : informatif, les failles sont voulues ; le rapport montre ce qu'un scan automatique détecte ;
- le rapport HTML est publié en artefact (`zap-report-bugs-off` et `-on`), un résumé s'affiche dans l'onglet du job, et les rapports sont accessibles depuis le site GitHub Pages.

Un job `k6` lance les tests de performance `k6/minishop.js` dans les deux modes. Quatre scénarios s'enchaînent (≈ 2 minutes) :

| Scénario | Charge | Ce qu'il mesure |
| --- | --- | --- |
| `smoke` | 1 utilisateur, 1 parcours | l'application répond, de l'accueil au panier |
| `catalog_load` | jusqu'à 15 utilisateurs | liste des produits et recherche |
| `auth_load` | 1,5 inscription + 1,5 connexion par seconde | route la plus coûteuse (hachage scrypt synchrone) |
| `basket_flow` | 3 utilisateurs | ajout, lecture et retrait d'un article |

Seuils par scénario : 95 % des requêtes sous 500 ms et moins de 1 % d'erreurs (`smoke` : aucune erreur). En `BUGS=off`, un seuil dépassé fait échouer le job ; en `BUGS=on`, le résultat est informatif. Le rapport k6 est publié en artefact (`k6-report-bugs-off` et `-on`) et sur le site GitHub Pages.

En local, avec [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installé et l'application démarrée : `mkdir -p k6-out && k6 run k6/minishop.js`.

Le déclenchement entre dépôts se fait par `repository_dispatch` (type `app-image-published`) ou à la main (`workflow_dispatch`).

## Rapports en ligne

Les rapports Allure des deux modes sont publiés sur GitHub Pages à chaque push sur `main` : <https://fatima-ezzahra-kasraoui.github.io/minishop-tests/>.

En local : `npm test`, puis `npm run allure:generate` et `npm run allure:open`.

## Limites assumées

- Les tests de sécurité couvrent le premier niveau (validation, contrôle d'accès, authentification, XSS). Le scan ZAP baseline de la CI est passif (il n'attaque pas l'application) et ne remplace ni un test d'intrusion ni un audit.
- Chromium uniquement ; pas de tests d'accessibilité.
- Les tests de performance sont une charge légère sur un runner partagé de la CI : ils détectent une régression nette, pas une capacité maximale. Les seuils tiennent compte du hachage scrypt synchrone de l'application.
- Les résultats ci-dessus viennent d'**une** exécution locale par mode ; la stabilité sur de nombreuses exécutions n'est pas mesurée.
- Les cas manuels de `docs/TC-inscription.md` sont des fiches ; leur exécution manuelle n'est pas consignée.


## Tests et résultats

Les tests automatisés vivent dans le dépôt [minishop-tests](https://github.com/fatima-ezzahra-kasraoui/minishop-tests) (Playwright, TypeScript, CI GitHub Actions).

Exécution du 25 octobre 2026, Chromium, une passe sans relance : 140 tests, **0 échec inattendu** dans les deux modes.

| Type de test | Nombre | `BUGS=off` : passés | `BUGS=on` : passés | `BUGS=on` : échecs attendus (bugs connus) |
|---|---|---|---|---|
| E2E | 36 | 36 | 32 | 4 |
| API | 70 | 70 | 58 | 12 |
| Sécurité | 34 | 34 | 11 | 23 |
| **Total** | **140** | **140** | **101** | **39** |

Un « échec attendu » est un test qui vise un défaut volontaire encore actif : Playwright le rapporte comme réussi. Les 8 défauts (BUG-001 à BUG-008) sont tous détectés ; chacun a un rapport dans `minishop-tests/docs/bugs/`.
