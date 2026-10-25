import { randomUUID } from 'node:crypto';

/** E-mail unique à chaque appel : les tests ne partagent jamais de compte. */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@minishop-tests.example.com`;
}

/** Mot de passe valide (conforme à la spec : 8 à 40 caractères). */
export const VALID_PASSWORD = 'Motdepasse-123';

/** Mot de passe d'une longueur exacte, pour les valeurs limites. */
export function passwordOfLength(length: number): string {
  return 'Ab1!'.repeat(Math.ceil(length / 4)).slice(0, length);
}
