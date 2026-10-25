# Cas de test manuels : inscription (US-01)

Environnement : application en `BUGS=off` sur <http://localhost:3000>, écran « Inscription ». Mot de passe valide de référence : `Motdepasse-123`. Utiliser un e-mail jamais employé, sauf pour TC-REG-12 et TC-REG-13.

La colonne « Automatisé » indique le test Playwright qui couvre le même cas (voir `tests/`). Quand l'application tourne en `BUGS=on`, les cas marqués d'un BUG-00X doivent échouer : c'est ce qui prouve que le défaut est détecté.

| ID | Objectif | Données | Étapes | Résultat attendu | Critère | Défaut associé | Automatisé |
|---|---|---|---|---|---|---|---|
| TC-REG-01 | Inscription nominale | `ali@exemple.com` / `Motdepasse-123` | Saisir, valider | « Compte créé. Vous pouvez maintenant vous connecter. » | AC-01.1 | | e2e/register |
| TC-REG-02 | Mot de passe minimal accepté | mot de passe de 8 caractères | Saisir, valider | Compte créé | AC-01.1, AC-01.3 | | e2e/register (limite 8) |
| TC-REG-03 | Mot de passe maximal accepté | mot de passe de 40 caractères | Saisir, valider | Compte créé | AC-01.1, AC-01.3 | | e2e/register (limite 40) |
| TC-REG-04 | Mot de passe de 7 caractères refusé | 7 caractères | Saisir, valider | « Le mot de passe doit contenir entre 8 et 40 caractères. », aucun compte | AC-01.3 | BUG-002 (API) | e2e/register ; api/register |
| TC-REG-05 | Mot de passe de 4 caractères refusé | `abcd` | Saisir, valider | Même message, aucun compte | AC-01.3 | | e2e/register (preuve : `evidence/TC-REG-05-pwd-4chars.png`) |
| TC-REG-06 | Mot de passe de 41 caractères refusé | 41 caractères | Saisir, valider | Même message, aucun compte | AC-01.3 | | e2e/register (limite 41) |
| TC-REG-07 | Mot de passe vide refusé | champ vide | Valider | Même message | AC-01.3 | | api/register (longueur 0) |
| TC-REG-08 | Compteur à vide | rien | Ouvrir l'écran | Compteur `0/40` | AC-01.5 | BUG-001 | e2e/register |
| TC-REG-09 | Compteur pendant la saisie | `abcde` | Taper caractère par caractère | `1/40`, puis `2/40`, ... `5/40` | AC-01.5 | BUG-001 | e2e/register |
| TC-REG-10 | E-mail sans `@` refusé | `sans-arobase.exemple.com` | Saisir, valider | « Adresse e-mail invalide. » | AC-01.2 | | e2e/register |
| TC-REG-11 | E-mail avec espace refusé | `a b@exemple.com` | Saisir, valider | « Adresse e-mail invalide. » | AC-01.2 | | e2e/register |
| TC-REG-12 | E-mail déjà inscrit | e-mail de TC-REG-01 | Saisir, valider | « Cette adresse e-mail est déjà utilisée. » | AC-01.4 | | e2e/register ; api/register (409) |
| TC-REG-13 | Unicité insensible à la casse | `ALI@EXEMPLE.COM` | Saisir, valider | « Cette adresse e-mail est déjà utilisée. » | AC-01.4 | | api/register |
| TC-REG-14 | Domaine sans point | `a@g` | Saisir, valider | « Adresse e-mail invalide. », aucun compte | AC-01.2 | BUG-003 | e2e/register ; api/register |
| TC-REG-15 | Domaine terminé par un point | `a@g.` | Saisir, valider | « Adresse e-mail invalide. » | AC-01.2 | BUG-003 | e2e/register ; api/register |
| TC-REG-16 | Domaine commençant par un point | `a@.com` | Saisir, valider | « Adresse e-mail invalide. » | AC-01.2 | BUG-003 | api/register |
| TC-REG-17 | E-mail minimal valide | `a@g.co` | Saisir, valider | Compte créé | AC-01.1 | | api/register |
| TC-REG-18 | Espaces autour de l'e-mail et casse | `  Ali2@Exemple.COM  ` | Valider via l'API | Compte créé, e-mail renvoyé en minuscules sans espaces | Règles de validation | | api/register |
| TC-REG-19 | Formulaire vidé après succès | données valides | Valider | Champs e-mail et mot de passe vides, compteur `0/40` | AC-01.1 | BUG-001 (compteur) | e2e/register |
| TC-REG-20 | Contournement de l'interface | `{"email":"x@exemple.com","password":"abc"}` | `curl -X POST /api/register` | `400 PASSWORD_LENGTH`, aucun compte | AC-01.6 | BUG-002 | api/register |

## Notes d'exécution

- Ces cas sont des fiches à exécuter à la main. Leur équivalent automatisé tourne à chaque exécution de la suite ; l'exécution manuelle de chaque fiche n'est pas consignée ici.
- Quand un cas échoue en mode `BUGS=on`, on ouvre ou on met à jour le rapport correspondant dans `docs/bugs/`.
