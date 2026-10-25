import { test as base } from '@playwright/test';
import { BasketPage } from '../pages/BasketPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ShopApi } from '../utils/api-client';

interface Fixtures {
  api: ShopApi;
  registerPage: RegisterPage;
  loginPage: LoginPage;
  productsPage: ProductsPage;
  basketPage: BasketPage;
}

/** `test` enrichi : chaque test reçoit ses Page Objects et un client d'API prêts à l'emploi. */
export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ShopApi(request));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  basketPage: async ({ page }, use) => {
    await use(new BasketPage(page));
  },
});

export { expect } from '@playwright/test';
