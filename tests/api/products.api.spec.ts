import { expect, test } from '../fixtures';
import { expectBug } from '../../utils/bugs';

test.describe('API : produits et recherche', () => {
  test('liste les 12 produits du catalogue', async ({ api }) => {
    const response = await api.products();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(12);
    expect(body.products).toHaveLength(12);
    expect(body.products[0]).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
      description: expect.any(String),
      priceCents: expect.any(Number),
    });
  });

  test('filtre par nom sans tenir compte de la casse', async ({ api }) => {
    for (const query of ['clavier', 'CLAVIER', 'ClAvIeR']) {
      const body = await (await api.products(query)).json();

      expect(body.count, `q=${query}`).toBe(1);
      expect(body.products[0].name).toBe('Clavier mécanique');
    }
  });

  test('renvoie plusieurs résultats quand le texte est commun', async ({ api }) => {
    const body = await (await api.products('sou')).json();

    const names = body.products.map((p: { name: string }) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Souris sans fil', 'Tapis de souris']));
  });

  test('renvoie une liste vide, sans erreur, quand rien ne correspond', async ({ api }) => {
    const response = await api.products('introuvable-xyz');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ count: 0, products: [] });
  });

  test('traite % comme un caractère ordinaire, pas comme un joker', async ({ api }) => {
    const body = await (await api.products('%')).json();

    expect(body.count).toBe(0);
  });

  test('ignore les espaces autour du texte recherché', async ({ api }) => {
    const body = await (await api.products('  clavier  ')).json();

    expect(body.count).toBe(1);
  });

  // Entrées « spéciales » : la spec (AC-04.3) exige qu'elles soient traitées comme du texte.
  // Celles-ci sont des expressions régulières invalides : elles révèlent BUG-007.
  const crashingInputs = ['(', '[', '*', '+', '?', '\\'];
  // Celles-ci sont inoffensives dans les deux modes : elles verrouillent le comportement correct.
  const harmlessInputs = ["'", '"; DROP TABLE users; --', '<b>', '{}'];

  for (const input of crashingInputs) {
    test(`BUG-007 · la recherche « ${input} » ne provoque pas d'erreur 500`, async ({ api }) => {
      expectBug('BUG-007');

      const response = await api.products(input);

      expect(response.status()).toBe(200);
      expect((await response.json()).count).toBe(0);
    });
  }

  for (const input of harmlessInputs) {
    test(`la recherche « ${input} » est traitée comme du texte ordinaire`, async ({ api }) => {
      const response = await api.products(input);

      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({ query: input, count: 0 });
    });
  }

  test('BUG-007 · une erreur interne ne divulgue jamais de trace de pile', async ({ api }) => {
    expectBug('BUG-007');

    const response = await api.products('(');
    const text = await response.text();

    expect(text).not.toMatch(/stack|node_modules|\bat .+\(.+:\d+:\d+\)|SyntaxError/);
  });
});
