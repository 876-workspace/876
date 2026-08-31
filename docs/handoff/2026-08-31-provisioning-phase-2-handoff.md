# Provisioning Phase 2 — final handoff

Date: 2026-08-31
Branch: `feature/provisioning-phase-2`
Base: Phase 1 merged by PR #449

## Outcome

Phase 2 is complete. Organization creation now resolves a published provisioning
setup from canonical location facts, persists the decision and its audit fields
once, applies setup-owned application and Work policy, and reuses the persisted
selection on retries. Finance readiness no longer assigns the platform's current
default setup implicitly.

Business registration requires a canonical ISO country from the shared country
catalog. Subdivision and jurisdiction remain unset until signup has an
authoritative Region/jurisdiction identifier; free-form values are not accepted.

## New-organization sequence

1. Validate canonical country and create the organization identity.
2. Resolve active, published setup candidates using OR between condition groups
   and AND within a group.
3. Select by specificity, priority, setup key, then group key; use the single
   published fallback only when no policy matches.
4. Persist setup key, selection explanation, selected timestamp, currency, and
   language before setup-driven subscription, finance, or Work writes.
5. Apply application entitlements, the `service/work` gate, and enabled Work
   capability scopes.
6. On retry, require and reuse the stored selection. Never reroute an existing
   organization under newer policy.

## Existing organizations

The backfill is explicit and conditional: it reads only organizations without a
setup and writes only while the setup key remains null. Run the dry pass first:

```bash
pnpm --filter @876/api provisioning:backfill-selections --dry-run
pnpm --filter @876/api provisioning:backfill-selections
```

Use `--page-size=<1-500>` and `--limit=<n>` to bound either pass. On 2026-08-31,
the configured development database dry run examined zero organizations, so no
write pass was necessary.

## Database state

Migration `20260831010000_provisioning_setup_selection` was deployed to the
configured Neon development database. `prisma migrate status` reports all 11
migrations applied. Provisioning import verification reports `valid: true`, 36
setups, 7 application manifests, and `global-usd` as the sole default.

## Local repair pass

Executable review fixed issues that the authoring environment could not detect:

- restored the API Supertest type dependency and synchronized the UI workspace
  dependency in `pnpm-lock.yaml`;
- removed obsolete duplicate business-registration controller/UI paths;
- corrected the Prisma selection type and removed a provisioning barrel cycle;
- repaired stale dependency mocks and consumed-`Response` test fixtures;
- isolated the one Console filesystem test to the Node Vitest environment;
- added Express-stack tests for missing, unsupported, conflicting, and
  normalized business-registration country input.

## Verification

```text
@876/api typecheck                 passed
@876/account typecheck             passed
@876/ui typecheck                  passed
@876/console typecheck             passed
@876/api boundaries                passed (575 modules, 0 violations)
@876/api test                      passed (103 files, 2150 tests)
@876/console test                  passed (133 files, 1353 tests)
@876/ui test                       passed (17 files, 111 tests)
@876/api lint                      passed with pre-existing warnings only
@876/console lint                  passed with pre-existing warnings only
prisma validate                    passed
prisma migrate deploy/status       passed
provisioning:verify                valid: true
backfill --dry-run                 0 rows
```
