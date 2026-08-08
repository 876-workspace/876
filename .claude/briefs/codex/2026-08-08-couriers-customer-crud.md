# Brief — Couriers: customer management CRUD

## Goal

Make `/[orgSlug]/customers` in `apps/couriers` a real, working management surface:
staff can **create, view, edit, and delete (archive)** a courier customer. Today the
list renders but `/customers/new` is a dead page with no form, there is no detail
page, no edit page, no route handlers, and the service layer has no
create/update/delete verbs.

Everything below is scoped to `apps/couriers` plus **one** small addition to
`apps/couriers/src/lib/finance/customers.ts`. Do **not** touch `packages/billing`,
`apps/api`, `apps/billing`, or any other app.

## Required reading before you write anything

- `.claude/rules/customer-architecture.md` — the three-layer model. This is the
  rule the whole design hangs off; read it fully.
- `.claude/rules/sdk-conventions.md` — the two-layer app-local datastore
  (`prisma` singleton + `service.<resource>.<verb>()`), verb vocabulary.
- `.claude/rules/app-layout.md` — page containers, `ResourceToolbar`, detail
  toolbars, `FormRow`, button labels, table cell hierarchy.
- `.claude/rules/app-structure.md` — where each file goes (`_components/`,
  `_lib/`, `features/`).
- `.claude/rules/deletions.md` — tombstone columns, soft delete.
- `.claude/rules/types.md`, `.claude/rules/code-style.md`,
  `.claude/rules/testing.md`.
- Root `CLAUDE.md` → "Loading States & Suspense Placement" and
  `.claude/rules/navigation-performance.md` for the page shape.

## Reference implementations to copy from (read these first)

| Concern                      | Copy the shape of                                                          |
| ---------------------------- | -------------------------------------------------------------------------- |
| service create/update        | `src/lib/service/branches/create.ts`, `.../update.ts`                      |
| service delete + tombstone   | `src/lib/service/team/delete.ts` (result shape only — ours is soft delete) |
| route handler POST           | `src/app/api/manage/branches/route.ts`                                     |
| route handler PATCH/DELETE   | `src/app/api/manage/team/[id]/route.ts`                                    |
| browser client               | `src/lib/client/branches.ts`, `src/lib/client/index.ts`                    |
| form component               | `src/app/[orgSlug]/settings/warehouses/_components/warehouse-form.tsx`      |
| new/edit page pair           | `src/app/[orgSlug]/settings/warehouses/new/page.tsx` and `[id]/edit/page.tsx` |
| list page + streamed table   | `src/app/[orgSlug]/customers/(list)/page.tsx` + `_components/customers-table-data.tsx` |
| registry (Billing) calls     | `src/lib/finance/customers.ts`, `src/lib/portal/enroll.ts`                 |

## The architecture — do not deviate

A courier customer is **two records**:

1. **Layer 2 — the shared registry customer** (`billing_customers`, owned by the
   Billing app), reached only through `$876.billing.customers.*` from
   `get876Client()` in `@/lib/876`. This holds identity: name, company, email,
   phone.
2. **Layer 3 — `CourierCustomerProfile`** in couriers' own Prisma datastore.
   This holds courier-operational data: mailbox, home branch, status, TRN,
   commercial flag. It references the registry by the opaque
   `billingCustomerId` — **no cross-DB foreign key**.

The couriers customer **list is the Layer-3 profile table**; the registry is read
only to resolve identity for profiles that already exist. That is already how
`customers-table-data.tsx` works — preserve it.

Two kinds of customer exist and they behave differently on write:

- **`CORE_USER`** — someone who signed up through the couriers portal. Their
  identity lives on their 876 account. Couriers **must not** edit their name,
  email, or phone. Created today by `src/lib/portal/enroll.ts`; leave that path
  untouched.
- **`EXTERNAL`** — hand-entered by staff in the manage app. No 876 account.
  This is the new path. Couriers owns the identity fields and may edit them.

## Task 1 — Prisma schema + migration

`apps/couriers/prisma/schema/customer.prisma`, model `CourierCustomerProfile`:

1. Make `userId` **nullable** (`String?`). A staff-created EXTERNAL customer has
   no 876 account. The `@@unique([tenantId, userId])` stays — Postgres treats
   NULLs as distinct, so many null rows coexist.
2. Add tombstone columns per `.claude/rules/deletions.md`:
   ```prisma
   deletedAt      Int?    @map("deleted_at")
   deletedBy      String? @map("deleted_by")
   deletionReason String? @map("deletion_reason")
   ```
3. Add `@@index([tenantId, deletedAt], name: "courier_customer_profiles_tenant_deleted_idx")`.

Write the migration by hand at
`apps/couriers/prisma/migrations/20260808000000_courier_customer_crud/migration.sql`
(match the style of the existing migrations in that folder — plain SQL, no
`prisma migrate dev`; the DB is not reachable from this container). Then run
`pnpm --filter @876/couriers prisma:generate` (check the actual script name in
`apps/couriers/package.json`; if generation cannot run offline, say so in your
report rather than inventing a workaround).

**Every existing read of `courierCustomerProfile` must now filter
`deletedAt: null`.** Grep for `courierCustomerProfile` across `src/` and fix all
of them — list, retrieve, the portal enroll path, mailbox lookups, package
joins. Missing one means a deleted customer keeps appearing.

## Task 2 — Types (`src/types/customer.ts`)

The existing `customerCreateParamsSchema` / `customerUpdateParamsSchema` in the
`── Customer ──` section are stale placeholders (they demand `userId` and
`firstSeenAt`). Replace them with the manage-facing contract:

```ts
export const customerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])

export const customerCreateParamsSchema = z
  .strictObject({
    customerKind: customerKindSchema.default('INDIVIDUAL'),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    companyName: z.string().trim().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().trim().min(1).optional(),
    branchId: z.string().optional(),
    trn: z.string().trim().min(1).optional(),
    isCommercial: z.boolean().optional(),
    status: customerStatusSchema.optional(),
  })
  .superRefine(/* INDIVIDUAL requires firstName; BUSINESS requires companyName */)
```

`customerUpdateParamsSchema` — every field above optional, no `customerKind`
(kind is fixed at creation), plus `status`. Keep it a `z.strictObject`.

Also add a `customerRowSchema` / `CustomerRow` type for the composed
profile + identity shape the list and detail pages render, and keep
`CustomerView` as the profile-only view. Put the view mapper in
`src/lib/service/customer-profiles/view.ts` (mirroring `branches/view.ts`) and
use it from every verb so the profile shape is declared once.

Add error codes to `src/lib/errors/customer.ts`:

- `customer/registry-unavailable` (502) — the Billing registry call failed.
- `customer/mailbox-unavailable` (503) — no mailbox could be allocated.
- `customer/identity-locked` (409) — an attempt to edit identity fields on a
  `CORE_USER` customer.
- `customer/duplicate-email` (409) — reuse only if the registry reports one.

## Task 3 — Registry helpers (`src/lib/finance/customers.ts`)

Add two functions beside the existing `ensureSharedCoreUserCustomer`. Match its
style exactly: it takes the `BillingIntegrationClient` as its first argument and
returns `IntegrationResult<BillingCustomer>`; it never imports the client itself.

```ts
export async function createExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  params: {
    profileId: string        // pre-generated courier profile id — the idempotency anchor
    customerKind: 'INDIVIDUAL' | 'BUSINESS'
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
): Promise<IntegrationResult<BillingCustomer>>
```

- `customerType: 'EXTERNAL'`.
- `name` = for INDIVIDUAL, `[firstName, lastName].filter(Boolean).join(' ')`;
  for BUSINESS, `companyName`.
- `sourceExternalReference` **and** `idempotencyKey` are both
  `` `couriers:profile:${params.profileId}` ``. That is what makes a retried
  create idempotent — the profile id is generated before the registry call
  precisely so it can anchor the key.

```ts
export async function updateExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  customerId: string,
  params: { firstName?, lastName?, companyName?, email?, phone?, name? }
): Promise<IntegrationResult<BillingCustomer>>
```

Recompute `name` from the merged values so the registry's single-column display
name never drifts from the parts.

## Task 4 — Service verbs (`src/lib/service/customer-profiles/`)

The service layer stays **pure Prisma** — it must not import `@/lib/876` or the
Billing client. That orchestration lives in Task 5. One file per verb, composed
by `index.ts`, exactly like `branches/`.

- `create.ts` — `create(tenantId: string, params: CustomerProfileCreateInput): ServiceResult<CustomerView>`
  where the input carries `id` (pre-generated), `billingCustomerId`,
  `userId: null`, `mailboxNumber`, `branchId`, `trn`, `isCommercial`, `status`.
  Runs in a `runTransaction('customerProfiles.create', …)` that creates the
  profile **and** its primary mailbox in one write, same shape as `ensure.ts`.
  If `branchId` is absent, resolve the tenant's default branch inside the
  transaction (`branch.findFirst({ where: { tenantId, isDefault: true } })`) and
  use it. Map `isUniqueConstraintError` to a 409.
- `update.ts` — `update(tenantId, id, params: CustomerProfileUpdateInput)`.
  Profile fields only (`branchId`, `status`, `trn`, `isCommercial`). Guarded by
  `findFirst({ where: { id, tenantId, deletedAt: null } })` → 404 via
  `errFrom('customer/not-found')`. Do **not** load-then-compare tenant.
- `delete.ts` — soft delete. Sets `deletedAt = nowUnixSeconds()`, `deletedBy`,
  `deletionReason` and returns `ok({ id, deleted: true })`
  (`DeletedCustomer` from `@/types/customer`). It does **not** delete or archive
  the registry customer — other 876 apps may still have that party as a
  customer. Add a short comment saying exactly that; it is the single most
  likely thing for a later reader to get wrong.
- `retrieve.ts` — add `retrieve(tenantId, id)` alongside the existing
  `retrieveByTenantAndUser`, filtering `deletedAt: null`.
- `list.ts` — add `deletedAt: null` to the `where`.
- `index.ts` — export `{ create, ensure, list, retrieve, retrieveByTenantAndUser, update, delete: deleteCustomer }`.

`service` in `src/lib/service/index.ts` keeps the `customerProfiles` namespace —
do not rename it.

## Task 5 — Orchestration (`src/lib/manage/customers.ts`, new file)

Mirrors `src/lib/portal/enroll.ts`: `import 'server-only'`, calls
`get876Client()`, the finance helpers, `service`, and returns the app's
`ServiceResult` envelope. This is the only place both layers meet.

```ts
export async function createManagedCustomer(params: {
  tenant: Tenant
  params: CustomerCreateParams
}): ServiceResult<CustomerView>
```

Order, and it matters:

1. `const profileId = generateId('CourierCustomerProfile')` (from `@/lib/id`).
2. `service.mailboxes.allocate({ tenantId })` — bail with the returned error.
3. `createExternalCustomer(...)` with `profileId`. On error →
   `errFrom('customer/registry-unavailable')`.
4. `service.customerProfiles.create(tenantId, { id: profileId, billingCustomerId, … })`.

If step 4 fails after step 3 succeeded, the registry row is orphaned. That is
acceptable and intentional — it is idempotent on `profileId`, so a retry with
the same profile id reuses it; do **not** attempt a compensating delete. Add a
comment saying so.

```ts
export async function updateManagedCustomer(params: {
  tenant: Tenant
  id: string
  params: CustomerUpdateParams
}): ServiceResult<CustomerView>
```

1. Retrieve the profile (404 if absent).
2. If the payload touches identity fields (`firstName`, `lastName`,
   `companyName`, `email`, `phone`), retrieve the registry customer and check
   `customerType`. If it is **not** `EXTERNAL`, return
   `errFrom('customer/identity-locked')` — a portal customer's identity belongs
   to their 876 account.
3. Apply the registry update, then the profile update.

Add `deleteManagedCustomer` only if it needs registry work — it does not, so the
route handler may call `service.customerProfiles.delete` directly.

## Task 6 — Route handlers

- `src/app/api/manage/customers/route.ts` — `POST`. Copy the envelope pattern
  from `branches/route.ts`: parse JSON, pull `orgSlug` out of the body, resolve
  `getManageContext(orgSlug)`, reject non-`owner`/`admin` with 403
  `auth/forbidden` and the message "You do not have permission to manage
  customers.", 404 when `!ctx.tenant`, then validate with
  `customerCreateParamsSchema` and call `createManagedCustomer`. 201 on success.
- `src/app/api/manage/customers/[id]/route.ts` — `PATCH` (same envelope,
  `customerUpdateParamsSchema`, → `updateManagedCustomer`) and `DELETE`
  (`orgSlug` from `request.nextUrl.searchParams`, like
  `team/[id]/route.ts`) → `service.customerProfiles.delete(ctx.tenant.id, id, ctx.user.id)`.

`export const runtime = 'nodejs'` on both. No business logic in either.

## Task 7 — Browser client

`src/lib/client/customers.ts` exporting `customers = { create, update, delete: remove }`
over `request` from `./request`, exactly like `client/branches.ts` (and
`client/team.ts` for the DELETE query-string form). Register it in
`src/lib/client/index.ts` in both the object and the named re-exports.

## Task 8 — UI

All under `src/app/[orgSlug]/customers/`.

**`_components/customer-form.tsx`** (client component) — the shared create/edit
form, modelled on `settings/warehouses/_components/warehouse-form.tsx`.

- Every field uses `FormRow` from `@876/ui/form-row`; `EmailInput` for email and
  `PhoneInput` for phone (`.claude/rules/app-layout.md` §10a).
- A `RadioGroup` for Individual vs Business (two options → radio, not a select),
  disabled in edit mode.
- Fields: kind, first/last name (INDIVIDUAL) or company name (BUSINESS), email,
  phone, home branch (`Select` fed by branches passed in as plain serializable
  props from the server page), TRN, "Commercial account" switch, status
  (edit only).
- No `<p>` description paragraphs under headings; guidance goes in `FormRow`'s
  `hint` tooltip.
- Submit label is the bare verb (`Add` / `Save`), never `Add customer`.
- In edit mode for a `CORE_USER` customer, the identity fields render disabled
  with a hint explaining the identity comes from the customer's 876 account.

**`new/page.tsx`** — replace the current stub. Keep the `PageBreadcrumb`, add the
form. Load the tenant's branches server-side and pass them down as
`{ id, name }[]`.

**`[id]/page.tsx`** — detail view. Header per `.claude/rules/app-layout.md` §6:
avatar, name + status badge, metadata row (mailbox number, home branch, email,
phone), `Edit` outline button with `Pencil`, and a `···` dropdown whose items are
Export → separator → Delete (destructive, last). Body: a details card for
identity and one for courier data (mailbox, branch, TRN, commercial). Follow
`.claude/rules/navigation-performance.md` Rule 2 — the layout/page awaits
`params` only and everything that fetches sits behind `<Suspense>`; `notFound()`
is called inside the streamed server component that resolves the record.

**`[id]/edit/page.tsx`** — breadcrumb back to the detail page, the same form in
edit mode.

**Delete** — an `AlertDialog` confirmation (destructive confirmations are the
sanctioned dialog use), then `client.customers.delete` and
`router.push` back to the list.

**`_components/customers-table.tsx`** — make the name cell a `Link` to
`/${orgSlug}/customers/${id}` and add a `Status` column rendered as a `<Badge>`
(never bare coloured text). Mailbox number as a tier-3 muted column if it is
already available without an extra query; skip it otherwise rather than adding
an N+1. Keep `_components/customers-skeleton-columns.ts` in sync — there is an
existing test asserting the skeleton mirrors the table columns, and it must stay
green.

## Tests

Follow `.claude/rules/testing.md` — assert full shapes, exact call arguments,
exact call counts, and both sides of every `{ data, error }`.

Required new test files, at minimum:

- `src/lib/service/customer-profiles/create.test.ts` — creates profile +
  primary mailbox in one transaction; falls back to the default branch when
  `branchId` is absent; maps a unique violation to 409.
- `src/lib/service/customer-profiles/delete.test.ts` — writes the tombstone,
  never calls `prisma.courierCustomerProfile.delete`, returns
  `{ id, deleted: true }`, and 404s for another tenant's id.
- `src/lib/service/customer-profiles/update.test.ts` — tenant scoping is a
  filter in the query, not a post-load comparison.
- `src/lib/service/customer-profiles/list.test.ts` — excludes soft-deleted rows
  and honours the status filter.
- `src/lib/manage/customers.test.ts` — the create ordering above; a registry
  failure returns `customer/registry-unavailable` and never writes a profile;
  an identity edit on a `CORE_USER` customer returns `customer/identity-locked`
  and never calls `finance.customers.update`.
- `src/app/api/manage/customers/route.test.ts` and `.../[id]/route.test.ts` —
  401 with no session, 403 for a `member` role asserting the exact
  `auth/forbidden` code, 422 on a malformed body, and the happy path asserting
  the exact service call arguments.
- `src/lib/finance/customers.test.ts` — extend if it exists, otherwise add:
  `createExternalCustomer` sends `customerType: 'EXTERNAL'` and the
  `couriers:profile:<id>` idempotency key.
- Update `_components/customer-form.test.tsx` style coverage from
  `warehouse-form.test.tsx`: each required field blocks submission and the
  client is never called; a successful submit calls
  `client.customers.create` with the exact params.

## Verification — run all of these, in the foreground, and paste real output

```bash
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
pnpm exec prettier --check "apps/couriers/**/*.{ts,tsx,prisma}"
node scripts/check-app-structure.mjs
```

Fix everything they report. Do **not** report done on a red check, and do not
claim a check passed that you did not actually run.

## Do not

- Do not commit, branch, or push. The orchestrating agent stages and commits.
- Do not touch `packages/billing`, `apps/api`, `apps/billing`, or any app other
  than `apps/couriers`.
- Do not add a server action.
- Do not import `prisma` outside `src/lib/service/`.
- Do not import `@/lib/876` from inside `src/lib/service/`.
- Do not add a cross-DB foreign key, or store registry identity fields on
  `CourierCustomerProfile`.
- Do not write TRN handling beyond the existing column — the migration of TRN
  into core `user_identifications` is a separate, tracked follow-up.
- Do not hard delete a customer.
- Do not add descriptive `<p>` paragraphs under headings, green buttons, or
  resource-suffixed button labels.
