import type { Locator, Page } from '@playwright/test';

export class ProductsPage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly heading: Locator;
  readonly resultCount: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly message: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByTestId('search-input');
    this.searchButton = page.getByTestId('search-submit');
    this.heading = page.getByTestId('search-heading');
    this.resultCount = page.getByTestId('search-count');
    this.items = page.getByTestId('product-item');
    this.itemNames = page.getByTestId('product-name');
    this.message = page.getByTestId('products-message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByTestId('nav-products').click();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  /**
   * Clique sur « Ajouter au panier » et attend la réponse de l'API, quel que soit son statut.
   * Sans cette attente, une navigation ou une déconnexion immédiate peut interrompre la requête.
   */
  async addToBasket(productId: number): Promise<void> {
    const response = this.page.waitForResponse(
      (r) => r.url().endsWith('/api/basket/items') && r.request().method() === 'POST',
    );
    await this.page.getByTestId(`add-to-basket-${productId}`).click();
    await response;
  }
}
