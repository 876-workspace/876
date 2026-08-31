# Provisioning Phase 2 — handoff for the next AI

Date: 2026-08-31
Branch: `feature/console-settings-provisioning`
Read first: `docs/handoff/2026-08-31-provisioning-phase-1.md` and
`docs/handoff/2026-08-31-provisioning-phase-1-final-status.md`.

## Phase 1 is now final

Phase 1 was completed and the final PR opened on this branch. The work landed
as six commits:

1. `feat(geo)`: read-only `languages` catalog (`GET /geo/languages`), Prisma
   migration `20260831000002_geo_languages`, seed for English.
2. `feat(platform)`: typed `geo.listCurrencies()` / `geo.listLanguages()` on the
   admin and workspace operator clients.
3. `feat(console-provisioning)`: currency and language fields in the provisioning
   editor are now selections backed by the geo catalogs instead of free text.
4. `fix(provisioning)`: one-time import is retry-safe (an importer-owned draft
   matching the requested manifest is published directly, so a retry after a
   publish failure converges) and the policy merge normalizes by group key and
   updates existing rows rather than appending duplicates.
5. `test(provisioning)`: Work capability/scope expectations aligned with Phase 1
   (events, calendars, My Work permissions; Work tenant scopes list).
6. `chore(api)`: pin helmet to the lockfile's 8.3.0.

The migration was applied and the one-time import + verifier ran against the
remote development database: verifier reported `valid: true` (36 setups,
7 application manifests, `global-usd` default).

## Known errors to be aware of (pre-existing, not from this PR)

- **Console component tests fail with `React.act is not a function`** across the
  whole console suite (not just provisioning). Reproduced on the base branch
  with an untouched test file. Cause: React 19.2.8 + `@testing-library/react`
  16.3.2 incompatibility in this environment. Fixing it is a separate concern
  from Phase 2; do not treat provisioning test failures as regressions until
  this is resolved.
- **Console lint has one pre-existing error** in
  `apps/console/src/features/crm/request-customer-option.ts` — a feature
  importing another feature via `@/features/*` (no-restricted-imports). Not
  touched by Phase 1.
- API lint passes with only pre-existing warnings (unused vars in
  `provisioning-billing-opt-in.test.ts`, `features.repository.ts`, `features.ts`).

## Phase 2 scope (unchanged)

Phase 2 is responsible for resolving/persisting a setup during organization
creation using authoritative country/subdivision/jurisdiction data, then
applying finance manifest v1 plus application/service/service-capability policy
idempotently. Do not add signup-time automatic setup selection to this branch.

Interpret Work policy in this order:

```text
service/work disabled -> do not provision/enable Work
service/work enabled  -> provision Work and then apply enabled capability rows
```

## Verification commands that pass on this branch

```bash
pnpm --filter @876/platform typecheck
pnpm --filter @876/workspace typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/api lint            # 0 errors (pre-existing warnings only)
pnpm --filter @876/api exec vitest run --run src/modules/geo src/modules/provisioning src/services/__tests__/workspace-work.test.ts src/seeds/app-access.test.ts
```
