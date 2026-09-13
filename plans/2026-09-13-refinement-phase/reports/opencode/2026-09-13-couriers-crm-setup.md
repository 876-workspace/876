# 876 Couriers — CRM service-client setup (report)

Date: 2026-09-13 · Branch: `feat/couriers-crm-setup` · Author: opencode

Setup-only change: `apps/couriers` can now call 876 CRM through the typed
`@876/crm` SDK at the **service** tier, mirroring `apps/crm`. No pages,
routes, UI, or `features/` code were added.

## Files changed (with reason)

| File | Reason |
| ---- | ------ |
| `apps/couriers/package.json` | Added `"@876/crm": "workspace:*"` (alphabetical). Pre-existing from the interrupted run; kept. |
| `pnpm-lock.yaml` | Lockfile updated for the new workspace dep via `pnpm install --prefer-offline --no-frozen-lockfile` (`--no-frozen-lockfile` needed because frozen-lockfile defaults on in this environment). |
| `apps/couriers/next.config.ts` | Added `'@876/crm'` to `sharedTranspilePackages([...])` (alphabetical). `@876/crm` ships source, so it must be transpiled like the other non-UI workspace packages. |
| `apps/couriers/src/lib/services/crm.ts` (new) | Lazy-singleton service client mirroring `apps/crm/src/lib/services/crm.ts`: `import 'server-only'`, `getServiceClient()` reading `CRM_SERVICE_APP` / `CRM_SERVICE_KEY` / `CRM_API_URL` with the exact throw messages, `create876CrmServiceClient` from `@876/crm/service`, and a `crm` object with getters for `customers`, `requests`, `requestNotes`, `teams`, `requestCategories`, `requestPriorities`, `requestTasks`, `requestReminders`, `requestEvents`, `requestForms` — all 10 verified present on `CrmServiceClient` (`packages/crm/src/service-client.ts`). The reference file's `requestFormSubmissions` / `requestFormRequests` getters were intentionally omitted as CRM-app extras not required for the couriers setup. |
| `apps/couriers/src/lib/services/crm.test.ts` (new) | 7 `it()` cases: no factory call on import; single factory call with `{ baseUrl, serviceApp, serviceKey }` on first access; singleton reuse across resources; all 10 getters resolve from the same client; exact throw for each missing variable (`CRM_SERVICE_APP is required`, `CRM_SERVICE_KEY is required`, `CRM_API_URL is required`). Mocks `@876/crm/service` and `server-only`, uses `vi.stubEnv` + `vi.unstubAllEnvs()` in `afterEach` + `vi.resetModules()` in `beforeEach` with per-test dynamic imports. |
| `apps/couriers/.env.example` | Added CRM service-tier block (`CRM_API_URL=http://localhost:4010`, `CRM_SERVICE_APP=876-couriers`, empty `CRM_SERVICE_KEY`) with the issue-key comment, placed after the Storage block. |
| `apps/crm-api/src/http/service-auth.ts` | Added `'876-couriers'` to the `SERVICE_APPS` allowlist. |
| `apps/crm-api/.env.example` | Documented that `CRM_SERVICE_KEYS` must include a key for `876-couriers`. |
| `apps/crm-api/src/http/service-auth.test.ts` | Added one acceptance case proving `876-couriers` + configured key passes and records `crmServiceAppSlug: '876-couriers'`. (The file did not enumerate the allowlist, so no existing case needed updating; the `unknown-app` rejection case still passes.) |

## Step 7 (env contract scripts)

Skipped per the brief: `scripts/cloudflare-release-contract.mjs` does not
exist (only an inactive copy under `parked/cloudflare/scripts/`), and no
active Vercel/env contract script lists per-app required env for couriers —
`STORAGE_INTERNAL_KEY` appears only in `apps/couriers/src/lib/services/storage.ts`.

## Verification output summary

- `pnpm --filter @876/couriers-app typecheck` — clean (`tsc --noEmit`, no errors).
- `pnpm --filter @876/couriers-app lint` — 0 errors; 12 warnings, all pre-existing in unrelated files (onboarding/register/shell/portal `window.location` navigations, unused `tenant` in `lib/manage/customers.ts`). One self-introduced error (`no-assign-module-variable` from naming a test variable `module`) was fixed by renaming to `crmModule`.
- `pnpm --filter @876/couriers-app exec vitest run src/lib/services/crm.test.ts` — 1 file, **7/7 passed**.
- `pnpm --filter @876/crm-api typecheck` — clean (Prisma Client regenerated, no TS errors).
- `pnpm --filter @876/crm-api exec vitest run src/http/service-auth.test.ts` — 1 file, **12/12 passed** (11 existing + 1 new `876-couriers` case).

## Not done / notes

- Nothing outstanding. No commits or branches were created; no log files written; no other app was touched. `plans/…` report directory already existed, so only this file was added under it.
