# Brief: merge the Estimate document type into Quote

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## Context

`Estimate` and `Quote` are two **duplicate** document types in 876 Billing:
separate tables, routes, SDK resources, and app sections, with field-for-field
identical models and identical status enums. The product decision (user,
2026-09-07) is to keep **Quote** and remove Estimate entirely, with
**no backward compatibility** — no route aliases, no SDK aliases, no deprecated
re-exports.

Pull before you start and again before you finish.

## The migration is already written — do not write another

`apps/billing-api/prisma/migrations/20260907120000_merge_estimates_into_quotes/migration.sql`
already exists and was authored and reviewed by the orchestrator. **Read it
first**, treat it as the contract for the schema end-state, and do not modify,
regenerate, or replace it. Do **not** run `prisma migrate` against any database.

It: fails closed on number/id/ambiguous-invoice collisions, copies
`billing_estimates` → `billing_quotes` and `billing_estimate_lines` →
`billing_quote_lines` preserving ids, repoints `billing_invoices.quote_id` from
`estimate_id` and drops that column, drops both estimate tables and the
`BillingEstimateStatus` enum, and moves the accounting-sync triggers onto the
quote tables.

## The one thing that is easy to get catastrophically wrong

**The accounting-sync document kind `'estimate'` must NOT be renamed.**

`'estimate'` in `apps/billing-api/src/providers/accounting/**` and
`apps/billing-api/src/modules/accounting-providers/**` is **Zoho Books' own
resource name** (`/estimates`, `responseKey: 'estimate'`). Zoho has no "quotes".
`.claude/rules/naming.md` puts external provider payload fields and values on
the hard no-rename list, and requires provider spelling to be preserved at its
boundary.

So: after the merge, an 876 **Quote** syncs to Zoho as an **estimate**. The
`AccountingDocumentKind` union keeps its `'estimate'` member, the outbox rows
keep `document_kind = 'estimate'`, and the Zoho adapter keeps its `estimates`
capability and `/estimates` path. Only the 876-side table and model change.

If you rename that kind, Zoho sync breaks silently. Do not.

Equally: `estimatedDuration` and similar fields in `apps/work-api`,
`apps/projects-api`, `apps/projects-mcp`, `packages/projects-ui`, and Console's
projects/issues routes are **time estimates** and completely unrelated. Do not
touch any of them.

## Scope

### 1. Prisma schema

- Delete `apps/billing-api/prisma/schema/estimate.prisma` and
  `estimate-line.prisma`.
- Remove `EstimateStatus` from `enums.prisma`.
- Remove the `estimateId` field, the `estimate` relation, and the
  `EstimateConvertedInvoice` relation name from `invoice.prisma`.
- Remove the `Estimate` / `EstimateLine` back-relations from `Tenant`,
  `Customer`, `PriceList`, `Item`, and `Price`. Grep for `Estimate` across
  `prisma/schema/` and clear every hit.
- Regenerate the Prisma client (`pnpm --filter @876/billing-api generate` or
  the workspace's equivalent — check `package.json`). Generating the client is
  fine; **running a migration is not**.
- `pnpm --filter @876/billing-api db:validate` must pass.

### 2. `apps/billing-api`

- Delete `src/modules/documents/repositories/estimates/**`,
  `src/modules/documents/schemas/estimate.ts`, and every estimate controller,
  service, serializer, and route registration (the resource registration sits
  at `documents.routes.ts:201`, and there is an integration-tier block for
  estimates too — grep for `estimate` across the module).
- Remove `ESTIMATE: 'EST'` from `document-numbers.repository.ts`. Existing
  migrated rows keep their `EST-` numbers; that is correct and must not be
  rewritten.
- In `accounting-providers/**` and `providers/accounting/**`: keep the
  `'estimate'` kind exactly as it is, but change what it **reads from** — the
  sync must now load a Quote where it previously loaded an Estimate. Keep the
  outbox ordering (`WHEN 'estimate' THEN 2`) unchanged.
- Delete the estimate tests, and update any shared document test that
  enumerates document types.

### 3. `packages/billing`

- Delete the `estimates` resource from `src/resources/quotes.ts` and its types
  from `src/types/**` and `src/integration/types/**`. **No deprecated alias.**
- Remove the `/estimates` entry from `src/navigation.ts:67`.

### 4. Apps

- Delete `apps/billing/src/app/(app)/(sales)/estimates/` entirely, plus its
  client module, types, and any nav entry that points at it.
- Grep both `apps/billing` and `apps/invoice` for `estimate` and clear every
  Billing-domain hit. Leave unrelated words (`estimated`, time estimates) alone.
- If a route or nav item is removed, make sure nothing still links to it.

### 5. Do not build convert-to-invoice

It is deliberately out of scope. `billing_invoices.quote_id` and the
`QuoteConvertedInvoice` relation survive the merge; leave them wired as they
are.

## Tests — minimum 12 `it()` cases

Per `.claude/rules/testing.md`.

- Accounting sync (≥5): a Quote enqueues an outbox row with `document_kind`
  exactly `'estimate'`; the Zoho adapter still resolves that kind to its
  `/estimates` path with `responseKey: 'estimate'`; a quote **line** enqueues
  the child sync under the same kind; outbox ordering for `'estimate'` is still
  2; the kind union still contains `'estimate'`.
- Quote repository/service (≥4): a quote created after the merge round-trips
  with lines; the `Q` number prefix still applies; deleting a quote cascades its
  lines; an invoice converted from a quote still resolves its source.
- Absence (≥3): `/api/v1/estimates` is no longer registered; the OpenAPI
  document contains no `estimate` operationId; `@876/billing` exports no
  `estimates` resource.

## Verification (run and report real output)

```
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

`api:contract:check` will report the removed estimate operations. That is the
intended change — say so in your report rather than trying to keep them.

## Do not

- Do not rename the accounting `'estimate'` document kind or any Zoho field.
- Do not touch `estimatedDuration` or anything in work/projects.
- Do not modify or re-generate the migration SQL.
- Do not run `prisma migrate` against a database.
- Do not leave a compatibility alias, a deprecated re-export, or a redirect.
- Do not rewrite existing `EST-` document numbers.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-merge-estimates-into-quotes.md`
— every file deleted and changed, the **counted** `it()` total, real
verification output, the `api:contract:check` diff, and anything you could not
verify.
