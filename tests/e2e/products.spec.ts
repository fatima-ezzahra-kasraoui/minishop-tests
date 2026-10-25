import { expect, test } from '../fixtures';
import { expectBug } from '../../utils/bugs';
import { MESSAGES } from '../../utils/messages';

test.describe('E2E : produits et recherche', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.goto();
  });

  test('le catalogue complet s\'affiche au chargement (AC-03.1)', async ({ productsPage }) => {
    await expect(productsPage.heading).toHaveText('Tous les produits');
    await expect(productsPage.items).toHaveCount(12);
    await expect(productsPage.resultCount).toHaveText('12 produits');
  });

  test('la recherche filtre les produits sans tenir compte de la casse (AC-04.1)', async ({ productsPage }) => {
    await productsPage.search('CLAVIER');

    await expect(productsPage.heading).toHaveText('Résultats pour : CLAVIER');
    await expect(productsPage.items).toHaveCount(1);
    await expect(productsPage.itemNames).toHaveText(['Clavier mécanique']);
    await expect(productsPage.resultCount).toHaveText('1 produit');
  });

  test('une recherche sans résultat affiche un message (AC-04.2)', async ({ productsPage }) => {
    await productsPage.search('introuvable-xyz');

    await expect(productsPage.items).toHaveCount(0);
    await expect(productsPage.resultCount).toHaveText(MESSAGES.NO_RESULTS);
  });

  test('une recherche vide rétablit le catalogue complet', async ({ productsPage }) => {
    await productsPage.search('clavier');
    await expect(productsPage.items).toHaveCount(1);

    await productsPage.search('');

    await expect(productsPage.heading).toHaveText('Tous les produits');
    await expect(productsPage.items).toHaveCount(12);
  });

  test('BUG-007 · un caractère spécial dans la recherche ne casse pas la page (AC-04.3)', async ({
    productsPage,
  }) => {
    expectBug('BUG-007');

    await productsPage.search('(');

    await expect(productsPage.message).toBeHidden();
    await expect(productsPage.resultCount).toHaveText(MESSAGES.NO_RESULTS);
  });
});
