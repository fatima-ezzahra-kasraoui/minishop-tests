import { expect, test } from '../fixtures';
import { uniqueEmail } from '../../utils/data';
import { MESSAGES } from '../../utils/messages';

test.describe('E2E : connexion', () => {
  test('un utilisateur inscrit se connecte (AC-02.1)', async ({ loginPage, api }) => {
    const user = await api.createUser();

    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    await expect(loginPage.userStatus).toHaveText(`Connecté : ${user.email}`);
    await expect(loginPage.logoutButton).toBeVisible();
  });

  test('un mauvais mot de passe est refusé (AC-02.2)', async ({ loginPage, api }) => {
    const user = await api.createUser();

    await loginPage.goto();
    await loginPage.login(user.email, 'Mauvais-mot-de-passe');

    await expect(loginPage.errorMessage).toHaveText(MESSAGES.INVALID_CREDENTIALS);
    await expect(loginPage.userStatus).toHaveText('Non connecté');
  });

  test('un e-mail inconnu reçoit le même message qu\'un mauvais mot de passe (AC-02.2)', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(uniqueEmail(), 'Motdepasse-123');

    await expect(loginPage.errorMessage).toHaveText(MESSAGES.INVALID_CREDENTIALS);
  });

  test('la déconnexion rétablit l\'état « Non connecté » (AC-02.3)', async ({ loginPage, api }) => {
    const user = await api.createUser();
    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await expect(loginPage.userStatus).toHaveText(`Connecté : ${user.email}`);

    await loginPage.logout();

    await expect(loginPage.userStatus).toHaveText('Non connecté');
    await expect(loginPage.logoutButton).toBeHidden();
  });

  test('la session survit à un rechargement de la page', async ({ loginPage, api, page }) => {
    const user = await api.createUser();
    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await expect(loginPage.userStatus).toHaveText(`Connecté : ${user.email}`);

    await page.reload();

    await expect(loginPage.userStatus).toHaveText(`Connecté : ${user.email}`);
  });
});
