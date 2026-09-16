# Phase A — Customer contacts: API + `@876/billing` client

Run: `2026-09-06-customers-items-contacts-crud`. Branch: `feature/customers-items-contacts-crud`.
Model: `gpt-5.6-terra`, reasoning effort medium.

## Goal

`Contact` is modelled in Prisma and serialized, but there is **no way to read or write a
contact through the API**. Add the contacts sub-resource to the customers module, then
expose it on the `@876/billing` client.

## Your file scope — do not touch anything else

```
apps/billing-api/src/modules/customers/**
packages/billing/src/resources/customers.ts
packages/billing/src/resources/__tests__/**   (or customers.test.ts beside it, match local style)
packages/billing/src/integration/types.ts     (or wherever BillingCustomer types live — find it)
```

Two other agents are working in `apps/billing/src/app/(app)/customers/**`,
`apps/invoice/src/app/(app)/customers/**` and `apps/*/src/app/(app)/items/**` at the same
time. **Do not open those directories.**

## Rules to read first

`.agents/rules/express-api.md`, `.agents/rules/ai-code-quality.md`,
`.agents/rules/stripe-api-pattern.md`, `.agents/rules/sdk-conventions.md`,
`.agents/rules/error-handling.md`, `.agents/rules/customer-architecture.md`,
`.agents/rules/testing.md`, `.agents/rules/naming.md`.

## Verified premises — these are checked, build on them

- `serializeContact(row: Contact)` already exists at
  `apps/billing-api/src/modules/customers/customers.serializers.ts:3` and is the
  canonical wire shape: `{ object: 'contact', id, userId, salutation, firstName,
  lastName, email, workPhone, mobilePhone, avatar, isPrimary, coreSyncedAt }`.
  **Reuse it. Do not write a second contact serializer.**
- `serializeCustomer` already emits `primaryContact` from `row.contacts?.[0]`
  (`customers.serializers.ts:61`). Leave that alone.
- The Prisma model is `apps/billing-api/prisma/schema/contact.prisma`, table
  `billing_contacts`, keyed `@@unique([tenantId, id])` and indexed
  `[tenantId, customerId]`. Physical columns are snake_case and **stay** snake_case.
- `customers.repository.ts:386-455` already implements primary-contact promotion and the
  demote-never-delete rule for the Core sync path. **Read it before writing the new write
  path and reuse its transaction shape** rather than inventing a second promotion rule.
- `apps/billing-api` is listed in `.agents/rules/error-handling.md` as a service that
  still **throws** registered errors to its central error middleware. New code here throws
  like its neighbours. Do **not** introduce a `{ data, error }` return boundary in this
  service.
- The router helper is `createApiRouter({ tag, resolveGuards })` from `@/http/api-router`,
  and every route declares `security: { kind: 'tenant', permission: '...' }`. Copy the
  exact declaration style already used in `customers.routes.ts`.

## What to build

### 1. Routes — `apps/billing-api/src/modules/customers/customers.routes.ts`

Add five routes. **Declare them before the existing `/customers/:customerId` routes are
shadowed** — follow the ordering already used in the file so a literal sub-path is never
captured by a `:param` segment.

| Method   | Path                                             | Permission         |
| -------- | ------------------------------------------------ | ------------------ |
| `GET`    | `/customers/:customerId/contacts`                | `customers:read`   |
| `POST`   | `/customers/:customerId/contacts`                | `customers:write`  |
| `GET`    | `/customers/:customerId/contacts/:contactId`     | `customers:read`   |
| `PATCH`  | `/customers/:customerId/contacts/:contactId`     | `customers:write`  |
| `DELETE` | `/customers/:customerId/contacts/:contactId`     | `customers:write`  |

`operationId` follows the file's existing convention exactly
(`billing-billing_get_customers_customerId_contacts`, and so on).

List returns the standard list envelope used elsewhere in this module. Create returns
`201` with `{ object: 'contact', id }`. Delete returns the tombstone
`{ object: 'contact', id, deleted: true }`.

### 2. Schemas — `customers.schemas.ts`

- `contactSchema` — must match `serializeContact` field-for-field.
- `contactListSchema`, `deletedContactSchema`.
- `contactParamsSchema` — `{ customerId, contactId }`.
- `contactCreateBodySchema` — `salutation?`, `firstName?`, `lastName?`, `email?`,
  `workPhone?`, `mobilePhone?`, `isPrimary?`. Strict. At least one of `firstName`,
  `lastName`, `email` must be present — a contact with no identifying field at all is not
  a contact; enforce that with a refinement and a clear message.
- `contactUpdateBodySchema` — same fields, all optional, strict.
- Email validated with `z.email()`. **`userId`, `avatar`, `coreSyncedAt` and `object` are
  server-owned and must not be accepted from a client body.**

### 3. Repository — `customers.repository.ts`

- `listContacts(tenantId, customerId)` — ordered primary first, then `createdAt`.
- `retrieveContact(tenantId, customerId, contactId)`.
- `createContact(...)`, `updateContact(...)`, `deleteContact(...)`.

Every query filters on **both** `tenantId` and `customerId` inside the `where` — never
load-then-compare. A contact belonging to another tenant or another customer must be
indistinguishable from one that does not exist.

Promotion invariant, inside one transaction: when a write sets `isPrimary: true`, demote
whatever currently holds it for that `(tenantId, customerId)` first. Do this in **one**
place that both create and update call.

`id` is generated with the existing `generateId('contact')` helper already used at
`customers.service.ts:349`. `createdAt`/`updatedAt` are Unix seconds, matching the model.

### 4. Service — `customers.service.ts`

Business rules, throwing registered errors:

- The customer must exist in the tenant before any contact operation — otherwise the
  customer-not-found error the module already uses.
- **A Core-linked contact (`userId !== null`) rejects edits to `firstName`, `lastName`,
  `email`, and `avatar`.** Those are snapshots refreshed by `customer.ensure`; accepting a
  write that the next sync silently reverts is a defect, not a feature. `workPhone`,
  `mobilePhone`, `salutation` and `isPrimary` remain editable on a linked contact.
- **Refuse to delete the last remaining contact of a `CORE_ORGANIZATION` customer.** The
  customer-architecture rule requires a business customer to carry a primary contact, and
  the sync would recreate it immediately. Use a registered conflict-style error with a
  message that says why.
- Deleting the primary contact of a customer that has others promotes the next one
  (oldest remaining) so the invariant "at most one primary" never becomes "none".

Add whatever new error codes you need to the module's existing registered catalog, in
namespaced kebab-case (`billing/contact-not-found`, `billing/contact-core-linked`,
`billing/contact-last-required`). **Do not restate a message at a call site.**

### 5. Docs — `customers.docs.ts`

One entry per new route, matching the prose style already in the file. Data only.

### 6. Client — `packages/billing/src/resources/customers.ts`

Add a nested `contacts` resource so call sites read
`billing.customers.contacts.list(customerId)`:

```ts
contacts: {
  list(customerId, options?),
  retrieve(customerId, contactId, options?),
  create(customerId, params, options?),
  update(customerId, contactId, params, options?),
  delete(customerId, contactId, options?),
}
```

Match the **exact** existing style in that file: `Request<T>(runtime, { method, path,
body, signal }, Schema)`, `encodeURIComponent` on every interpolated id, verbs limited to
the sanctioned vocabulary (`.agents/rules/sdk-conventions.md` — it is `delete`, never
`del`, on the client). Add the Zod response schemas and the exported TypeScript types
beside the existing customer ones, wherever this package already puts them — **find that
file, do not invent a new location.**

## Tests — floor: 18 `it()` cases, counted

Beside the code, matching local placement and style. Cover, at minimum:

- list returns contacts primary-first;
- list is tenant-scoped (another tenant's contact is absent);
- retrieve of a contact belonging to a different customer → not-found, not 403;
- create with only an email succeeds; create with no identifying field is rejected;
- create with `isPrimary: true` demotes the incumbent primary **in the same transaction**;
- update promoting a contact demotes the incumbent;
- update of a Core-linked contact rejects a `firstName` change and accepts a
  `mobilePhone` change;
- delete of a non-primary contact succeeds and returns the tombstone;
- delete of the primary promotes the oldest remaining contact;
- delete of the last contact on a `CORE_ORGANIZATION` customer is refused;
- a client body carrying `userId` or `avatar` is rejected by the strict schema;
- the client resource calls the right path/method/schema for all five verbs.

Assert **complete result shapes**, exact call arguments, and exact status codes — not
`toBeDefined()`. Route/auth/envelope behaviour is exercised through the assembled Express
app with Supertest, per `.agents/rules/api-backend.md`.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** `as unknown as T` only for a real
  external mismatch, and say so in your report.
- **Do not commit.** Leave the working tree dirty; the orchestrator stages and commits.
- Do not run `prisma migrate` and do not change `contact.prisma` — the model is already
  correct and needs no migration.
- Do not rename any existing route, `operationId`, error code, column, or exported symbol.
- Do not weaken an existing signature to make a test easier.
- Do not create a top-level `/contacts` resource. Contacts are a sub-resource.

## Verify before you report

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
```

All must pass. If one cannot, say so plainly rather than working around it.

## Report

Write `plans/2026-09-06-customers-items-contacts-crud/reports/codex/2026-09-06-phase-a-contacts-api-and-client.md`:
files changed with a reason each, the **counted** number of `it()` cases added, the exact
verification output, decisions the brief did not settle, anything you could not verify,
and gaps you deliberately left.
