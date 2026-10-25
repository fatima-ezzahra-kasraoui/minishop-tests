import type { Locator, Page } from '@playwright/test';

export class RegisterPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordCounter: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly formError: Locator;
  readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByTestId('register-email');
    this.passwordInput = page.getByTestId('register-password');
    this.passwordCounter = page.getByTestId('register-password-counter');
    this.submitButton = page.getByTestId('register-submit');
    this.emailError = page.getByTestId('register-email-error');
    this.passwordError = page.getByTestId('register-password-error');
    this.formError = page.getByTestId('register-error');
    this.successMessage = page.getByTestId('register-success');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByTestId('nav-register').click();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Saisie caractère par caractère : déclenche les évènements `input` du compteur. */
  async typePassword(password: string): Promise<void> {
    await this.passwordInput.pressSequentially(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async register(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.passwordInput.fill(password);
    await this.submit();
  }
}
