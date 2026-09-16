# Brief — tests for couriers customer CRUD

The customer CRUD feature has landed in `apps/couriers` but its test coverage is
incomplete. Your job is **tests only**. Do not change any implementation file
unless a test proves a genuine defect — and if it does, fix it and say so
explicitly in your report.

Three real bugs were already found by hand in this feature after the
implementation claimed to be verified. That is why this coverage matters: write
tests that would have caught them.

## Read first

- `.claude/rules/testing.md` — the whole file. It is the standard you are held to.
- `apps/couriers/src/lib/manage/customers.ts`
- `apps/couriers/src/lib/finance/customers.ts`
- `apps/couriers/src/lib/service/customer-profiles/{create,update,delete,list,retrieve,view}.ts`
- `apps/couriers/src/app/api/manage/customers/route.ts` and `[id]/route.ts`
- `apps/couriers/src/app/[orgSlug]/customers/_components/customer-form.tsx`

## Reference test files — match their mocking style exactly

| For                 | Copy the shape of                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------- |
| service verb tests  | `apps/couriers/src/lib/service/customer-profiles/ensure.test.ts`                          |
| route handler tests | `apps/couriers/src/app/api/manage/team/[id]/route.test.ts`                                |
| form component      | `apps/couriers/src/app/[orgSlug]/settings/warehouses/_components/warehouse-form.test.tsx` |
| registry helpers    | `apps/couriers/src/lib/finance/customers.test.ts` (extend it)                             |

Note: `warehouse-form.test.tsx` currently has tests that time out at 5000ms under
parallel load. Do not copy its timing approach blindly — prefer
`userEvent.setup({ delay: null })` plus `await screen.findBy…` over long chains,
and keep each test to a single act.

## Files to write

### 1. `src/lib/service/customer-profiles/create.test.ts`

- creates the profile **and** its primary mailbox in one transaction — assert the
  exact `create` argument including the nested `mailboxes.create` with
  `isPrimary: true`;
- uses the supplied `branchId` when given, and **falls back to the tenant's
  default branch** (`branch.findFirst({ where: { tenantId, isDefault: true } })`)
  when it is absent;
- writes `userId: null` — this is the whole point of the EXTERNAL path;
- maps a unique-constraint error to status 409 and does **not** report it to
  Sentry as a database outage;
- a cold-start error returns `error/database-unavailable`, any other unexpected
  error returns 500, and both call `reportServiceFailure` exactly once.

### 2. `src/lib/service/customer-profiles/delete.test.ts`

- writes the tombstone (`deletedAt` a number, `deletedBy` the passed id,
  `deletionReason`) via `update`;
- **never** calls `prisma.courierCustomerProfile.delete` — assert
  `.not.toHaveBeenCalled()` explicitly;
- returns exactly `{ data: { id, deleted: true }, error: null }`;
- returns `customer/not-found` for an id belonging to another tenant, and the
  tenant is applied **as a filter in the query**, not compared after loading.

### 3. `src/lib/service/customer-profiles/update.test.ts`

- tenant scoping is a `where` filter, not a post-load comparison;
- a soft-deleted profile is not updatable (`deletedAt: null` is in the `where`);
- only the four courier-owned fields are written; an absent field is not sent as
  `undefined` in a way that would clear a column.

### 4. `src/lib/service/customer-profiles/list.test.ts`

- excludes soft-deleted rows (`deletedAt: null` present in the `where`);
- applies the status filter when given and omits it when not.

### 5. `src/lib/manage/customers.test.ts` — the most important file here

Mock `@/lib/876`, `@/lib/finance/customers`, and `@/lib/service`.

`createManagedCustomer`:

- allocates a mailbox, creates the registry customer, then creates the profile —
  assert the **order** and that the same pre-generated profile id is passed to
  both `createExternalCustomer` (as `profileId`) and
  `service.customerProfiles.create` (as `id`). That shared id is the idempotency
  anchor and is the single most important invariant in this module;
- a registry failure returns `customer/registry-unavailable` and
  `service.customerProfiles.create` is **never** called;
- a mailbox-allocation failure returns before any registry call — assert
  `createExternalCustomer` was not called.

`updateManagedCustomer`:

- **REGRESSION — this is a bug that shipped and was fixed.** When the caller
  sends identity fields whose values are _identical_ to what the registry
  already holds, and the customer is `CORE_USER`, the update must **succeed**
  (the courier-owned fields are written) and `updateExternalCustomer` must not
  be called. The old code compared key _presence_, so an edit form echoing the
  record back made it impossible to change a portal customer's branch or TRN at
  all. Write this test so it can never regress.
- changing an identity field on a `CORE_USER` customer returns
  `customer/identity-locked` and never calls `updateExternalCustomer`;
- changing an identity field on an `EXTERNAL` customer calls
  `updateExternalCustomer` once, with `customerKind` taken from the registry
  record and each field merged over the current value;
- a missing profile returns `customer/not-found` before any registry call.

### 6. `src/app/api/manage/customers/route.test.ts`

- no session → 401;
- role `member` → 403 asserting the exact code `auth/forbidden`;
- no tenant → 404;
- malformed JSON body → 422;
- a body failing `customerCreateParamsSchema` (a BUSINESS with no
  `companyName`) → 422;
- happy path → 201, asserting `createManagedCustomer` was called exactly once
  with `{ tenant, params }` where `params` has **no `orgSlug` key**.

### 7. `src/app/api/manage/customers/[id]/route.test.ts`

- `PATCH`: the same auth/validation matrix, plus the happy path asserting the
  exact `updateManagedCustomer` arguments;
- `DELETE`: missing `orgSlug` query param → 422; the happy path asserts
  `service.customerProfiles.delete` is called with
  `(tenantId, id, ctx.userId)` — note it is `ctx.userId`, not `ctx.user.id`,
  which was a real compile error in the first implementation.

### 8. `src/app/[orgSlug]/customers/_components/customer-form.test.tsx`

- submitting an INDIVIDUAL with no first name shows the validation message and
  **never** calls `client.customers.create`;
- a successful create calls `client.customers.create` once with the exact
  params, including `customerKind: 'INDIVIDUAL'` and no `status` key;
- **REGRESSION**: when editing a customer whose `customerType` is `CORE_USER`,
  the payload sent to `client.customers.update` contains **none** of
  `firstName`, `lastName`, `companyName`, `email`, `phone` — only the courier
  fields and `status`. Assert on the exact object.
- the customer-type radio is disabled in edit mode.

### 9. Extend `src/lib/finance/customers.test.ts`

- `updateExternalCustomer` derives `name` from the merged parts rather than
  echoing a caller-supplied name: for `BUSINESS` it is the company name, for
  `INDIVIDUAL` it is `first last`;
- it omits `name` entirely when the derivation is empty, rather than blanking
  the registry's existing name.

## Rules

- Assert both sides of every `{ data, error }` result.
- Exact call counts (`toHaveBeenCalledTimes(1)`), exact arguments
  (`toHaveBeenCalledWith(...)`) — never a bare `toHaveBeenCalled()`.
- `vi.clearAllMocks()` in every `beforeEach`.
- Factories with realistic Jamaican-courier domain data, defined per test file,
  called inside `it()`.
- No `as any`.

## Verify

```bash
cd /workspaces/876/apps/couriers
pnpm exec vitest run src/lib/service/customer-profiles src/lib/manage src/lib/finance "src/app/api/manage/customers" "src/app/[orgSlug]/customers"
pnpm exec tsc --noEmit
```

Every test must pass. Report the real output. Do not commit, branch, or push.
