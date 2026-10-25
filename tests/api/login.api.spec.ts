import { expect, test } from '../fixtures';
import { VALID_PASSWORD, uniqueEmail } from '../../utils/data';
import { MESSAGES } from '../../utils/messages';

test.describe('API : connexion', () => {
  test('renvoie un jeton JWT et l\'utilisateur pour de bons identifiants', async ({ api }) => {
    const email = uniqueEmail();
    const { id } = await (await api.register(email, VALID_PASSWORD)).json();

    const response = await api.login(email, VALID_PASSWORD);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(body.user).toEqual({ id, email });
  });

  test('accepte l\'e-mail quelle que soit la casse', async ({ api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    const response = await api.login(email.toUpperCase(), VALID_PASSWORD);

    expect(response.status()).toBe(200);
  });

  test('le jeton expire au bout d\'une heure', async ({ api }) => {
    const user = await api.createUser();

    const payload = JSON.parse(Buffer.from(user.token.split('.')[1], 'base64url').toString());

    expect(payload.exp - payload.iat).toBe(3600);
  });

  test('refuse un mauvais mot de passe', async ({ api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    const response = await api.login(email, 'Mauvais-mot-de-passe');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: MESSAGES.INVALID_CREDENTIALS,
    });
  });

  test('refuse un e-mail inconnu avec la même réponse qu\'un mauvais mot de passe', async ({ api }) => {
    const known = uniqueEmail();
    await api.register(known, VALID_PASSWORD);

    const wrongPassword = await api.login(known, 'Mauvais-mot-de-passe');
    const unknownEmail = await api.login(uniqueEmail(), VALID_PASSWORD);

    expect(unknownEmail.status()).toBe(wrongPassword.status());
    expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
  });

  test('refuse des identifiants absents ou de mauvais type', async ({ api }) => {
    for (const [email, password] of [
      [undefined, undefined],
      [uniqueEmail(), undefined],
      [123, 456],
    ]) {
      const response = await api.login(email, password);
      expect(response.status(), `login(${String(email)}, ${String(password)})`).toBe(401);
    }
  });
});
