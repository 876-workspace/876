import { defineConfig, devices } from '@playwright/test'

const appProjects = [
  { app: 'console', baseURL: 'http://127.0.0.1:3002' },
  { app: 'billing', baseURL: 'http://127.0.0.1:3004' },
  { app: 'couriers', baseURL: 'http://127.0.0.1:3003' },
] as const

/** Points at a closed port: satisfies config loaders, refuses connections. */
const UNREACHABLE_DATABASE_URL =
  'postgresql://ui_tests:ui_tests@127.0.0.1:9/ui_tests'

const browserProjects = [
  { browser: 'chromium', device: devices['Desktop Chrome'] },
  { browser: 'firefox', device: devices['Desktop Firefox'] },
  { browser: 'webkit', device: devices['Desktop Safari'] },
] as const

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  use: {
    colorScheme: 'light',
    locale: 'en-JM',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: appProjects.flatMap(({ app, baseURL }) =>
    browserProjects.map(({ browser, device }) => ({
      name: `${app}-${browser}`,
      testMatch: `${app}/**/*.spec.ts`,
      use: { ...device, baseURL },
    }))
  ),
  // These smoke tests only exercise the unauthenticated shells, so the apps are
  // started with `next dev` rather than their `dev` scripts: those run
  // `prisma migrate deploy` first, which needs a reachable database CI has no
  // reason to provide. The placeholder URLs keep Prisma's config loader happy
  // (it throws on an unset variable before it ever connects); the clients
  // themselves are constructed lazily, so no query is attempted.
  webServer: [
    {
      name: 'Console',
      command:
        'pnpm --filter @876/console exec next dev --turbopack --port 3002',
      url: 'http://127.0.0.1:3002/access-denied',
      env: {
        ...process.env,
        CONSOLE_DATABASE_URL:
          process.env.CONSOLE_DATABASE_URL ?? UNREACHABLE_DATABASE_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: 'Billing',
      command:
        'pnpm --filter @876/billing-app exec next dev --turbopack --port 3004',
      url: 'http://127.0.0.1:3004/no-access',
      env: {
        ...process.env,
        BILLING_DATABASE_URL:
          process.env.BILLING_DATABASE_URL ?? UNREACHABLE_DATABASE_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: 'Couriers',
      command:
        'pnpm --filter @876/couriers exec next dev --turbopack --port 3003',
      url: 'http://127.0.0.1:3003/no-access',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? UNREACHABLE_DATABASE_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
