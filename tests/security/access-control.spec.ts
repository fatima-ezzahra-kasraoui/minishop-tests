import { expect, test } from '../fixtures';
import { expectBug } from '../../utils/bugs';
import { MESSAGES } from '../../utils/messages';

/** Fabrique un jeton JWT non signé (alg: none) pour tester le rejet côté serveur. */
function unsignedToken(userId: number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(userId) })}.`;
}

test.describe('Sécurité : authentification', () => {
  test('BUG-005 · la lecture d\'un panier sans jeton est refusée (401)', async ({ api }) => {
    expectBug('BUG-005');
    const owner = await api.createUser();

    const response = await api.basket(owner.id);

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ code: 'AUTH_REQUIRED', message: MESSAGES.AUTH_REQUIRED });
  });

  test('BUG-005 · un jeton invalide est refusé en lecture (401)', async ({ api }) => {
    expectBug('BUG-005');
    const owner = await api.createUser();

    const response = await api.basket(owner.id, 'jeton.completement.faux');

    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('INVALID_TOKEN');
  });

  test('l\'ajout au panier sans jeton est refusé (401)', async ({ api }) => {
    const [product] = await api.catalogue();

    const response = await api.addToBasket(undefined, product.id);

    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('AUTH_REQUIRED');
  });

  test('le retrait du panier sans jeton est refusé (401)', async ({ api }) => {
    const [product] = await api.catalogue();

    const response = await api.removeFromBasket(undefined, product.id);

    expect(response.status()).toBe(401);
  });

  test('un jeton signé avec un autre secret est refusé (401)', async ({ api }) => {
    const user = await api.createUser();
    const [header, payload] = user.token.split('.');
    const forged = `${header}.${payload}.signature-invalide`;

    const response = await api.addToBasket(forged, 1);

    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('INVALID_TOKEN');
  });

  test('un jeton non signé (alg: none) est refusé (401)', async ({ api }) => {
    const victim = await api.createUser();

    const response = await api.addToBasket(unsignedToken(victim.id), 1);

    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('INVALID_TOKEN');
  });

  test('un jeton dont le contenu a été modifié est refusé (401)', async ({ api }) => {
    const attacker = await api.createUser('attacker');
    const victim = await api.createUser('victim');
    const [header, , signature] = attacker.token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: String(victim.id), email: victim.email }),
    ).toString('base64url');

    const response = await api.addToBasket(`${header}.${tamperedPayload}.${signature}`, 1);

    expect(response.status()).toBe(401);
  });

  test('la connexion ne permet pas de deviner si un e-mail existe', async ({ api }) => {
    const known = await api.createUser();

    const wrongPassword = await api.login(known.email, 'Mauvais-mot-de-passe-1');
    const unknownEmail = await api.login('inconnu@minishop-tests.example.com', 'Mauvais-mot-de-passe-1');

    expect(wrongPassword.status()).toBe(unknownEmail.status());
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  test('aucune réponse d\'authentification ne contient d\'empreinte de mot de passe', async ({ api }) => {
    const user = await api.createUser();

    const login = await api.login(user.email, user.password);

    expect((await login.text()).toLowerCase()).not.toMatch(/hash|scrypt|password/);
  });
});

test.describe('Sécurité : contrôle d\'accès aux paniers', () => {
  test('BUG-004 · un utilisateur ne peut pas lire le panier d\'un autre (403)', async ({ api }) => {
    expectBug('BUG-004');
    const alice = await api.createUser('alice');
    const bob = await api.createUser('bob');
    const [product] = await api.catalogue();
    await api.addToBasket(alice.token, product.id);

    const response = await api.basket(alice.id, bob.token);

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ code: 'FORBIDDEN', message: MESSAGES.FORBIDDEN });
  });

  test('BUG-004 · le contenu du panier d\'autrui n\'est pas divulgué', async ({ api }) => {
    expectBug('BUG-004');
    const alice = await api.createUser('alice');
    const bob = await api.createUser('bob');
    const [product] = await api.catalogue();
    await api.addToBasket(alice.token, product.id, 3);

    const text = await (await api.basket(alice.id, bob.token)).text();

    expect(text).not.toContain(product.name);
  });

  test('BUG-004 · l\'énumération des identifiants voisins ne donne accès à aucun panier', async ({ api }) => {
    expectBug('BUG-004');
    const me = await api.createUser('me');

    const responses = await Promise.all(
      [me.id - 1, me.id + 1, me.id + 2].map((id) => api.basket(id, me.token)),
    );

    for (const response of responses) {
      expect(response.status()).toBe(403);
    }
  });

  test('un utilisateur lit bien son propre panier', async ({ api }) => {
    const alice = await api.createUser('alice');

    const response = await api.basket(alice.id, alice.token);

    expect(response.status()).toBe(200);
  });

  test('l\'ajout au panier agit toujours sur le panier du jeton, jamais sur celui d\'un autre', async ({ api }) => {
    const alice = await api.createUser('alice');
    const bob = await api.createUser('bob');
    const [product] = await api.catalogue();

    // Tentative d'injection d'un userId dans le corps : il doit être ignoré.
    const response = await api.addToBasket(bob.token, product.id);
    expect(response.status()).toBe(200);

    const aliceBasket = await (await api.basket(alice.id, alice.token)).json();
    expect(aliceBasket.items).toEqual([]);
  });
});
