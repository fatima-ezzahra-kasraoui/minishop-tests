import type { FullConfig } from '@playwright/test';
import { expectedBugs } from './bugs';

const WAIT_MS = 30_000;
const POLL_MS = 500;

/**
 * Avant toute exécution :
 *  1. attend que l'application réponde ;
 *  2. vérifie que ses défauts actifs correspondent à la variable BUGS des tests.
 *
 * Sans cette garde, lancer la suite en BUGS=off contre une application en BUGS=on
 * produirait des dizaines d'échecs trompeurs.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL;
  if (!baseURL) throw new Error('baseURL manquante dans playwright.config.ts');

  const healthUrl = new URL('/api/health', baseURL).toString();
  const deadline = Date.now() + WAIT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const health = (await response.json()) as { bugs: { mode: string; active: string[] } };
        assertSameMode(health.bugs.active, baseURL);
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (error instanceof ModeMismatchError) throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  throw new Error(
    `L'application ne répond pas sur ${healthUrl} après ${WAIT_MS / 1000} s ` +
      `(dernière erreur : ${String(lastError)}). Est-elle démarrée ?`,
  );
}

class ModeMismatchError extends Error {}

function assertSameMode(activeOnServer: string[], baseURL: string): void {
  const expected = [...expectedBugs].sort();
  const actual = [...activeOnServer].sort();
  if (expected.join(',') !== actual.join(',')) {
    throw new ModeMismatchError(
      `Mode incohérent : les tests attendent BUGS="${process.env.BUGS ?? 'off'}" ` +
        `(${expected.join(', ') || 'aucun défaut'}) mais l'application sur ${baseURL} ` +
        `a actif : ${actual.join(', ') || 'aucun défaut'}. ` +
        `Relancez l'application avec le même BUGS.`,
    );
  }
}
