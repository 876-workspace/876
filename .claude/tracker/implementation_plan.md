# AI Slop Remediation Implementation Plan

Branch: `refactor/anti-slop-consolidation`
Base: `main`
Date: 2026-09-01

## Goal

Reduce confirmed repository-level AI-slop patterns without broad rewrites: eliminate duplicated CRM contracts, normalize duplicated CRM route transport behavior onto existing shared helpers, add enforceable reuse-first guidance, and document deliberately deferred items that require executable/local verification.

## Decisions

- Treat `@876/crm` as the canonical owner of CRM wire contracts; the CRM API consumes a contracts-only package entrypoint rather than redefining public resource/input types.
- Keep API-internal orchestration-only types (for example `RequestIntakeContext` and internal filter shapes) in `apps/crm-api`.
- Normalize the CRM organization-switch route to existing `@876/core/api` result helpers and app-owned auth schema conventions; do not introduce a new cross-app BFF framework.
- Do not merge Prisma bootstrap implementations in this remote-only pass. The APIs use different generated clients/runtime adapters, and the repo requires service verification before changing database-client behavior.
- Do not change authorization semantics while removing duplication. Membership/organization checks remain fail-closed and unchanged.
- Keep the deprecated request-note `internal` input compatibility path because it is an established public contract and no coordinated removal migration was requested.

## Tasks

- [x] Read root `CLAUDE.md`, `.claude/rules/cli.md`, git/execution/tracker rules, and relevant type/API/access/SDK/app-structure rules.
- [x] Create `refactor/anti-slop-consolidation` from `main`.
- [x] Add a contracts-only `@876/crm/contracts` entrypoint.
- [x] Make CRM API request contracts consume the canonical CRM package contracts.
- [x] Make CRM API request validation reuse the canonical request status/channel schemas.
- [x] Update `@876/crm-api` dependencies for the contracts boundary.
- [x] Normalize CRM `/api/auth/switch-org` to shared API envelope helpers and the app auth schema while preserving existing error codes.
- [x] Review existing tests/contract coverage. No new behavioral tests were added because this pass removes duplicate declarations without changing the canonical schemas; runtime execution is deferred to CI/local verification.
- [x] Add anti-slop/reuse-first repository guidance and mirror it byte-for-byte into `.agents/rules/`.
- [x] Audit touched code for deprecated compatibility residue; retain only the established request-note compatibility field pending a coordinated migration.
- [x] Self-review branch diff for duplication, `eslint-disable`, `as any`, dead compatibility aliases, and accidental scope growth. No new suppressions/casts/aliases were introduced.
- [ ] Write final CLI-style implementation report under `.claude/reports/`.
- [ ] Open PR to `main` and verify mergeability/check state available from GitHub.

## Deferred candidates requiring executable verification

- Shared Prisma client construction across `apps/api`, `apps/billing-api`, and `apps/couriers-api`.
- Broader centralization of organization-routing selection semantics across Billing, CRM, Invoice, Couriers, and Enterprise.
- Core access helpers that catch unexpected exceptions and return `[]`/`false`; these require behavior/security tests before changing fail-closed semantics.

Current status: IMPLEMENTATION COMPLETE — REPORT/PR PENDING
