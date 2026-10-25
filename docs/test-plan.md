# Plan de test : MiniShop

Version 1.0. Application testée : `minishop-app` (voir sa spécification `docs/spec.md`, qui sert d'oracle).

## 1. Objectif et périmètre

Vérifier que MiniShop respecte sa spécification et détecter les défauts de sécurité de premier niveau (validation côté serveur, authentification, contrôle d'accès, XSS, en-têtes HTTP).

**Dans le périmètre :** inscription, connexion, catalogue et recherche, panier, ainsi que les exigences SEC-01 à SEC-05.

**Hors périmètre :** performance et charge, accessibilité, compatibilité multi-navigateurs (Chromium seulement), paiement (inexistant), scan automatisé de vulnérabilités (ZAP, Burp), audit de dépendances, test de la configuration Docker en production.

## 2. Stratégie

| Niveau | Outil | Ce qu'on vérifie | Dossier |
|---|---|---|---|
| E2E | Playwright + Page Objects | Parcours utilisateur et messages affichés | `tests/e2e/` |
| API | Playwright `request` | Contrat, codes HTTP, validation serveur | `tests/api/` |
| Sécurité | Playwright `request` et navigateur | Accès, jetons, XSS, en-têtes | `tests/security/` |
| Manuel | Cas écrits | Exploration, preuves visuelles | `docs/TC-inscription.md` |

Le test de la validation est fait **aux deux niveaux** : l'interface seule ne prouve rien, puisqu'un client peut appeler l'API directement (AC-01.6).

### Techniques de conception

- **Partitions d'équivalence** : e-mails valides / invalides par famille (sans `@`, espace, domaine sans point).
- **Valeurs limites** : mot de passe de 1, 4, 7, 8, 40 et 41 caractères ; quantité 0, 1, 99, 100.
- **Tests négatifs** : JSON mal formé, corps vide, jeton falsifié, identifiant de panier invalide.
- **Cas de sécurité** : accès sans jeton, accès au panier d'autrui, énumération d'identifiants, charge utile HTML dans la recherche, caractères spéciaux.

## 3. Analyse de risque

| Zone | Probabilité | Impact | Risque | Traitement |
|---|---|---|---|---|
| Panier (accès d'autrui, sans jeton) | Moyenne | Élevé (fuite de données) | **Élevé** | Tests de sécurité dédiés, tous les codes 401/403 |
| Recherche (XSS, entrée spéciale) | Moyenne | Élevé | **Élevé** | Tests XSS dans le navigateur, entrées spéciales par API |
| Validation à l'inscription | Élevée | Moyen | **Moyen-élevé** | Valeurs limites, API et E2E |
| Authentification et jetons | Faible | Élevé | Moyen | Mauvais mot de passe, e-mail inconnu, jeton falsifié |
| En-têtes HTTP | Élevée | Moyen | Moyen | Un test par en-tête et par route |
| Affichage (compteur, messages) | Moyenne | Faible | Faible | Quelques tests E2E |

## 4. Environnements et données

- Application lancée en conteneur (ou `npm start`) sur `http://localhost:3000`, base **SQLite en mémoire** : état vierge à chaque démarrage.
- Deux modes, choisis par la variable `BUGS` : `off` (conforme) et `on` (8 défauts activés).
- Chaque test crée ses propres comptes avec des adresses uniques (`utils/data.ts`) : aucun test ne dépend d'un autre, l'exécution est parallèle.
- Le `globalSetup` attend l'application et **refuse de tourner** si le mode de l'application ne correspond pas à `BUGS` côté tests.

## 5. Gestion des défauts connus

Un test qui cible un défaut connu appelle `expectBug('BUG-00X')` en première instruction :

- `BUGS=off` : sans effet, le test doit passer ;
- défaut actif : le test doit échouer (échec attendu, rapporté comme réussi) ;
- si le test se met à **passer** alors que le défaut est actif, Playwright signale une erreur : le bug est corrigé, il faut retirer l'appel.

Chaque défaut a un rapport dans `docs/bugs/` et une preuve dans `docs/evidence/`.

## 6. Critères d'entrée et de sortie

**Entrée :** application démarrée, `/api/health` répond, mode vérifié.

**Sortie :**

- `BUGS=off` : 100 % des tests passent ;
- `BUGS=on` : les 8 défauts sont détectés par au moins un test, aucun échec inattendu ;
- chaque défaut a un rapport complet.

## 7. Traçabilité

| User story | Critères | Niveaux de test |
|---|---|---|
| US-01 Inscription | AC-01.1 à 01.6 | E2E, API, manuel |
| US-02 Connexion | AC-02.1 à 02.3 | E2E, API |
| US-03 Produits | AC-03.1 | E2E, API |
| US-04 Recherche | AC-04.1 à 04.3 | E2E, API, sécurité (XSS) |
| US-05 Ajout et retrait | AC-05.1 à 05.4 | E2E, API |
| US-06 Confidentialité du panier | AC-06.0 à 06.4 | E2E, API, sécurité |
| Exigences de sécurité | SEC-01 à SEC-05 | Sécurité, API |

## 8. Résultats d'exécution

Exécution réalisée le 25 octobre 2026, Chromium, Playwright 1.63.0, Node.js 22, une seule passe sans relance (`retries: 0`).

| Mode | Tests | Réussis | Échecs attendus (bugs connus) | Échecs inattendus |
|---|---|---|---|---|
| `BUGS=off` | 140 | 140 | 0 | 0 |
| `BUGS=on` | 140 | 101 | 39 | 0 |

Détail par type de test (en mode `on`, « réussis » = tests qui passent vraiment ; les 39 échecs attendus sont rapportés comme réussis par Playwright, d'où « 140 passed » dans la sortie) :

| Type | Tests | `off` : réussis | `on` : réussis | `on` : échecs attendus |
|---|---|---|---|---|
| E2E | 36 | 36 | 32 | 4 |
| API | 70 | 70 | 58 | 12 |
| Sécurité | 34 | 34 | 11 | 23 |

Les 8 défauts ont été détectés (nombre de tests en échec attendu par défaut : BUG-001 : 1, BUG-002 : 2, BUG-003 : 5, BUG-004 : 3, BUG-005 : 2, BUG-006 : 3, BUG-007 : 8, BUG-008 : 15).

## 9. Limites

- Une seule exécution locale par mode ; la stabilité sur de nombreuses exécutions n'est pas mesurée.
- Les tests de sécurité ne remplacent ni un scan automatisé ni un audit.
- Le workflow CI (`.github/workflows/playwright.yml`) n'a pas pu être exécuté dans cet environnement : il n'est pas validé tant qu'il n'a pas tourné sur GitHub.
- Les tests manuels de `TC-inscription.md` sont des cas écrits ; seul `TC-REG-05` est accompagné d'une capture.
