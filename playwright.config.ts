import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // Vérifie que l'application répond et tourne dans le mode annoncé par BUGS.
  globalSetup: './utils/global-setup.ts',

  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0, // un test instable doit se voir, pas se faire rejouer en silence
  workers: isCI ? 2 : undefined,

  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
