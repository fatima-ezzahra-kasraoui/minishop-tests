import { expect, test } from '../fixtures';
import { expectBug } from '../../utils/bugs';

/**
 * Charges utiles « sondes » : elles n'exécutent aucun script. Si le texte saisi est interprété
 * comme du HTML, un élément portant l'id `xss-probe` apparaît dans la page, ce qui prouve
 * l'injection de façon déterministe (et indépendamment de la politique CSP, qui bloquerait
 * l'exécution d'un gestionnaire `onerror` sans empêcher l'injection du balisage).
 */
const PROBES = [
  { label: 'balise en gras', payload: '<b id="xss-probe">x</b>' },
  { label: 'image avec gestionnaire d\'évènement', payload: '<img id="xss-probe" src="x" onerror="void 0">' },
  { label: 'attribut injecté dans un lien', payload: '<a id="xss-probe" href="#">lien</a>' },
];

test.describe('Sécurité : XSS réfléchi dans la recherche (SEC-04)', () => {
  for (const { label, payload } of PROBES) {
    test(`BUG-006 · ${label} n'est pas interprété comme du HTML`, async ({ productsPage, page }) => {
      expectBug('BUG-006');

      await productsPage.goto();
      await productsPage.search(payload);

      // Le texte doit apparaître tel quel dans le titre...
      await expect(productsPage.heading).toHaveText(`Résultats pour : ${payload}`);
      // ...et aucun élément injecté ne doit exister dans la page.
      await expect(page.locator('#xss-probe')).toHaveCount(0);
    });
  }

  test('la recherche d\'un texte ordinaire affiche le titre attendu', async ({ productsPage }) => {
    await productsPage.goto();
    await productsPage.search('clavier');

    await expect(productsPage.heading).toHaveText('Résultats pour : clavier');
  });

  test('les noms de produits restent affichés comme du texte', async ({ productsPage }) => {
    await productsPage.goto();

    await expect(productsPage.itemNames.first()).toHaveText('Clavier mécanique');
  });
});
