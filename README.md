# minishop-tests

Framework de test automatisé (Playwright, TypeScript) pour [`minishop-app`](../minishop-app) : E2E, API et sécurité de premier niveau, avec Page Object Model, une CI à deux modes et une documentation de test complète.

![CI](https://github.com/fatima-ezzahra-kasraoui/minishop-tests/actions/workflows/playwright.yml/badge.svg)

> Remplacer `fatima-ezzahra-kasraoui` par votre identifiant GitHub dans le badge et dans `.github/workflows/playwright.yml` (ou définir la variable de dépôt `APP_IMAGE`).

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

Le déclenchement entre dépôts se fait par `repository_dispatch` (type `app-image-published`) ou à la main (`workflow_dispatch`).

## Limites assumées

- Les tests de sécurité couvrent le premier niveau (validation, contrôle d'accès, authentification, XSS). Ils ne remplacent ni un scan (ZAP, Burp) ni un audit.
- Chromium uniquement ; pas de tests de performance ni d'accessibilité.
- Les résultats ci-dessus viennent d'**une** exécution locale par mode ; la stabilité sur de nombreuses exécutions n'est pas mesurée.
- Les cas manuels de `docs/TC-inscription.md` sont des fiches ; leur exécution manuelle n'est pas consignée.
- Rapports Allure : non mis en place (optionnel).
