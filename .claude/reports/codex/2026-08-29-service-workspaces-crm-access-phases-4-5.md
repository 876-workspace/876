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
| --- | --- |
| `WEB` | `FORM` |
| `EMAIL` | `EMAIL` |
| `CHAT` | `CHAT` |
| `API` | `API` |
| `CRM` | `AGENT` |
| `PHONE` | `AGENT` |
| `OTHER` | `AGENT` |

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

- `requests`
- `customers`
- `tasks`
- `reminders`
- `notes`
- `teams`
- `categories`
- `priorities`
- `request_forms`
- `reports`
- `settings`

The keys intentionally match the CRM permission-catalog module keys. Anti-drift tests verify the settings/module catalog and permission catalog do not silently diverge.

All modules in this phase are structural/default-enabled. No new customer-facing module toggling UI is introduced here.

### 9. CRM integration scopes

The stable integration scope vocabulary added in this phase is:

- `crm.requests.read`
- `crm.requests.write`
- `crm.customers.read`
- `crm.customers.write`
- `crm.request_forms.read`
- `crm.request_forms.write`
- `crm.notes.read`
- `crm.notes.write`
- `crm.tasks.read`
- `crm.tasks.write`
- `crm.reminders.read`
- `crm.reminders.write`

The scope catalog is intentionally narrower than the full CRM module catalog. Teams, categories, priorities, reports, and settings are not automatically exposed as third-party integration scopes simply because they exist as product modules.

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

## Verification deliberately not performed

This ChatGPT GitHub connector session does not provide an authenticated repository checkout or the CRM database. Therefore the following were not represented as passing when they were not actually run:

- Prisma migration execution;
- Prisma schema generation/validation in the checkout;
- TypeScript typechecks;
- Vitest execution;
- ESLint;
- Next.js builds;
- runtime request submission against a real CRM tenant.

The migration was intentionally left unapplied for the local checkout.

### Lockfile note

`packages/crm/package.json` adds `@876/settings` as a workspace dependency because the CRM module catalog uses the shared module-catalog implementation. The GitHub-connector implementation did not regenerate `pnpm-lock.yaml`. If the checkout enforces `pnpm install --frozen-lockfile`, refresh the lockfile with the repository's normal pnpm workflow before merge and include that generated lockfile change. This report calls this out explicitly rather than claiming dependency-install verification that did not occur.

## Suggested local verification

After pulling the branch, use the repository-standard pnpm workflow and then run the CRM-focused checks. At minimum:

```bash
pnpm install
pnpm --filter @876/crm-api db:generate
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api test
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
```

Then run the migration using the local-development migration path you normally use for CRM. The CRM API package currently exposes `db:migrate` for Prisma migrate dev and `db:deploy` for deployment migrations; use the local-development command for the local database rather than treating this report as authorization to change production.

After the migration, verify at least:

1. existing requests retain the expected mapped channel;
2. direct new CRM requests are `AGENT` unless explicitly overridden by a supported integration path;
3. hosted form submissions become `FORM`;
4. embedded form submissions become `WIDGET`;
5. explicit integration intake can create `CHAT`, `EMAIL`, and `API` requests;
6. Console `/requests` ensures the platform CRM workspace/support fixture without creating an `876-crm` entitlement;
7. exactly one `876 Support` form exists for the platform tenant;
8. ordinary customer CRM tenant provisioning does not receive the platform-only `876 Support` fixture.

## Deliberately deferred

The following are not part of this PR:

- rolling the CRM support fixture out to every customer tenant;
- granting product entitlement as a side effect of service-workspace creation;
- implementing the same embedded support pattern in Careers or other product apps;
- building concrete chat/email connector routes beyond the intake channel contract;
- adding OAuth/grant persistence for the CRM integration scopes;
- making every CRM module optional or building module-management UI;
- deleting unrelated legacy declarations from the broad historical `packages/crm/src/types.ts` file.

Those are follow-on changes and should not be smuggled into the provenance/migration change.

## Pull request handoff

PR #434 contains the implementation. The branch is intentionally ready for a local migration/test pass rather than claiming that database verification occurred remotely.
