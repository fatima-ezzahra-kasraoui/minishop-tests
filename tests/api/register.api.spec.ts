import { expect, test } from '../fixtures';
import { expectBug, type BugId } from '../../utils/bugs';
import { VALID_PASSWORD, passwordOfLength, uniqueEmail } from '../../utils/data';
import { MESSAGES } from '../../utils/messages';

test.describe('API : inscription', () => {
  test('crée un compte avec des données valides', async ({ api }) => {
    const email = uniqueEmail();
    const response = await api.register(email, VALID_PASSWORD);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ id: expect.any(Number), email });
  });

  test('ne renvoie jamais le mot de passe ni son empreinte', async ({ api }) => {
    const response = await api.register(uniqueEmail(), VALID_PASSWORD);

    const text = await response.text();
    expect(text).not.toContain(VALID_PASSWORD);
    expect(text.toLowerCase()).not.toMatch(/password|hash/);
  });

  test('normalise l\'e-mail en minuscules et ignore les espaces autour', async ({ api }) => {
    const email = uniqueEmail('casse');
    const response = await api.register(`  ${email.toUpperCase()}  `, VALID_PASSWORD);

    expect(response.status()).toBe(201);
    expect((await response.json()).email).toBe(email);
  });

  // Partitions d'équivalence et valeurs limites du mot de passe (spec §3 : 8 à 40 caractères).
  const passwordCases: Array<{ length: number; valid: boolean; bug?: BugId }> = [
    { length: 0, valid: false },
    { length: 1, valid: false, bug: 'BUG-002' },
    { length: 7, valid: false, bug: 'BUG-002' },
    { length: 8, valid: true },
    { length: 20, valid: true },
    { length: 40, valid: true },
    { length: 41, valid: false },
    { length: 200, valid: false },
  ];

  for (const { length, valid, bug } of passwordCases) {
    const title = `${bug ? `${bug} · ` : ''}mot de passe de ${length} caractère(s) ${valid ? 'accepté' : 'refusé'}`;
    test(title, async ({ api }) => {
      if (bug) expectBug(bug);

      const response = await api.register(uniqueEmail(), passwordOfLength(length));

      if (valid) {
        expect(response.status()).toBe(201);
      } else {
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({
          code: 'PASSWORD_LENGTH',
          message: MESSAGES.PASSWORD_LENGTH,
        });
      }
    });
  }

  test('refuse un mot de passe qui n\'est pas une chaîne', async ({ api }) => {
    const response = await api.register(uniqueEmail(), 12345678);

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('PASSWORD_LENGTH');
  });

  // Partitions d'équivalence de l'e-mail (spec §3).
  const invalidEmails: Array<{ label: string; value: unknown; bug?: BugId }> = [
    { label: 'sans arobase', value: 'sans-arobase.example.com' },
    { label: 'avec un espace interne', value: 'a b@example.com' },
    { label: 'avec deux arobases', value: 'a@b@example.com' },
    { label: 'sans partie locale', value: '@example.com' },
    { label: 'sans domaine', value: 'a@' },
    { label: 'domaine sans point (a@g)', value: 'a@g', bug: 'BUG-003' },
    { label: 'domaine terminé par un point (a@g.)', value: 'a@g.', bug: 'BUG-003' },
    { label: 'domaine commençant par un point (a@.com)', value: 'a@.com', bug: 'BUG-003' },
    { label: 'vide', value: '' },
    { label: 'de type nombre', value: 42 },
    { label: 'trop long (255 caractères)', value: `${'a'.repeat(243)}@example.com` },
  ];

  for (const { label, value, bug } of invalidEmails) {
    const title = `${bug ? `${bug} · ` : ''}e-mail ${label} refusé`;
    test(title, async ({ api }) => {
      if (bug) expectBug(bug);

      const response = await api.register(value, VALID_PASSWORD);

      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ code: 'EMAIL_INVALID', message: MESSAGES.EMAIL_INVALID });
    });
  }

  test('accepte un e-mail minimal valide (a@g.co)', async ({ api }) => {
    const response = await api.register(`a${uniqueEmail().split('@')[0]}@g.co`, VALID_PASSWORD);

    expect(response.status()).toBe(201);
  });

  test('contrôle l\'e-mail avant le mot de passe quand les deux sont invalides', async ({ api }) => {
    const response = await api.register('pas-un-email', '1');

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('EMAIL_INVALID');
  });

  test('refuse un e-mail déjà inscrit (409)', async ({ api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    const response = await api.register(email, VALID_PASSWORD);

    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ code: 'EMAIL_TAKEN', message: MESSAGES.EMAIL_TAKEN });
  });

  test('l\'unicité de l\'e-mail ignore la casse', async ({ api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    const response = await api.register(email.toUpperCase(), VALID_PASSWORD);

    expect(response.status()).toBe(409);
  });

  test('refuse un corps vide', async ({ request }) => {
    const response = await request.post('/api/register', { data: {} });

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('EMAIL_INVALID');
  });

  test('refuse un JSON mal formé avec une erreur 400 propre', async ({ request }) => {
    const response = await request.post('/api/register', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"email": ',
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ code: 'INVALID_JSON', message: MESSAGES.INVALID_JSON });
  });
});
