import { expect, test } from '../fixtures';
import { expectBug } from '../../utils/bugs';

// Chaque en-tête est un test distinct : le rapport indique précisément lequel manque.
const REQUIRED_HEADERS: Array<{ name: string; expected: RegExp }> = [
  { name: 'content-security-policy', expected: /default-src 'self'/ },
  { name: 'x-content-type-options', expected: /^nosniff$/i },
  { name: 'x-frame-options', expected: /^(deny|sameorigin)$/i },
  { name: 'referrer-policy', expected: /.+/ },
];

const ROUTES = ['/', '/api/health', '/api/products'];

test.describe('Sécurité : en-têtes HTTP (SEC-03)', () => {
  for (const route of ROUTES) {
    for (const { name, expected } of REQUIRED_HEADERS) {
      test(`BUG-008 · ${route} envoie l'en-tête ${name}`, async ({ request }) => {
        expectBug('BUG-008');

        const response = await request.get(route);

        expect(response.headers()[name]).toMatch(expected);
      });
    }

    test(`BUG-008 · ${route} ne révèle pas la technologie du serveur (X-Powered-By)`, async ({ request }) => {
      expectBug('BUG-008');

      const response = await request.get(route);

      expect(response.headers()['x-powered-by']).toBeUndefined();
    });
  }
});
