import type { APIRequestContext, APIResponse } from '@playwright/test';
import { VALID_PASSWORD, uniqueEmail } from './data';

export interface Product {
  id: number;
  name: string;
  description: string;
  priceCents: number;
}

export interface BasketItem {
  productId: number;
  name: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Basket {
  userId: number;
  items: BasketItem[];
  totalCents: number;
}

export interface TestUser {
  id: number;
  email: string;
  password: string;
  token: string;
}

/** Fine couche au-dessus de `request` : évite de répéter routes et en-têtes dans les tests. */
export class ShopApi {
  constructor(private readonly request: APIRequestContext) {}

  register(email: unknown, password: unknown): Promise<APIResponse> {
    return this.request.post('/api/register', { data: { email, password } });
  }

  login(email: unknown, password: unknown): Promise<APIResponse> {
    return this.request.post('/api/login', { data: { email, password } });
  }

  products(query?: string): Promise<APIResponse> {
    return this.request.get('/api/products', query === undefined ? {} : { params: { q: query } });
  }

  basket(userId: number | string, token?: string): Promise<APIResponse> {
    return this.request.get(`/api/basket/${userId}`, { headers: bearer(token) });
  }

  addToBasket(token: string | undefined, productId: unknown, quantity?: unknown): Promise<APIResponse> {
    const data: Record<string, unknown> = { productId };
    if (quantity !== undefined) data.quantity = quantity;
    return this.request.post('/api/basket/items', { data, headers: bearer(token) });
  }

  removeFromBasket(token: string | undefined, productId: number): Promise<APIResponse> {
    return this.request.delete(`/api/basket/items/${productId}`, { headers: bearer(token) });
  }

  /** Crée un compte unique et le connecte : prérequis rapide pour la plupart des tests. */
  async createUser(prefix = 'user'): Promise<TestUser> {
    const email = uniqueEmail(prefix);
    const registered = await this.register(email, VALID_PASSWORD);
    if (registered.status() !== 201) {
      throw new Error(`Création du compte de test impossible : HTTP ${registered.status()}`);
    }
    const { id } = (await registered.json()) as { id: number };

    const logged = await this.login(email, VALID_PASSWORD);
    if (!logged.ok()) {
      throw new Error(`Connexion du compte de test impossible : HTTP ${logged.status()}`);
    }
    const { token } = (await logged.json()) as { token: string };
    return { id, email, password: VALID_PASSWORD, token };
  }

  async catalogue(): Promise<Product[]> {
    const response = await this.products();
    return ((await response.json()) as { products: Product[] }).products;
  }
}

function bearer(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
