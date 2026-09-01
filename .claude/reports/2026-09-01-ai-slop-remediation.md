# AI Slop Remediation — Implementation Report

Date: 2026-09-01

Branch: `refactor/anti-slop-consolidation`

Base: `main` at `21364af46716bd67c04362c197bef9ed24e26661`

## Status

Implementation is complete on the branch. This pass deliberately targets confirmed repository-level duplication and contract drift rather than attempting a broad aesthetic rewrite.

The principal result is that CRM request/note wire contracts now have one canonical owner in `@876/crm`, CRM API consumes those contracts instead of restating them, CRM request validation reuses the canonical request status/channel schemas, and the standalone CRM org-switch route uses the shared API result helpers instead of maintaining a second envelope implementation.

A new repository rule also makes the reuse-first/search-before-write process explicit for future agents.

## What changed

### 1. Canonical CRM contracts boundary

Added `packages/crm/src/contracts.ts` and published it as `@876/crm/contracts`.

The contracts-only entrypoint intentionally exports schemas/types without requiring consumers to import a client-authority entrypoint. It currently exposes the shared request and request-note contracts needed by the CRM data service.

### 2. CRM API no longer restates public request contracts

`apps/crm-api/src/types/request.ts` previously independently declared:

- `RequestStatus`
- `requestChannelSchema`
- `RequestChannel`
- `RequestNoteKind`
- `RequestNoteVisibility`
- `CrmRequest`
- `CreateRequestInput`
- `UpdateRequestInput`
- `CrmRequestNote`
- request-note create/list/update/delete inputs

Those public contracts now re-export from `@876/crm/contracts`.

Only API-internal shapes remain local:

- `ListRequestsFilter`, whose nullable selectors are repository-facing semantics;
- `RequestIntakeContext`, which is internal persisted intake provenance;
- `DeleteRequestInput`, an internal service-layer audit input.

This removes more than ninety lines of competing type declarations from the CRM API.

### 3. CRM request validation reuses canonical enums

`apps/crm-api/src/modules/requests/requests.schemas.ts` previously declared a second `requestStatusSchema` with the same six values as `@876/crm`.

It now imports both `requestStatusSchema` and `requestChannelSchema` from `@876/crm/contracts` and re-exports the status schema only for existing local module consumers.

The API-specific request body/query schemas remain local because they encode HTTP validation constraints such as trimming and maximum lengths; only the duplicated domain enumerations were centralized.

### 4. CRM API dependency boundary

`@876/crm-api` now declares `@876/crm` as a workspace dependency so the data service can consume the owning product's canonical contracts.

This dependency is contracts-only for the edited server path; it does not route CRM API business behavior through the public client.

### 5. CRM org-switch transport normalization

`apps/crm/src/app/api/auth/switch-org/route.ts` previously manually declared its Zod input schema and manually built every `{ data, error }` response.

It now:

- imports `apiError` / `apiSuccess` from `@876/core/api`;
- consumes `switchOrganizationInputSchema` from `apps/crm/src/types/auth.ts`;
- preserves the existing `invalid_request`, `auth/unauthorized`, and `forbidden` codes;
- preserves the existing membership and active-organization checks;
- preserves the `crm_active_org` cookie behavior.

No authorization semantics were changed.

### 6. Reuse-first / anti-slop rule

Added byte-identical rules at:

- `.claude/rules/ai-code-quality.md`
- `.agents/rules/ai-code-quality.md`

The rule requires agents to search before creating helpers/types/schemas/services, prohibits a third implementation when two apps already contain equivalent behavior, defines an abstraction budget, rejects confident empty-state fallbacks for unexpected failures, requires explicit compatibility reasons/removal conditions, and adds a diff-level duplicate/residue review gate.

## Compatibility decisions

The deprecated `CreateRequestNoteInput.internal` compatibility field remains in place.

Although in-repo application callers now use `visibility`, the CRM API schema/repository still intentionally accepts `internal`. It is part of an established public contract, so removing it without a coordinated compatibility migration would violate the repository's API compatibility rules. This report records it as known compatibility residue rather than silently deleting it.

## Deliberately deferred findings

### Prisma client bootstrap duplication

`apps/api`, `apps/billing-api`, and `apps/couriers-api` contain very similar Prisma/Accelerate construction code. This was not centralized in this connector-only pass because database-client changes require the affected services' typecheck, boundary, test, and build gates, and the services also differ in generated clients/runtime constraints.

Recommended follow-up: extract only construction policy after local executable verification; do not share a generated Prisma client across databases.

### Cross-app organization-routing semantics

Billing, CRM, Invoice, Couriers, and Enterprise repeat portions of membership loading/filtering/active-organization selection. Centralizing this is directionally desirable, but it affects authorization/session behavior and therefore needs a dedicated security-sensitive implementation with regression coverage.

Recommended follow-up: identify the platform-owned invariant versus app-owned selection/cookie policy before extracting anything.

### Core access catch-to-empty behavior

Several core access helpers catch and return `[]`/`false`. Some of that is correct fail-closed authorization; some may hide infrastructure/programming failures.

Recommended follow-up: classify expected negative states separately from unexpected exceptions, retain fail-closed security, and preserve observability for genuine failures.

## Verification performed in this GitHub connector session

- read root `CLAUDE.md` and the applicable CLI, execution, tracker, git, type, code-style, data-fetching, API-backend, API-contract, access-tier/control, SDK, and app-structure rules;
- created the feature branch directly from current `main`;
- compared the branch against `main` during implementation;
- re-read the edited CRM API/CRM contract files after writes;
- confirmed no new `eslint-disable`, `as any`, compatibility aliases, or type-escape casts were introduced by the implementation;
- confirmed the main code changes are net-consolidating rather than parallel additions.

## Verification not executable from this connector

No local package manager/runtime is exposed through the GitHub connector, so this session could not execute pnpm/TypeScript/Vitest/ESLint commands directly.

The required local/CI verification is:

```bash
pnpm install --lockfile-only
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm lint
pnpm --filter @876/crm test
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm-api build
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
```

Because `apps/crm-api/package.json` gained a workspace dependency, a local `pnpm install` should refresh `pnpm-lock.yaml` if the importer section is tracked there. The lockfile was intentionally not hand-edited without package-manager execution.

## Files changed

- `.agents/rules/ai-code-quality.md`
- `.claude/rules/ai-code-quality.md`
- `.claude/tracker/implementation_plan.md`
- `apps/crm-api/package.json`
- `apps/crm-api/src/modules/requests/requests.schemas.ts`
- `apps/crm-api/src/types/request.ts`
- `apps/crm/src/app/api/auth/switch-org/route.ts`
- `apps/crm/src/types/auth.ts`
- `packages/crm/package.json`
- `packages/crm/src/contracts.ts`
- this report

## Outcome

The branch fixes the highest-confidence slop identified in the scan without introducing a new framework: one CRM contract owner, fewer duplicated domain declarations, one established response-envelope implementation, and explicit procedural rules aimed at preventing future agents from recreating existing platform behavior.
