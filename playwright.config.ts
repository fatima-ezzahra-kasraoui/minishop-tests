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

  // Allure écrit ses données brutes dans allure-results/ ; le rapport lisible
  // est généré ensuite (npm run allure:generate) et publié par la CI sur GitHub Pages.
  reporter: isCI
    ? [
        ['list'],
        ['github'],
        ['html', { open: 'never' }],
        ['allure-playwright', { resultsDir: 'allure-results' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['allure-playwright', { resultsDir: 'allure-results' }],
      ],

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
