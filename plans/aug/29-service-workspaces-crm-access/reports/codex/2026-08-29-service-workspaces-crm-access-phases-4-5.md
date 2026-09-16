# Service Workspaces + CRM Access — Phases 4–5 Implementation Report

Date: 2026-08-29

Branch: `feature/crm-request-intake-modules`

Base: `main` at `d7d01653270041dad2ed11509df8435c892ba55a`

Pull request: #434

## Status

Phases 4–5 are implemented on the branch. The CRM request provenance model is now expressed as one canonical channel axis, request-form intake can identify hosted/embedded/integration channels, Console can ensure the platform CRM support fixture through the workspace control plane, and CRM now publishes stable module and integration-scope catalogs.

The Prisma migration is committed but was deliberately **not applied**. Database migration and runtime verification remain for the local checkout, as requested.

## What changed

### 1. Canonical request channel

The old `RequestSource` database enum and `Request.source` column are replaced by a single canonical `RequestChannel` / `Request.channel` contract.

Canonical values:

- `FORM`
- `WIDGET`
- `CHAT`
- `EMAIL`
- `API`
- `AGENT`

This deliberately avoids adding a second provenance field beside `source`. A request has one answer to “through which channel did this request enter CRM?” rather than two overlapping source/channel concepts.

Direct CRM/operator-created requests default to `AGENT`.

Request-form submissions resolve their default channel from placement:

- `HOSTED` request form -> `FORM`
- `EMBEDDED` request form -> `WIDGET`

Integrations may explicitly identify `CHAT`, `EMAIL`, or `API` when submitting through the request-form intake contract.

### 2. Data migration

Migration:

`apps/crm-api/prisma/migrations/20260829193000_request_channel_support_intake/migration.sql`

The migration:

1. creates the `RequestChannel` enum;
2. adds nullable `Request.channel` temporarily;
3. backfills every existing request from the old `Request.source` value;
4. sets the new column `NOT NULL` with default `AGENT`;
5. drops `Request.source`;
6. drops the old `RequestSource` enum;
7. adds `RequestForm.provisioningKey`;
8. adds a tenant-scoped unique index for provisioned request forms.

Backfill mapping:

| Old source | New channel |
| ---------- | ----------- |
| `WEB`      | `FORM`      |
| `EMAIL`    | `EMAIL`     |
| `CHAT`     | `CHAT`      |
| `API`      | `API`       |
| `CRM`      | `AGENT`     |
| `PHONE`    | `AGENT`     |
| `OTHER`    | `AGENT`     |

`PHONE` and `OTHER` are intentionally folded into `AGENT` rather than preserved as permanent canonical channels. A future telephony integration can introduce a dedicated channel as an explicit contract change if the product genuinely needs it.

No migration was executed by this implementation session.

### 3. Request API + SDK contract

The CRM API request schemas, repository, service, Prisma schema, and shared `@876/crm` resource client now use `channel`.

A dedicated request contract was introduced in `packages/crm/src/request-types.ts`, and the requests resource consumes that contract directly. The public `@876/crm` barrel exports `RequestChannel` and the channel-shaped request inputs/results.

The older request-source declarations still exist inside the broad legacy `packages/crm/src/types.ts` file for now, but they are no longer exported as the canonical request contract and `packages/crm/src/resources/requests.ts` no longer imports request create/update/response types from that legacy block. This keeps this phase focused while removing the old shape from active request data-plane usage.

### 4. Request-form intake channels

`SubmitRequestFormInput` now supports an optional explicit channel suitable for app integrations.

The API resolves intake provenance with this rule:

```text
explicit channel
    ?? (placement === EMBEDDED ? WIDGET : FORM)
```

This means ordinary hosted and embedded forms do not need each consuming app to manually stamp provenance, while CHAT/EMAIL/API integrations can identify themselves without introducing a second request-source model.

### 5. Provisioned request forms

`RequestForm` now has a nullable `provisioningKey`, unique per tenant when present.

The request-form repository/service includes an idempotent provisioned-form path. A system fixture can therefore create a form once and subsequently find the same logical form without relying on a mutable display name or slug.

### 6. Platform-only `876 Support` fixture

The branch adds the `876_SUPPORT` CRM workspace fixture.

It is **not** part of the normal `876-crm` customer provisioning manifest. This is intentional: every CRM customer must not receive an Efesto/876 internal support form.

The fixture is requested by Console for the configured platform organization and reuses the normal provisioned CRM resources:

- priority provisioning key: `normal`
- category provisioning key: `support`
- request-form provisioning key: `876-support`

The form is created as:

- name: `876 Support`
- slug: `876-support`
- placement: `EMBEDDED`
- status: published by the provisioning path
- subject field mapped to `REQUEST_SUBJECT`
- long-text details field mapped to `REQUEST_DESCRIPTION`
- default category: Support
- default priority: Normal
- confirmation title: `Request received`

The fixture lookup short-circuits when the provisioned support form already exists, so loading Console `/requests` does not continually recreate/rewrite the fixture.

### 7. Workspace control plane

CRM workspace lifecycle operations remain separate from business-data CRUD.

The shared client composition now exposes CRM workspace preparation through the Console workspace control plane, while request/customer/task/note resources remain on the flat business data plane.

Conceptually:

```text
$876.requests.*                -> CRM business data
workspace.crm.ensure(...)      -> CRM workspace/fixture preparation
```

Ensuring a CRM workspace or fixture does not grant an `876-crm` product entitlement.

Console `/requests` uses this workspace-control-plane path for the platform organization support workspace.

### 8. CRM module catalog

A canonical CRM module catalog was added with the following keys:

- `requests` (structural, not optional)
- `tasks`
- `reminders`
- `notes`
- `teams`
- `categories`
- `request_forms`
- `reports`

The keys intentionally match the CRM permission-catalog module keys, so
`<module>.view` / `<module>.edit` already gate each module's settings page.

The catalog is a **strict subset** of the permission catalog. Three permission
modules are deliberately not org-toggleable, and `CRM_EXCLUDED_MODULE_KEYS`
records that decision:

- `customers` is the shared org-customer registry, not a CRM-owned area an
  organization can switch off (`.claude/rules/customer-architecture.md`);
- `priorities` is structural — every request carries a non-null priority;
- `settings` is where modules are toggled, so it cannot toggle itself.

Anti-drift tests verify the module catalog and the permission catalog do not
silently diverge in either direction: every module key must exist in the
permission catalog, and every permission module must appear in either the
toggleable list or the excluded list.

Every module is enabled by default, so an organization that never opens Settings
has a working CRM. No customer-facing module-toggling UI is introduced here.

### 9. CRM integration scopes

The stable integration scope vocabulary added in this phase is:

- `crm.requests.read` / `crm.requests.write`
- `crm.customers.read` / `crm.customers.write`
- `crm.tasks.read` / `crm.tasks.write`
- `crm.reminders.read` / `crm.reminders.write`
- `crm.notes.read` / `crm.notes.write`
- `crm.teams.read` / `crm.teams.write`
- `crm.categories.read` / `crm.categories.write`
- `crm.priorities.read` / `crm.priorities.write`
- `crm.request_forms.read` / `crm.request_forms.write`
- `crm.reports.read`

The scope vocabulary is derived from the **permission** catalog, not the module
catalog — an integration may read a customer or a priority even though neither
is an org-toggleable module. `settings` is deliberately absent: an integration
never reconfigures the workspace it is integrating with, and `reports` is
read-only for the same reason. Tests assert every scope names a module the CRM
permission catalog defines, that every scope is `crm.`-prefixed, and that
`crm.reports.write` does not exist.

This phase establishes the vocabulary/contract. It does not add separate CHAT, EMAIL, or API connector products or OAuth grant storage.

### 10. Console + CRM UI

Both Console and the standalone CRM request surfaces were migrated from Source terminology/value handling to the canonical channel contract.

This includes:

- request create/edit values;
- request list rows;
- request detail asides;
- display formatting;
- channel icons;
- Console CRM type exports;
- standalone CRM type exports.

The UI no longer offers the legacy `CRM`, `PHONE`, `WEB`, or `OTHER` values for new request creation.

## Tests added

17 focused tests were authored in this branch.

### Module and integration-contract tests — 10

`packages/crm/src/modules.test.ts`

Covers:

1. the exact CRM-owned module set;
2. unique/stable module keys;
3. structural modules being enabled and non-optional;
4. exact module-key drift against the permission catalog;
5. a `<module>.view` permission for every module;
6. the exact integration-scope list;
7. integration-scope uniqueness;
8. known-scope parsing;
9. rejection of malformed/cross-service scopes;
10. integration modules remaining a subset of CRM modules.

### Request-channel tests — 7

`packages/crm/src/request-types.test.ts`

Covers:

1. all six canonical channels;
2. rejection of the legacy `CRM`, `WEB`, `PHONE`, and `OTHER` source values;
3. optional channel on create so server defaulting remains possible;
4. explicit `AGENT` create input;
5. channel updates;
6. serialized request shape using `channel` rather than `source`;
7. request-form integration submission accepting an explicit `CHAT` channel.

These tests were authored but not executed in this connector-only session.

## Changed areas

At the point this report was written, the implementation changed 47 code/config files before adding this report itself. The branch is based directly on the current `main` merge commit and is not behind `main`.

Major file groups:

### Console

- `apps/console/src/app/(app)/requests/layout.tsx`
- `apps/console/src/features/crm/**`
- `apps/console/src/lib/platform-org.ts`

### CRM API / Prisma

- `apps/crm-api/prisma/migrations/20260829193000_request_channel_support_intake/migration.sql`
- `apps/crm-api/prisma/schema/form.prisma`
- `apps/crm-api/prisma/schema/request.prisma`
- `apps/crm-api/src/modules/request-forms/**`
- `apps/crm-api/src/modules/requests/**`
- `apps/crm-api/src/modules/tenants/**`
- `apps/crm-api/src/provisioning/fixtures.ts`
- `apps/crm-api/src/types/provisioning.ts`
- `apps/crm-api/src/types/request-form.ts`
- `apps/crm-api/src/types/request.ts`

### Standalone CRM app

- `apps/crm/src/app/(app)/requests/**`
- `apps/crm/src/types/crm.ts`

### Shared client / CRM SDK

- `packages/client/src/composers/console.ts`
- `packages/client/src/composers/control-planes.ts`
- `packages/client/src/index.ts`
- `packages/client/src/internal/create-service-clients.ts`
- `packages/client/src/internal/types.ts`
- `packages/crm/package.json`
- `packages/crm/src/index.ts`
- `packages/crm/src/integration-scopes.ts`
- `packages/crm/src/modules.ts`
- `packages/crm/src/request-form-types.ts`
- `packages/crm/src/request-types.ts`
- `packages/crm/src/resources/requests.ts`
- `packages/crm/src/workspace.ts`

### Tests

- `packages/crm/src/modules.test.ts`
- `packages/crm/src/request-types.test.ts`

## Verification performed from the GitHub connector

- confirmed branch base is exactly `main` commit `d7d01653270041dad2ed11509df8435c892ba55a`;
- confirmed the branch is ahead of and not behind that `main` base;
- reviewed the complete changed-file list and compare metadata;
- re-read the request-form intake service on the branch after the implementation writes;
- confirmed the active request SDK resource imports the new `request-types.ts` contract;
- confirmed the migration contains the explicit legacy-source backfill mapping;
- confirmed the two new test files contain 17 focused tests;
- opened PR #434 against `main`.

## Local completion pass — 2026-08-29

The connector session could not run anything. A local checkout then applied the
migration, closed the gaps that only execution reveals, and ran every gate.

### Migration applied

`20260829193000_request_channel_support_intake` is applied to the CRM database.
Verified directly against Postgres afterwards:

- `crm_requests.channel` is `NOT NULL DEFAULT 'AGENT'`;
- `crm_requests.source` and the `RequestSource` type are gone;
- the `RequestChannel` enum holds exactly the six canonical values;
- the eight existing rows backfilled to 1 × `FORM` (from `WEB`) and 7 × `AGENT`;
- reading `channel` back through the regenerated Prisma client returns the
  mapped values.

`prisma migrate diff` against the live database reports only three **pre-existing**
differences unrelated to this branch (two truncated index names and a
`crm_request_priorities.updated_at` default, all from the previous PR's
migration). They are called out here rather than folded silently into this change.

### Gaps closed in this pass

1. **`prisma.config.ts` pointed migrations at the pooled Neon endpoint.** Every
   other service in the repo uses the direct endpoint for `migrate`/`db`/`studio`,
   because Neon's pooler is transaction-mode PgBouncer and cannot hold Prisma's
   advisory locks (`.claude/rules/navigation-performance.md` §4). CRM now follows
   the same pattern, and `CRM_DIRECT_DATABASE_URL` is declared in `.env.example`.
2. **`pnpm-lock.yaml` did not carry `@876/settings`.** Regenerated; the diff is
   three lines.
3. **The legacy request contract still existed in `packages/crm/src/types.ts`** —
   a second `crmRequestSchema`, `requestListSchema`, `CrmRequest`, `RequestList`,
   `RequestStatus`, `ListRequestsQuery`, `CreateRequestInput`, and
   `UpdateRequestInput`, all still shaped around `source`. This was not
   "unrelated legacy": it was a competing definition of the same contract. It is
   deleted, and `request-types.ts` is now the single source.
4. **`resources/request-form-requests.ts` still validated against that legacy
   schema.** It imported `requestListSchema` from `../types`, so listing a
   customer's requests through the request-form path failed response validation
   the moment the API started returning `channel`. This was the live
   `[crm/invalid-response] … path: ['channel']` error seen in dev. Now imports the
   canonical schema.
5. **`apps/crm/src/app/api/support/route.ts` still sent `source: 'WEB'`.** The
   in-product support widget now sends `channel: 'WIDGET'`, matching the
   embedded-placement rule the rest of the branch establishes.
6. **`apps/console/.../crm/components/request-manager.tsx` (626 lines) was dead
   code with its own hand-rolled copy of the request record**, including
   `source: string` and a `priority` string union that the contract had already
   replaced with a priority object. Nothing imported it — which is exactly why
   the migration did not catch it. Deleted.
7. **`ensureProvisioned` for request forms had a read-then-create race.** Console
   ensures the fixture on every `/requests` render, so two concurrent cold loads
   could both read nothing and both insert, and the loser would 500 on the
   tenant-scoped unique index. It now catches `P2002` and re-reads the winner —
   the same pattern `tenants.repository.ensure` already uses.
8. **The Console `/requests` layout awaited the fixture ensure.** A layout that
   awaits data suspends into the _parent_ segment's boundary, so every
   `/requests` click was held on the previous screen behind a provisioning write
   (`.claude/rules/navigation-performance.md` §2). The guard still blocks, as it
   must; the fixture now renders behind its own `<Suspense>` boundary and returns
   nothing.
9. **The module-catalog omissions were undocumented drift.** `customers`,
   `priorities`, and `settings` are now recorded in `CRM_EXCLUDED_MODULE_KEYS`
   with the reasoning, and a test fails if a permission module ever appears in
   neither list.
10. **Every remaining `source` fixture across four packages** was migrated to
    `channel`, including a schema test that asserted the old enum.

### Tests

35 tests were added or rewritten in this pass, on top of the 17 authored
remotely — the remote 17 had never been executed, and two of them did not
compile (a wrong `@876/core/access` import path, and the retired-axis assertion
which the strict schema rejects outright rather than stripping).

New coverage:

- `apps/crm-api/src/provisioning/fixtures.advanced.test.ts` — 7 tests. The 876
  Support fixture had **zero** coverage; this covers the no-fixture path, the
  tenant it provisions against, the canonical field mappings, the
  already-provisioned short-circuit, soft-deleted repair, de-duplication of a
  repeated fixture request, and that an unexpected failure is not swallowed.
- `apps/crm-api/.../request-forms.provisioning.test.ts` — 7 tests covering
  `ensureProvisioned` including both sides of the concurrency race.
- `tenants.service.advanced.test.ts` — 4 tests: fixtures are not ensured when
  none are requested, are ensured against the resolved tenant, work without a
  manifest, and are **not** ensured when provisioning failed.
- `requests/layout.test.tsx` — 3 tests proving the fixture stays off the
  navigation critical path.
- `packages/crm/src/modules.test.ts` — 8 tests for two-way catalog drift, the
  recorded exclusions, and scope/permission-catalog coherence.

### Gates run locally

| Gate                                   | Result                         |
| -------------------------------------- | ------------------------------ |
| `@876/crm` typecheck / test            | clean / 227 passed             |
| `@876/crm-api` typecheck / test / lint | clean / 701 passed / 0 errors  |
| `@876/crm-app` typecheck / test / lint | clean / 142 passed / 0 errors  |
| `@876/console` typecheck / test / lint | clean / 1315 passed / 0 errors |
| `@876/client` test                     | 48 passed                      |
| `@876/core` test                       | 935 passed                     |
| `@876/settings` test                   | 62 passed                      |
| `node scripts/check-app-structure.mjs` | OK                             |
| `prettier --check` on changed files    | clean                          |

`pnpm --filter @876/client typecheck` fails on
`packages/core/src/fetch/bridge.ts` (`Property 'entries' does not exist on type
'Headers'`). That failure reproduces on `origin/main` unchanged and is **not**
from this branch.

### Still requiring a dev-server restart

The running CRM API holds the pre-migration Prisma client in memory, so it
serializes `channel` as `undefined` until restarted. Reading through a freshly
generated client returns the correct values, so this is a process-lifetime
issue rather than a code one.

## Deliberately deferred

The following are not part of this PR:

- rolling the CRM support fixture out to every customer tenant;
- granting product entitlement as a side effect of service-workspace creation;
- implementing the same embedded support pattern in Careers or other product apps;
- building concrete chat/email connector routes beyond the intake channel contract;
- adding OAuth/grant persistence for the CRM integration scopes;
- making every CRM module optional or building module-management UI;
- rolling the `ensureProvisioned` race guard back through the pre-existing
  priority/category provisioning paths, which share the same read-then-create
  shape from the previous PR;
- the three pre-existing `prisma migrate diff` differences noted above.

The legacy request declarations in `packages/crm/src/types.ts` were **not**
deferred — see the local completion pass above. They were the same contract, not
an unrelated one.

Those are follow-on changes and should not be smuggled into the provenance/migration change.

## Pull request handoff

PR #434 contains the implementation. The branch is intentionally ready for a local migration/test pass rather than claiming that database verification occurred remotely.
