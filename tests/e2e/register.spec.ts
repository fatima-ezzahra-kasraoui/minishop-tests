import { expect, test } from '../fixtures';
import { expectBug, type BugId } from '../../utils/bugs';
import { VALID_PASSWORD, passwordOfLength, uniqueEmail } from '../../utils/data';
import { MESSAGES } from '../../utils/messages';

test.describe('E2E : inscription', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('un visiteur crée un compte avec des données valides (AC-01.1)', async ({ registerPage }) => {
    await registerPage.register(uniqueEmail(), VALID_PASSWORD);

    await expect(registerPage.successMessage).toHaveText(MESSAGES.ACCOUNT_CREATED);
    await expect(registerPage.emailError).toBeHidden();
    await expect(registerPage.passwordError).toBeHidden();
  });

  test('le formulaire est vidé après une inscription réussie', async ({ registerPage }) => {
    await registerPage.register(uniqueEmail(), VALID_PASSWORD);
    await expect(registerPage.successMessage).toBeVisible();

    await expect(registerPage.emailInput).toHaveValue('');
    await expect(registerPage.passwordInput).toHaveValue('');
    await expect(registerPage.passwordCounter).toHaveText(/^0\//);
  });

  // ---- Compteur du mot de passe (AC-01.5) ----

  test('BUG-001 · le compteur affiche la limite de 40 caractères', async ({ registerPage }) => {
    expectBug('BUG-001');

    await expect(registerPage.passwordCounter).toHaveText('0/40');
    await registerPage.typePassword('abcde');

    await expect(registerPage.passwordCounter).toHaveText('5/40');
  });

  test('le compteur suit la saisie caractère par caractère', async ({ registerPage }) => {
    await registerPage.typePassword('abc');

    await expect(registerPage.passwordCounter).toHaveText(/^3\/\d+$/);
  });

  // ---- Mot de passe : valeurs limites (AC-01.3) ----

  const passwordCases: Array<{ length: number; valid: boolean }> = [
    { length: 4, valid: false },
    { length: 7, valid: false },
    { length: 8, valid: true },
    { length: 40, valid: true },
    { length: 41, valid: false },
  ];

  for (const { length, valid } of passwordCases) {
    test(`mot de passe de ${length} caractères ${valid ? 'accepté' : 'refusé'}`, async ({ registerPage }) => {
      await registerPage.register(uniqueEmail(), passwordOfLength(length));

      if (valid) {
        await expect(registerPage.successMessage).toHaveText(MESSAGES.ACCOUNT_CREATED);
        await expect(registerPage.passwordError).toBeHidden();
      } else {
        await expect(registerPage.passwordError).toHaveText(MESSAGES.PASSWORD_LENGTH);
        await expect(registerPage.successMessage).toBeHidden();
      }
    });
  }

  // ---- E-mail (AC-01.2) ----

  const invalidEmails: Array<{ label: string; value: string; bug?: BugId }> = [
    { label: 'sans arobase', value: 'sans-arobase.example.com' },
    { label: 'avec un espace interne', value: 'a b@example.com' },
    { label: 'domaine sans point (a@g)', value: 'a@g', bug: 'BUG-003' },
    { label: 'domaine terminé par un point (a@g.)', value: 'a@g.', bug: 'BUG-003' },
    { label: 'vide', value: '' },
  ];

  for (const { label, value, bug } of invalidEmails) {
    test(`${bug ? `${bug} · ` : ''}e-mail ${label} refusé`, async ({ registerPage }) => {
      if (bug) expectBug(bug);

      await registerPage.register(value, VALID_PASSWORD);

      await expect(registerPage.emailError).toHaveText(MESSAGES.EMAIL_INVALID);
      await expect(registerPage.successMessage).toBeHidden();
    });
  }

  test('les deux erreurs s\'affichent quand e-mail et mot de passe sont invalides', async ({ registerPage }) => {
    await registerPage.register('pas-un-email', '123');

    await expect(registerPage.emailError).toHaveText(MESSAGES.EMAIL_INVALID);
    await expect(registerPage.passwordError).toHaveText(MESSAGES.PASSWORD_LENGTH);
  });

  test('une correction après une erreur permet de réussir', async ({ registerPage }) => {
    const email = uniqueEmail();
    await registerPage.register(email, '123');
    await expect(registerPage.passwordError).toBeVisible();

    await registerPage.passwordInput.fill(VALID_PASSWORD);
    await registerPage.submit();

    await expect(registerPage.successMessage).toHaveText(MESSAGES.ACCOUNT_CREATED);
    await expect(registerPage.passwordError).toBeHidden();
  });

  // ---- Unicité (AC-01.4) ----

  test('un e-mail déjà utilisé est refusé', async ({ registerPage, api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    await registerPage.register(email, VALID_PASSWORD);

    await expect(registerPage.emailError).toHaveText(MESSAGES.EMAIL_TAKEN);
    await expect(registerPage.successMessage).toBeHidden();
  });

  test('l\'unicité ignore la casse de l\'e-mail', async ({ registerPage, api }) => {
    const email = uniqueEmail();
    await api.register(email, VALID_PASSWORD);

    await registerPage.register(email.toUpperCase(), VALID_PASSWORD);

    await expect(registerPage.emailError).toHaveText(MESSAGES.EMAIL_TAKEN);
  });

  test('un double clic sur « Créer le compte » ne produit pas d\'erreur de doublon', async ({ registerPage }) => {
    await registerPage.fillEmail(uniqueEmail());
    await registerPage.passwordInput.fill(VALID_PASSWORD);

    await registerPage.submitButton.dblclick();

    await expect(registerPage.successMessage).toHaveText(MESSAGES.ACCOUNT_CREATED);
    await expect(registerPage.emailError).toBeHidden();
  });
});
