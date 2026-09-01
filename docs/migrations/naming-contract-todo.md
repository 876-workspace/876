# Platform Naming Contract Migration — Implementation Tracker

Branch: `refactor/platform-naming-contract`
Base: `main` at `02594b1bd2a496d63863f4deba14443132019dac`

This file is the committed progress tracker for the naming-contract migration.
The repository rule normally prefers a local `.claude/tracker/implementation_plan.md`;
this run is being performed through the GitHub connector rather than a writable
local checkout, so the user-requested tracker is kept here and will remain as
migration history.

## Pre-flight and governance

- [x] Branch from the exact current `main` head.
- [x] Read `CLAUDE.md`.
- [x] Read `.claude/rules/cli.md`.
- [x] Read git, execution-autonomy, implementation-tracker, types, code-style,
      Express/API, SDK, app-structure/routing, access, feature-flag, module-settings,
      platform-service, testing, storage, and customer-architecture rules.
- [x] Define the ownership-based platform naming contract in `.claude/rules/naming.md`.
- [x] Mirror the naming rule byte-for-byte in `.agents/rules/naming.md`.
- [ ] Update every older rule that explicitly mandates snake_case 876-owned values.

## App access and permissions

- [x] Make product-app permission module/action validation kebab-case.
- [x] Preserve Console's existing underscore action as a documented migration exception.
- [x] Rename Couriers `pre_alerts.*` permissions to `pre-alerts.*` in the canonical catalog.
- [x] Rename CRM `my_work.*` and `request_forms.*` permissions to `my-work.*` and `request-forms.*`.
- [x] Rename CRM integration scopes from `crm.request_forms.*` to `crm.request-forms.*`.
- [x] Rename Billing/Invoice system role key `finance_manager` to `finance-manager`.
- [x] Add Core DB migration for permission rows, role permission arrays, assignment grants/denies,
      application-module keys, and Billing/Invoice role keys.
- [x] Add collision preflight for canonical/legacy app-permission and role rows.
- [x] Normalize app/runtime call sites that consume this slice's renamed permission keys.
- [ ] Migrate Console `console:danger_zone` with its separate operator-store backfill.

## Module settings and Couriers datastore

- [x] Change shared module/preference key validation from snake_case to kebab-case.
- [x] Update `@876/settings` tests and public type comments.
- [x] Rename Couriers `pre_alerts` module to `pre-alerts` across app/API/SDK schemas/navigation.
- [x] Rename every system-owned Couriers preference key to kebab-case.
- [x] Rename controlled enum/reference namespace values to kebab-case.
- [x] Add Couriers DB migration for `organization_modules` and `module_preferences` values.
- [x] Add collision checks before updating unique `(tenant,module)` / `(tenant,module,key)` rows.

## Feature flags

- [ ] Convert canonical PostHog/local feature slugs to app-prefixed kebab-case.
- [ ] Use existing `legacySlugs`/state-copy migration machinery rather than raw provider mutation.
- [ ] Update parent/child prefix validation to hyphens.
- [ ] Update app constants/consumers and Console feature administration.
- [ ] Document provider rollout-copy and retirement sequence.

## API / SDK contracts

- [ ] Update governing Express/Stripe-pattern rules from snake_case 876 JSON to camelCase.
- [ ] Inventory every app-owned API family that still emits snake_case fields/discriminators.
- [ ] Convert safe internal API/SDK contracts with compatibility parsing where deployments can overlap.
- [ ] Preserve OAuth/provider wire spelling exactly.
- [ ] Preserve/version any externally published contract that cannot break in place.
- [ ] Regenerate/review OpenAPI from authoritative schemas after contract changes.

## Other symbolic values

- [ ] Normalize Work `my_work` object discriminator to `my-work` and remaining permission call sites.
- [ ] Audit CRM, Billing, Invoice, Storage, Widgets, Console, Work and Couriers status/event/object values.
- [ ] Normalize 876-owned error codes that still contain underscore-delimited words.
- [ ] Preserve provider/protocol values, user-authored data, opaque IDs, signatures, hashes and storage keys.

## Database migration documentation

- [x] Keep existing physical SQL table/column names unchanged and mapped through Prisma.
- [x] Use explicit old→new SQL mappings; no algorithmic underscore replacement.
- [x] Inventory the Core app-access and Couriers settings datastores in this migration slice.
- [x] Write detailed backup, preflight, deployment-order, migration, verification and rollback instructions.
- [x] Include per-database SQL/query examples and expected zero-legacy-value checks.
- [ ] Describe PostHog and queue/cache/provider boundaries separately from SQL data.

## Enforcement and verification

- [x] Add/extend reusable naming validation tests/checks to prevent new legacy identifiers in this slice.
- [x] Search changed source for legacy values and retain only intentional migration/test compatibility references.
- [x] Run available typecheck/lint/test checks and record known repository-baseline failures precisely.
- [x] Self-review branch diff against `main`.
- [x] Write `docs/migrations/naming-contract-migration-report.md`.
- [ ] Open PR to `main` and review CI status.
