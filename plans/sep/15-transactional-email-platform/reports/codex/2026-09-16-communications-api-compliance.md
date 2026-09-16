# communications-api compliance — 2026-09-16

Branch: `feature/transactional-email-platform` (not moved, no commit).
Scope respected: only files under `apps/communications-api/` plus this report were written. `packages/`, other apps, and the lockfile were not touched.

## Task status

- **Task 1 — 27 TypeScript errors: done.** `tsc --noEmit` is clean (exit 0).
  - Group A (4): renamed wrong contract names to the real exports (`EmailDelivery`, `EmailDomain`, `EmailSender`, `EmailTemplate`).
  - Group B (21): added shared `OrganizationScopedParams` and typed all four routers with `Request<TParams>`; all runtime `if (!organizationId)` guards kept.
  - Group C (1): `deliveries.repository.ts` now takes `metadata: Prisma.InputJsonValue` (imported from the generated client); no cast, no column change.
  - Group D (1): removed the invalid generic on `rejects.toMatchObject` in `resend-provider.test.ts`; assertion object unchanged.
- **Task 2 — service config module: done.** New `src/config/index.ts` (Zod, billing-api shape, `getSettings`/`resetSettingsForTest`, frozen). All six direct `process.env` reads replaced. No secret is logged.
  - `COMMUNICATIONS_DATABASE_URL` required, fails fast naming the variable for missing/empty and for non-URL.
  - `COMMUNICATIONS_INTERNAL_KEY` optional in type; `internal-auth.ts` still fails closed (`!expected` rejects).
  - `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET` optional at boot; missing provider now returns `communications/provider-unavailable` via `providerErrorToAppError` instead of an unhandled throw; webhook still returns `communications/invalid-webhook`.
  - `PORT` defaults to 4050, `ENVIRONMENT` to `development`, `LOG_LEVEL` to `info`. `.env.example` PORT comment now says 4050.
- **Task 3 — per-route guard: done.** `src/http/routes.ts` no longer does `service.use(requireInternalKey)`; the guard is passed per mounted resource router, so `/v1/does-not-exist` falls through to the 404 handler. New `src/http/routes.test.ts` proves both cases.
- **Task 4 — verification: done.** All five commands pass; test count went up by exactly the two new cases.

## Test case count

- Before: **53 passed (5 files)** — `pnpm --filter @876/communications-api test` on the untouched tree.
- After: **55 passed (6 files)** — same command after the fix.
- Delta is +2, both from the new `src/http/routes.test.ts`. No test was deleted or skipped.

## Verification (final, foreground, one at a time)

- `pnpm --filter @876/communications-api typecheck` — **pass** (prisma generate + `tsc --noEmit`, exit 0, no errors).
- `pnpm --filter @876/communications-api lint` — **pass** (exit 0; 1 pre-existing warning in `src/http/error-handler.ts:21` about unused `_next`, 0 errors).
- `pnpm --filter @876/communications-api boundaries` — **pass** (`no dependency violations found (73 modules, 128 dependencies cruised)`).
- `pnpm --filter @876/communications-api test` — **pass** (`Test Files 6 passed (6)`, `Tests 55 passed (55)`).
- `pnpm --filter @876/communications-api build` — **pass** (`tsup` ESM build success, `dist/server.js` + `dist/index.js`).

## Files changed (one line each)

- `src/config/index.ts` (new) — Zod-validated service config (`getSettings`/`resetSettingsForTest`), PORT 4050 default, required DATABASE_URL with URL check.
- `src/http/organization-params.ts` (new) — shared `OrganizationScopedParams = { organizationId: string }`.
- `src/http/routes.test.ts` (new) — proves unauthenticated unknown path is 404 and known route is 401.
- `src/http/routes.ts` — attaches `requireInternalKey` per mounted resource router instead of `service.use`.
- `src/http/internal-auth.ts` — reads the internal key from config; fail-closed behaviour unchanged.
- `src/server.ts` — reads port/environment/logLevel from config (PORT 4050).
- `src/db/index.ts` — reads the connection string from config.
- `src/providers/index.ts` — reads `RESEND_API_KEY` from config; missing key throws `EmailProviderError('unavailable')` so callers map it to the registered error.
- `src/modules/deliveries/deliveries.webhook.ts` — reads `RESEND_WEBHOOK_SECRET` from config; `invalid-webhook` contract unchanged.
- `src/modules/deliveries/deliveries.routes.ts` — `Request<OrganizationScopedParams>` typing; runtime guards kept.
- `src/modules/domains/domains.routes.ts` — same params typing for domain routes.
- `src/modules/senders/senders.routes.ts` — same params typing for sender routes.
- `src/modules/templates/templates.routes.ts` — same params typing for template routes.
- `src/modules/deliveries/deliveries.service.ts` — `EmailDeliveryObject` to `EmailDelivery`; missing provider returns `provider-unavailable` instead of throwing at default-arg evaluation.
- `src/modules/domains/domains.service.ts` — `EmailDomainObject` to `EmailDomain`; same missing-provider handling for its four provider methods.
- `src/modules/senders/senders.service.ts` — `EmailSenderObject` to `EmailSender`.
- `src/modules/templates/templates.service.ts` — `EmailTemplateObject` to `EmailTemplate`.
- `src/modules/deliveries/deliveries.repository.ts` — `metadata` typed as `Prisma.InputJsonValue` from the generated client.
- `src/providers/resend-provider.test.ts` — removed invalid `<Partial<EmailProviderError>>` generic; assertion unchanged; removed now-unused import.
- `.env.example` — PORT comment corrected from 4040 to 4050.

Not changed: `.dependency-cruiser.cjs` — `boundaries` already passes (only a no-circular rule), so no allow-list edit was needed. `tsconfig.json` was not weakened. No `as any` / `ts-ignore` / `ts-expect-error` / `eslint-disable` added (verified by grep).

## Not done / caveats

- Nothing left undone. All four tasks complete and all five verification commands pass.
- Pre-existing repo state (not mine): `apps/communications-api/tsconfig.json`, `pnpm-lock.yaml`, and `.gitignore` were already modified on this branch before I started; I did not touch them. `lint` still reports the pre-existing unused-`_next` warning in `src/http/error-handler.ts`.
