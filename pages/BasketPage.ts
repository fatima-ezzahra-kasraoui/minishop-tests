import type { Locator, Page } from '@playwright/test';

export class BasketPage {
  readonly rows: Locator;
  readonly names: Locator;
  readonly quantities: Locator;
  readonly total: Locator;
  readonly message: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.getByTestId('basket-item');
    this.names = page.getByTestId('basket-item-name');
    this.quantities = page.getByTestId('basket-item-quantity');
    this.total = page.getByTestId('basket-total');
    this.message = page.getByTestId('basket-message');
  }

  async open(): Promise<void> {
    await this.page.getByTestId('nav-basket').click();
  }

  async remove(productId: number): Promise<void> {
    await this.page.getByTestId(`remove-${productId}`).click();
  }
}
