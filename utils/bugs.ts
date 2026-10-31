import { test } from '@playwright/test';
import { epic, feature, severity, tag } from 'allure-js-commons';

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
  const active = isBugActive(id);
  test.fail(active, `${id} : défaut connu, échec attendu tant qu'il est actif`);
  labelForAllure(id, active);
}

/** Libellé et sévérité Allure de chaque défaut (cf. tableau du README). */
const BUG_INFO: Record<BugId, { title: string; severity: 'minor' | 'normal' | 'critical' }> = {
  'BUG-001': { title: 'compteur du mot de passe affiche /20 au lieu de /40', severity: 'minor' },
  'BUG-002': { title: 'mot de passe trop court accepté par le serveur', severity: 'normal' },
  'BUG-003': { title: 'e-mail sans point dans le domaine accepté', severity: 'normal' },
  'BUG-004': { title: 'panier d\'un autre utilisateur lisible (IDOR)', severity: 'critical' },
  'BUG-005': { title: 'panier lisible sans jeton', severity: 'critical' },
  'BUG-006': { title: 'XSS réfléchi dans la recherche', severity: 'critical' },
  'BUG-007': { title: 'caractère spécial dans la recherche : 500 avec trace de pile', severity: 'normal' },
  'BUG-008': { title: 'en-têtes de sécurité absents', severity: 'normal' },
};

/**
 * Regroupe les tests de défauts dans le rapport Allure (onglet Behaviors) :
 * epic « Défauts connus », une feature par défaut, sévérité et état du défaut.
 *
 * L'API d'Allure est asynchrone, alors que expectBug() reste synchrone pour rester la
 * première instruction des tests : les appels partent sans être attendus, le temps du
 * test suffit à les enregistrer. (Les annotations Playwright ne conviennent pas : le
 * reporter ne les lit qu'au début du test, avant l'appel à expectBug.)
 */
function labelForAllure(id: BugId, active: boolean): void {
  const info = BUG_INFO[id];
  void Promise.all([
    epic('Défauts connus'),
    feature(`${id} · ${info.title}`),
    severity(info.severity),
    tag(active ? 'défaut actif' : 'défaut inactif'),
  ]).catch(() => undefined);
}
