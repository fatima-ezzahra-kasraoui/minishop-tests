/**
 * Messages attendus, recopiés de docs/spec.md de minishop-app (section 4).
 * Volontairement dupliqués : la spécification est l'oracle, pas le code de l'application.
 */
export const MESSAGES = {
  EMAIL_INVALID: 'Adresse e-mail invalide.',
  EMAIL_TAKEN: 'Cette adresse e-mail est déjà utilisée.',
  PASSWORD_LENGTH: 'Le mot de passe doit contenir entre 8 et 40 caractères.',
  ACCOUNT_CREATED: 'Compte créé. Vous pouvez maintenant vous connecter.',
  INVALID_CREDENTIALS: 'Identifiants incorrects.',
  AUTH_REQUIRED: 'Authentification requise.',
  INVALID_TOKEN: 'Jeton invalide ou expiré.',
  FORBIDDEN: 'Accès refusé.',
  PRODUCT_NOT_FOUND: 'Produit introuvable.',
  INVALID_QUANTITY: 'Quantité invalide (entier de 1 à 99).',
  ITEM_NOT_IN_BASKET: "Ce produit n'est pas dans le panier.",
  INVALID_JSON: 'Corps de requête JSON invalide.',
  BASKET_EMPTY: 'Votre panier est vide.',
  NO_RESULTS: 'Aucun produit trouvé.',
  LOGIN_REQUIRED: 'Veuillez vous connecter pour voir votre panier.',
} as const;
