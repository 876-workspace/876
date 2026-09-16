# Brief: 876 Couriers — CRM service-client setup (no feature build-out)

Working directory: `/root/projects/876-wt/couriers-crm` (branch `feat/couriers-crm-setup`). Work ONLY inside this directory.

## Goal
876 Couriers (`apps/couriers`) must be able to call 876 CRM through the typed `@876/crm` SDK at the **service** tier, exactly the way `apps/crm` does. Setup and configuration only — do NOT add pages, routes, UI, or CRM features.

## Read first
- `.claude/rules/sdk-conventions.md`, `.claude/rules/access-tiers.md`, `.claude/rules/env-configuration.md`, `.claude/rules/ai-code-quality.md`.
- Reference implementation to copy: `apps/crm/src/lib/services/crm.ts` (lazy singleton with getters, reads `CRM_API_URL`, `CRM_SERVICE_APP`, `CRM_SERVICE_KEY`, throws when missing).
- CRM API service-app allowlist: `apps/crm-api/src/http/service-auth.ts` (lists `876-crm`, `876-console`, `876-invoice`, `876-billing`, keys come from `CRM_SERVICE_KEYS`).

## Steps
1. `apps/couriers/package.json`: add `"@876/crm": "workspace:*"` to dependencies (alphabetical). Then run `pnpm install --prefer-offline` from the worktree root so the lockfile updates.
2. `apps/couriers/next.config.ts`: add `'@876/crm'` to the `sharedTranspilePackages([...])` list (alphabetical).
3. Create `apps/couriers/src/lib/services/crm.ts` mirroring `apps/crm/src/lib/services/crm.ts`: `import 'server-only'`, lazy `getServiceClient()` using `create876CrmServiceClient` from `@876/crm/service`, and an exported `crm` object exposing getters for `customers`, `requests`, `requestNotes`, `teams`, `requestCategories`, `requestPriorities`, `requestTasks`, `requestReminders`, `requestEvents`, `requestForms` (only those that exist on `CrmServiceClient` — check the type). Do not copy the file wholesale if it contains CRM-app-specific extras; keep only the client.
4. Add a test `apps/couriers/src/lib/services/crm.test.ts` (match style of other couriers tests; check `apps/couriers/vitest.config.ts` environment) that: stubs env with `vi.stubEnv`, mocks `@876/crm/service` and `server-only`, asserts the factory is called once with `{ baseUrl, serviceApp, serviceKey }` on first resource access, is not called on import, and that each missing variable throws its exact message (`CRM_SERVICE_APP is required`, `CRM_SERVICE_KEY is required`, `CRM_API_URL is required`). `vi.unstubAllEnvs()` in afterEach; reset modules between tests. At least 5 `it()` cases.
5. `apps/couriers/.env.example`: add a CRM block:
   ```
   # 876 CRM (service tier). Issue CRM_SERVICE_KEY on crm-api's CRM_SERVICE_KEYS for 876-couriers.
   CRM_API_URL=http://localhost:4010
   CRM_SERVICE_APP=876-couriers
   CRM_SERVICE_KEY=
   ```
6. `apps/crm-api/src/http/service-auth.ts`: add `'876-couriers'` to the allowed service-app list, and update `apps/crm-api/.env.example` (if it documents `CRM_SERVICE_KEYS`) to mention 876-couriers. If `service-auth.test.ts` enumerates the allowlist, update it.
7. If `scripts/cloudflare-release-contract.mjs` or any Vercel/env contract script lists per-app required env for couriers, add the three variables there too (search for `STORAGE_INTERNAL_KEY` near couriers to find it). If none exists, skip.

## Must NOT
- No new pages, route handlers, UI, or `features/` code. No aggregator. No `$876` changes.
- No `eslint-disable`, `as any`, `@ts-ignore`. No git commits, no branches.
- Do not touch any other app.
- Do not write log files.

## Verify (run them, fix failures)
```
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app exec vitest run src/lib/services/crm.test.ts
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api exec vitest run src/http/service-auth.test.ts
```

## Report
Write `plans/2026-09-13-refinement-phase/reports/opencode/2026-09-13-couriers-crm-setup.md` (inside the worktree): files changed with reason, test count, verification output summary, anything you could not do.
