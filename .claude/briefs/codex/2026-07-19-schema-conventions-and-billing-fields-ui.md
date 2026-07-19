# GOAL RUN — complete ALL remaining branch work in this single session

You are gpt-5.6-sol working in `/workspaces/876` on branch
`feature/shared-customers-items`. **This is your explicit goal statement: do NOT
stop, do NOT ask questions, do NOT end early — work through every goal below in
order until all are complete and verified, then write your completion summary.**
If a goal is genuinely impossible, write down exactly why in your summary and
continue to the next goal. **Do not commit** — the orchestrator commits.

Another agent is concurrently editing `apps/couriers/src/**`, `apps/couriers/package.json`,
and possibly `packages/ui/src/components/resource-toolbar.tsx`. **You must not
touch those paths.** Your exclusive scope: `apps/billing/**`,
`apps/couriers/prisma/**`, `.claude/rules/**` + `.agents/rules/**` (goal 4 only).

Follow `.agents/rules/code-style.md`, `.agents/rules/types.md`,
`.agents/rules/testing.md`. Read every file before editing it.

## Context

- The billing Prisma schema was just split into one-model-per-file under
  `apps/billing/prisma/schema/` (uncommitted — preserve it exactly; never
  re-merge files).
- This branch already added customer fields `customerNumber` (+
  `@@unique([tenantId, customerNumber])`), `website`, `notes`,
  `taxRegistrationNumber`, a `CustomerImportReceipt` model, an import service
  (`apps/billing/src/lib/service/customers/import.ts`), and integration routes.
  All billing tests (980) currently pass — keep them passing.
- The live dev database already has all migrations applied
  (`npx prisma migrate deploy` from `apps/billing`; a known shadow-DB issue
  means `migrate dev` may fail — use `migrate diff` + hand-written migration
  SQL + `migrate deploy`, the workflow the previous task used).

## Goal 1 — Prisma conventions pass on `apps/billing/prisma/schema/` (all files)

Bring every model to these conventions **without changing runtime behavior**:

1. **Named uniques/indexes.** Every `@@unique`/`@@index` gets an explicit
   `map:` pinned to the EXACT current database constraint/index name (Prisma
   default naming `<table>_<cols>_key` / `<table>_<cols>_idx` unless the model
   already declares otherwise) so `prisma migrate diff --from-schema-datamodel
prisma/schema --to-url $BILLING_DATABASE_URL` (direction such that it
   compares schema vs live DB) reports NO changes for naming. Multi-column
   uniques used in code via compound `where` keys also get a `name:` client
   identifier ONLY where one already exists or where adding one does not break
   existing generated-client call sites — do not rename any client identifier
   already referenced in `src/**` (grep first).
2. **Named FK constraints.** Every `@relation` gets `map:` pinned to the
   current DB FK name (Prisma default `<table>_<column>_fkey` pattern). Zero
   DDL drift is the acceptance test.
3. **Explicit referential actions.** Every relation declares explicit
   `onDelete`/`onUpdate` matching CURRENT semantics (Prisma defaults: required
   FK → onDelete: Restrict? No — Prisma's default for required is `Restrict`
   on delete / `Cascade` on update at the client level; verify with `migrate
diff` that your explicit values are no-ops; where a default is emulated
   client-side only, keep it identical). If making a value explicit produces
   DDL drift, revert to implicit for that relation and note it.
4. **Missing FK-column indexes.** Identify FK columns lacking any index
   (standalone or as the leading column of a composite). Add `@@index` for
   them, named per the convention. These ARE additive DDL: collect them into
   ONE new migration `2026…_billing_schema_index_hardening/migration.sql`
   (CREATE INDEX only; use plain CREATE INDEX, not CONCURRENTLY, dev DB is
   small), apply with `migrate deploy`.
5. After the pass: `npx prisma validate`, regenerate the client with the
   app's generate script, and confirm `prisma migrate diff` between schema and
   live DB is empty.

## Goal 2 — same conventions pass on `apps/couriers/prisma/schema/`

Identical treatment (named map: on uniques/indexes/FKs pinned to current DB
names, explicit onDelete/onUpdate as no-ops, missing FK indexes in one additive
migration). The couriers DATABASE_URL is in `apps/couriers/.env`. Use the same
diff-must-be-empty acceptance test. Do NOT touch `apps/couriers/src/**` or
`apps/couriers/package.json`.

## Goal 3 — expose the new customer fields in the Billing app's own UI

In `apps/billing/src/app/(app)/customers/` (workspace/tenant UI, NOT the
integration API):

- Customer create/edit form(s): add inputs for Customer number, Website, Tax
  registration number, Notes — matching the form's existing field components,
  labels short, no placeholder prose. Wire them through the existing page/route
  submission path (inspect how current fields flow to `service.customers.create`
  / `update` — the service already accepts the four fields).
- Customer detail view: display the four fields (em-dash when null) in the
  existing detail layout style.
- Customers list page: add a Number column (customerNumber, em-dash when null)
  if the table layout accommodates it cleanly; skip if the table is already
  dense and note the skip.
- Add/extend tests following the app's existing page/service test patterns.

## Goal 4 — rule-file drift fixes (small, last)

Fix the two documented drifts, editing BOTH `.claude/rules/` and
`.agents/rules/` copies byte-identically:

- `app-layout.md`: `PageBreadcrumb` now lives centrally in `@876/ui/page`
  (`packages/ui/src/components/page.tsx`); Couriers has no app-local copy.
  Correct the component-path claims.
- `list-filter-header.md`: the `StatusFilterOption` type excerpt omits the
  implemented `headingLabel?: string` field
  (`apps/console/src/components/status-filter-heading.tsx`). Update the excerpt.

## Verification (ALL must pass before you finish)

```
cd /workspaces/876/apps/billing && npx prisma validate
cd /workspaces/876/apps/couriers && npx prisma validate
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
```

(Do NOT run couriers typecheck/test — the other agent owns that tree's source.)

## Completion summary requirements

End with: per-goal status (done/partial/skipped + why), files touched, every
migration created and whether deployed, any relation where explicit actions
caused drift and were reverted, and anything the orchestrator must re-verify.
