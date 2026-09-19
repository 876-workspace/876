# Unit C — one apps directory, driven by configuration

## The defect

`getAppsDirectory()` is copied into three apps, and the copies have already
drifted — couriers lists two apps, crm and projects list three, and none lists
Invoice, Console, Enterprise, or Commerce:

```
apps/couriers/src/lib/apps-directory.ts   876 Couriers, 876 Billing
apps/crm/src/lib/apps-directory.ts        876 CRM, 876 Billing, 876 Couriers
apps/projects/src/lib/apps-directory.ts   876 Projects, 876 Billing, 876 Couriers
```

Each also hardcodes a fallback origin:

```ts
url: process.env.NEXT_PUBLIC_BILLING_URL ?? 'https://billing.876.app'
```

`.agents/rules/env-configuration.md` rule 4 calls that exact shape a landmine:
a default that works in dev and silently misroutes in production. Read that rule
before you start.

## Read budget: 5 files.

```
apps/couriers/src/lib/apps-directory.ts
apps/crm/src/lib/apps-directory.ts
apps/projects/src/lib/apps-directory.ts
packages/core/src/lib/platform-apps.ts    (existing slug registry — the neighbour)
packages/ui/src/app-switcher.tsx          (for the AppSwitcherApp type only)
```

## What to build

### 1. One shared module

Add `buildAppsDirectory` to `packages/core` beside `platform-apps.ts` — it is
platform vocabulary, not UI. Signature:

```ts
export interface AppDirectoryEntry {
  name: string
  url: string
  current?: boolean
}

/** Every first-party app whose origin is configured, with `current` marked. */
export function buildAppsDirectory(options: {
  current: PlatformAppName
  currentUrl?: string   // defaults to '/'
}): AppDirectoryEntry[]
```

Rules for the implementation:

- The full first-party list lives here **once**: Billing, Couriers, CRM,
  Projects, Invoice, Enterprise, Console, Commerce, plus the consumer app.
  Reuse `PLATFORM_APP_SLUGS` where it helps; extend it if an app is missing, but
  do not restructure it.
- Each entry's origin comes from its `NEXT_PUBLIC_<APP>_URL` variable.
  **An app whose variable is unset is omitted from the list** — no fallback
  origin, no placeholder. An app switcher that silently points at a dead
  hostname is worse than one that omits the entry.
- The `current` app is always present, at `currentUrl ?? '/'`, regardless of
  whether its own env var is set.
- Order is stable and declared in code, not dependent on env iteration order.

Do not import `@876/ui` into `@876/core`. Return plain data; the three apps pass
it to `AppSwitcher`, whose `AppSwitcherApp` type it must satisfy structurally.

### 2. Delete the three copies

Delete all three `apps-directory.ts` files and update their importers to call
`buildAppsDirectory`. Find them with:
`grep -rn "apps-directory\|getAppsDirectory" apps | grep -v node_modules`

Note couriers' version takes a `basePath` argument (its shell is mounted under
an org slug) — pass that as `currentUrl`.

### 3. Env declaration

For every `NEXT_PUBLIC_<APP>_URL` the module reads, add it to the
`.env.example` of each app that will read it, marked
`# optional — the app is omitted from the app switcher when unset`.
`.agents/rules/env-configuration.md` requires every variable an app reads to be
declared there.

### 4. Tests

`packages/core/src/lib/apps-directory.test.ts`, minimum **8** `it()` cases,
counted in your report:
- the current app is present and marked `current: true`;
- the current app uses `currentUrl` when given, `'/'` when not;
- an app with its env var set appears, with that exact url;
- an app with its env var **unset is absent** (the important one);
- no entry ever carries a hardcoded fallback origin;
- ordering is stable across two calls with the same env;
- the current app appears even when its own env var is unset;
- exactly one entry has `current: true`.

Use `vi.stubEnv` and `vi.unstubAllEnvs()` in `afterEach` per
`.agents/rules/testing.md` Mock Rule 5.

## Hard prohibitions

- Do **not** keep any hardcoded `https://*.876.app` fallback.
- Do **not** import `@876/ui` from `@876/core`.
- Do **not** leave any `apps-directory.ts` behind in an app.
- Do **not** add `eslint-disable`, `@ts-ignore`, `as any`, `as unknown as`.
- Do **not** `git commit`, branch, or open a PR.

## Verify

```
pnpm --filter @876/core test
pnpm --filter @876/core typecheck
pnpm --filter @876/crm typecheck
pnpm --filter @876/projects typecheck
pnpm --filter @876/couriers-app typecheck
grep -rn "876.app'" apps packages | grep -v node_modules    # expect no hardcoded origins
```

## Report

`plans/sep/19-lib-structure-consolidation/reports/cline/2026-09-19-unit-c.md`
— files changed, counted `it()` total, the env variables you declared, the final
grep, verification output, anything unverified.
