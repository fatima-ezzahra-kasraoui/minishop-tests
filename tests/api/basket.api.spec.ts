import { expect, test } from '../fixtures';
import { MESSAGES } from '../../utils/messages';

test.describe('API : panier', () => {
  test('un panier neuf est vide', async ({ api }) => {
    const user = await api.createUser();

    const response = await api.basket(user.id, user.token);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ userId: user.id, items: [], totalCents: 0 });
  });

  test('ajoute un produit avec la quantité 1 par défaut', async ({ api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();

    const response = await api.addToBasket(user.token, product.id);

    expect(response.status()).toBe(200);
    const basket = await response.json();
    expect(basket.items).toEqual([
      {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: 1,
        lineTotalCents: product.priceCents,
      },
    ]);
    expect(basket.totalCents).toBe(product.priceCents);
  });

  test('cumule les quantités quand on ajoute plusieurs fois le même produit', async ({ api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();

    await api.addToBasket(user.token, product.id, 2);
    const response = await api.addToBasket(user.token, product.id, 3);

    const basket = await response.json();
    expect(basket.items).toHaveLength(1);
    expect(basket.items[0].quantity).toBe(5);
    expect(basket.totalCents).toBe(product.priceCents * 5);
  });

  test('calcule le total sur plusieurs produits', async ({ api }) => {
    const user = await api.createUser();
    const [first, second] = await api.catalogue();

    await api.addToBasket(user.token, first.id, 2);
    await api.addToBasket(user.token, second.id, 1);
    const basket = await (await api.basket(user.id, user.token)).json();

    expect(basket.items).toHaveLength(2);
    expect(basket.totalCents).toBe(first.priceCents * 2 + second.priceCents);
  });

  test('chaque utilisateur a son propre panier', async ({ api }) => {
    const alice = await api.createUser('alice');
    const bob = await api.createUser('bob');
    const [product] = await api.catalogue();

    await api.addToBasket(alice.token, product.id);
    const bobBasket = await (await api.basket(bob.id, bob.token)).json();

    expect(bobBasket.items).toEqual([]);
  });

  // Quantités : valeurs limites de la spec (entier de 1 à 99).
  const validQuantities = [1, 99];
  const invalidQuantities: Array<[string, unknown]> = [
    ['0', 0],
    ['-1', -1],
    ['100', 100],
    ['1,5', 1.5],
    ['une chaîne', '2'],
    ['null', null],
  ];

  for (const quantity of validQuantities) {
    test(`accepte la quantité ${quantity}`, async ({ api }) => {
      const user = await api.createUser();
      const [product] = await api.catalogue();

      const response = await api.addToBasket(user.token, product.id, quantity);

      expect(response.status()).toBe(200);
    });
  }

  for (const [label, quantity] of invalidQuantities) {
    test(`refuse la quantité invalide (${label})`, async ({ api }) => {
      const user = await api.createUser();
      const [product] = await api.catalogue();

      const response = await api.addToBasket(user.token, product.id, quantity);

      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({
        code: 'INVALID_QUANTITY',
        message: MESSAGES.INVALID_QUANTITY,
      });
    });
  }

  test('refuse un cumul de ligne supérieur à 99', async ({ api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await api.addToBasket(user.token, product.id, 99);

    const response = await api.addToBasket(user.token, product.id, 1);

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('INVALID_QUANTITY');
  });

  test('refuse un produit inexistant (404)', async ({ api }) => {
    const user = await api.createUser();

    for (const productId of [0, 999999, 'abc', null]) {
      const response = await api.addToBasket(user.token, productId);
      expect(response.status(), `productId=${String(productId)}`).toBe(404);
      expect((await response.json()).code).toBe('PRODUCT_NOT_FOUND');
    }
  });

  test('retire une ligne du panier (204)', async ({ api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();
    await api.addToBasket(user.token, product.id);

    const removal = await api.removeFromBasket(user.token, product.id);
    const basket = await (await api.basket(user.id, user.token)).json();

    expect(removal.status()).toBe(204);
    expect(basket.items).toEqual([]);
  });

  test('refuse de retirer un produit absent du panier (404)', async ({ api }) => {
    const user = await api.createUser();
    const [product] = await api.catalogue();

    const response = await api.removeFromBasket(user.token, product.id);

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      code: 'ITEM_NOT_IN_BASKET',
      message: MESSAGES.ITEM_NOT_IN_BASKET,
    });
  });

  test('refuse un identifiant utilisateur qui n\'est pas un entier (400)', async ({ api }) => {
    const user = await api.createUser();

    const response = await api.basket('abc', user.token);

    expect(response.status()).toBe(400);
  });
});
