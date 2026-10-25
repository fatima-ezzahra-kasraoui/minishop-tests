import { test } from '@playwright/test';

export const KNOWN_BUGS = [
  'BUG-001',
  'BUG-002',
  'BUG-003',
  'BUG-004',
  'BUG-005',
  'BUG-006',
  'BUG-007',
  'BUG-008',
] as const;

export type BugId = (typeof KNOWN_BUGS)[number];

/**
 * Interprète la variable BUGS comme l'application :
 * « off » (défaut), « on », ou une liste « BUG-002,BUG-004 ».
 */
export function parseBugs(raw: string | undefined): Set<BugId> {
  const value = (raw ?? 'off').trim().toLowerCase();
  if (value === '' || value === 'off') return new Set();
  if (value === 'on') return new Set(KNOWN_BUGS);

  const ids = value
    .split(',')
    .map((id) => id.trim().toUpperCase())
    .filter(Boolean);
  const unknown = ids.filter((id) => !(KNOWN_BUGS as readonly string[]).includes(id));
  if (unknown.length > 0) {
    throw new Error(`Valeur BUGS invalide : ${unknown.join(', ')}`);
  }
  return new Set(ids as BugId[]);
}

/** Défauts que l'application est censée avoir activés pour cette exécution. */
export const expectedBugs = parseBugs(process.env.BUGS);

export function isBugActive(id: BugId): boolean {
  return expectedBugs.has(id);
}

/**
 * Marque le test en cours comme « échec attendu » tant que le défaut est actif.
 *
 * - BUGS=off : sans effet, le test doit passer normalement.
 * - Défaut actif : le test doit échouer ; Playwright le rapporte alors comme réussi.
 *   Si le test se met à passer, Playwright le signale en échec : le bug a été corrigé
 *   et il faut retirer l'appel à expectBug().
 *
 * À appeler en première instruction du test.
 */
export function expectBug(id: BugId): void {
  test.fail(isBugActive(id), `${id} : défaut connu, échec attendu tant qu'il est actif`);
}
