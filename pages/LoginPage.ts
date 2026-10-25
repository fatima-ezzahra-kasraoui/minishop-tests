import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly userStatus: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
    this.userStatus = page.getByTestId('user-status');
    this.logoutButton = page.getByTestId('nav-logout');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByTestId('nav-login').click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Se connecte puis attend que l'interface affiche « Connecté : e-mail ».
   * À utiliser quand la suite du test dépend d'une session ouverte : sans cette attente,
   * un clic immédiat s'exécute avant la fin de la connexion.
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.userStatus.filter({ hasText: `Connecté : ${email}` }).waitFor();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
