import { expect, test } from '../fixtures';
import { MESSAGES } from '../../utils/messages';

const euros = (cents: number): string => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

test.describe('E2E : panier', () => {
  test('un utilisateur connecté ajoute un produit à son panier (AC-05.1)', async ({
    loginPage,
    productsPage,
    basketPage,
    api,
  }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);

    await productsPage.addToBasket(product.id);
    await basketPage.open();

    await expect(basketPage.rows).toHaveCount(1);
    await expect(basketPage.names).toHaveText([product.name]);
    await expect(basketPage.quantities).toHaveText(['1']);
    await expect(basketPage.total).toHaveText(`Total : ${euros(product.priceCents)}`);
  });

  test('un second ajout du même produit augmente la quantité (AC-05.1)', async ({
    loginPage,
    productsPage,
    basketPage,
    api,
  }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);

    await productsPage.addToBasket(product.id);
    await productsPage.addToBasket(product.id);
    await basketPage.open();

    await expect(basketPage.rows).toHaveCount(1);
    await expect(basketPage.quantities).toHaveText(['2']);
    await expect(basketPage.total).toHaveText(`Total : ${euros(product.priceCents * 2)}`);
  });

  test('le total additionne plusieurs produits (AC-06.1)', async ({
    loginPage,
    productsPage,
    basketPage,
    api,
  }) => {
    const user = await api.createUser();
    const [first, second] = await api.catalogue();
    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);

    await productsPage.addToBasket(first.id);
    await productsPage.addToBasket(second.id);
    await basketPage.open();

    await expect(basketPage.rows).toHaveCount(2);
    await expect(basketPage.total).toHaveText(`Total : ${euros(first.priceCents + second.priceCents)}`);
  });

  test('retirer un produit supprime sa ligne, puis le panier vide est signalé (AC-05.2)', async ({
    loginPage,
    productsPage,
    basketPage,
    api,
  }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);
    await productsPage.addToBasket(product.id);
    await basketPage.open();
    await expect(basketPage.rows).toHaveCount(1);

    await basketPage.remove(product.id);

    await expect(basketPage.rows).toHaveCount(0);
    await expect(basketPage.message).toHaveText(MESSAGES.BASKET_EMPTY);
  });

  test('ajouter un produit sans être connecté affiche un message (AC-05.3)', async ({
    productsPage,
    api,
  }) => {
    const [product] = await api.catalogue();
    await productsPage.goto();

    await productsPage.addToBasket(product.id);

    await expect(productsPage.message).toHaveText(MESSAGES.AUTH_REQUIRED);
  });

  test('le panier est conservé entre deux connexions', async ({ loginPage, productsPage, basketPage, api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);
    await productsPage.addToBasket(product.id);
    await loginPage.logout();

    await loginPage.goto();
    await loginPage.loginAs(user.email, user.password);
    await basketPage.open();

    await expect(basketPage.names).toHaveText([product.name]);
  });

  test('un utilisateur non connecté est invité à se connecter pour voir le panier', async ({
    productsPage,
    basketPage,
  }) => {
    await productsPage.goto();

    await basketPage.open();

    await expect(basketPage.message).toHaveText(MESSAGES.LOGIN_REQUIRED);
  });
});
