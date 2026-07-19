# Implement: Couriers customer management UI — toolbar parity, status filter, add page, CSV import wizard, items parity

You are gpt-5.6-sol implementing in `/workspaces/876`. **Do not commit.** Follow
`.agents/rules/code-style.md`, `.agents/rules/types.md`, `.agents/rules/testing.md`,
`.agents/rules/toolbar.md`, `.agents/rules/list-filter-header.md`,
`.agents/rules/app-layout.md` (labels are bare verbs; blue `info` primary; **no
green buttons**; no wordy `PageDescription` prose under headings). Read files
before editing.

## Goal

Bring the Couriers staff Customers and Items pages up to the platform design
system (Zoho-style filterable title heading + `ResourceToolbar`), add customer
creation, and ship a CSV bulk-import wizard — all reading/writing the shared
Billing customer plane through `getFinanceClient()` (`apps/couriers/src/lib/finance/client.ts`).
A just-completed billing task added the server + client surface you need; its
contract is restated below — inspect `packages/billing/src/integration/`
(`types.ts`, `resources/customers.ts`, `schemas.ts`) to confirm exact names
before coding against it.

## New `@876/billing` integration surface available to you

- `finance.customers.list(orgId, { limit, starting_after, ending_before, status })`
  — `status?: 'active' | 'archived'`.
- Customer objects now include `customerNumber`, `website`, `notes`,
  `taxRegistrationNumber` (all `string | null`).
- `finance.customers.create(orgId, params, { idempotencyKey })` accepts those
  four fields too.
- `finance.customers.import(orgId, params, options?)`:
  `params = { dryRun?, duplicateStrategy: 'skip' | 'update', rows: [...] }`,
  rows are per-CSV-row customer payloads (`rowNumber` int ≥ 1 unique per payload,
  `name` required, optional person/company/email/phone/currency/language, the
  four new fields, optional `billingAddress`/`shippingAddress` objects and one
  `contact` object). Max 500 rows per call. Non-dry-run calls REQUIRE
  `options.idempotencyKey`; dry-run must omit options. Result:
  `{ object:'customer_import', dryRun, duplicateStrategy, summary:{created,updated,skipped,failed}, results:[{rowNumber, action, customerId, error}] }`.
- `finance.items.list(orgId, { active })` — already existed.

## Reference implementations (match these exactly in spirit)

- Title-filter pattern: `apps/billing/src/app/(app)/customers/page.tsx` and
  `apps/billing/src/components/status-filter-heading.tsx` (copy this component
  into `apps/couriers/src/components/status-filter-heading.tsx`; do NOT import
  across apps).
- Toolbar: shared `ResourceToolbar` from `@876/ui/resource-toolbar`
  (`packages/ui/src/components/resource-toolbar.tsx`) — inspect its props. If
  `DropdownAction` has no navigation affordance (href), add an **optional,
  additive** `href` field to it in the shared component (rendered as a link
  menu item); do not change any existing behavior or prop.
- Console list pages for cursor threading: `apps/console/src/app/(app)/users/page.tsx`.
- Couriers manage route-handler + context pattern:
  `apps/couriers/src/app/api/manage/onboarding/complete/route.ts`,
  `getManageContext` (`apps/couriers/src/lib/auth/manage-context.ts`).
- Current pages to rebuild: `apps/couriers/src/app/org/[orgSlug]/customers/page.tsx`,
  `apps/couriers/src/app/org/[orgSlug]/items/page.tsx`.

## Work item 1 — Customers list page rebuild

`/org/[orgSlug]/customers`:

- `ResourceToolbar` with `title="Customers"`,
  `titleFilter=<StatusFilterHeading label="Customers" value={selected} options=[All/Active/Archived]>`,
  primary `Add` → `customers/new` (`primaryVariant="info"`), `refresh`, and a
  dropdown `Import` action (icon `'import'`) → `customers/import`.
- Remove the `PageDescription` prose paragraph entirely.
- Thread `?status=` from searchParams into
  `finance.customers.list(ctx.orgId, { limit: 25, starting_after, ending_before, status })`
  (absent/`all` → no status param — never client-filter). Validate unknown
  status → treat as `all`.
- Cursor pagination controls (Prev/Next driven by `has_more` + first/last row
  IDs, `after`/`before` query params — match the console pattern; clear cursors
  on status change, which `StatusFilterHeading` already does).
- Table columns: Customer (name + email/id secondary line), Number
  (`customerNumber`, em-dash when null), Type (Business/Individual), Status
  badge (Active=secondary, Archived=outline — no green), Courier profile
  (Enrolled/Not enrolled from `service.customerProfiles.list` as today).
- Keep the existing error / empty states (short, no prose).

## Work item 2 — Add customer page

`/org/[orgSlug]/customers/new`:

- Form (client component) posting via the app's existing fetch conventions to a
  new thin route handler `POST /api/manage/customers`
  (`apps/couriers/src/app/api/manage/customers/route.ts`): handler authorizes
  with `getManageContext`-equivalent (see how other manage routes resolve org
  from the request), validates a strict Zod body (place schema per
  `.agents/rules/types.md` in `apps/couriers/src/types/`), calls
  `finance.customers.create(ctx.orgId, params, { idempotencyKey })` with a
  server-generated `crypto.randomUUID()` key, returns `{ data } | { error }`.
- Fields: kind (Individual/Business), name (required), first/last name,
  company (business only), email, phone, customer number, website, tax
  registration number, notes. Currency/language omitted in v1 (tenant defaults
  apply server-side).
- On success navigate back to the customers list. Buttons: `Add` (info), bare
  verbs, no green.

## Work item 3 — CSV import wizard

`/org/[orgSlug]/customers/import` (page + client wizard component(s) under the
route or `apps/couriers/src/components/customers/`):

- Add `papaparse` + `@types/papaparse` to `apps/couriers` via pnpm.
- Steps:
  1. **Upload** — file input (.csv), parse with papaparse (header row required),
     client caps: ≤ 5 MB, ≤ 2000 data rows; friendly errors.
  2. **Map columns** — auto-map headers to target fields
     (case/space/punctuation-insensitive aliases, e.g. "Display Name"/"Customer
     Name"→name, "Company"→companyName, "Phone Number"/"Mobile"→phone,
     "TRN"/"Tax ID"→taxRegistrationNumber, address aliases for
     billing*/shipping* line1/city/…); show a mapping table with selects; `name`
     mapping required to proceed; unmapped columns listed as ignored.
  3. **Preview** — pick duplicate strategy (`Skip duplicates` default /
     `Update matched`), then dry-run: POST chunks of ≤500 rows to a new route
     handler `POST /api/manage/customers/import` with `dryRun: true`; aggregate
     and show summary counts + a per-row table (action, matched customer,
     error), highlighting failures.
  4. **Import** — same chunks with `dryRun: false`, each chunk with its own
     `crypto.randomUUID()` idempotency key (generate once per wizard session per
     chunk so a retry replays, store in component state); sequential requests
     with progress.
  5. **Summary** — created/updated/skipped/failed counts; `Download` button
     producing a CSV (client Blob) of failed rows (original data + error
     message).
- Route handler `POST /api/manage/customers/import`: authorize, strict-validate
  `{ dryRun, duplicateStrategy, rows }` (reuse/share the Zod schema from
  `apps/couriers/src/types/`), forward to `finance.customers.import`; pass the
  client-supplied idempotency key through a body field or header — read the
  package resource signature and pick the cleaner path; return the result
  envelope untouched.
- Keep all CSV parsing/mapping logic in pure, unit-testable modules
  (`apps/couriers/src/lib/customers/import-mapping.ts` or similar) — not inside
  components.

## Work item 4 — Items page parity

`/org/[orgSlug]/items`:

- Same toolbar treatment: `title="Items"`, `titleFilter` with options
  All/Active/Inactive threading `?status=` → `finance.items.list(ctx.orgId, { active: true|false|undefined })`.
  No Add/Import in v1 — toolbar with `refresh` only.
- Remove the `PageDescription` prose. Add a Status column (Active=secondary
  badge, Inactive=outline).

## Tests (`.agents/rules/testing.md`)

- Pure modules: header auto-mapping (aliases, unmapped, collisions), row →
  import-payload building (trimming, empty→undefined, address grouping,
  rowNumber assignment), chunking, failed-rows CSV building.
- Route handlers: auth-denied, invalid body 400, happy forward with exact
  `finance.customers.*` args asserted (`toHaveBeenCalledWith`), error
  passthrough. Follow existing couriers route-handler test patterns
  (`apps/couriers/src/app/api/**/*.test.ts` if present, else nearest service
  tests) and the Prisma/finance-client mocking conventions already in the app.
- Page-level rendering tests optional; do not snapshot.

## Verification (must pass)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

If you touched `packages/ui` (optional `href`):

```
pnpm --filter @876/ui typecheck
```

## Hard constraints

- Scope: `apps/couriers/` only, plus the optional additive `DropdownAction.href`
  in `packages/ui`. Do NOT modify `apps/billing` or `packages/billing`.
- All data through `getFinanceClient()` / `service.*` — no raw fetch to billing,
  no prisma outside `src/lib/service`.
- No server actions — route handlers only.
- No green buttons; bare-verb labels (`Add`, `Import`, `Download`); no prose
  subheadings; error/empty states short.
- No commits. End with a summary of files touched and any deviations.
