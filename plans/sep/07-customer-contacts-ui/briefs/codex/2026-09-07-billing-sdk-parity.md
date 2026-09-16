# Brief: bring `@876/billing` up to the backend surface (quotes CRUD, invoices, credit notes)

Branch `feature/customer-contacts-ui`. Do **not** commit — the orchestrator commits.

## The gap

The public `@876/billing` package is behind both the backend and the app-local
clients. Verified in the current tree:

- `packages/billing/src/resources/quotes.ts` exposes **only** `list` plus the
  four new transitions (`send`, `accept`, `decline`, `cancel`). There is no
  `create`, `retrieve`, `update`, or `delete`, even though
  `apps/billing-api` registers all five CRUD operations for quotes.
- `packages/billing/src/resources/invoices.ts` exposes `list`, `create`,
  `finalize`, and `void` — but not `retrieve`, `update`, or `delete`, which the
  backend has at `PATCH /invoices/:invoiceId` and `DELETE /invoices/:invoiceId`.
- **There is no credit-notes resource at all**, although the backend registers
  `/credit-notes`, `/credit-notes/:creditNoteId/apply`, and
  `/credit-notes/:creditNoteId/void`.

Note: the `estimates` resource is **gone on purpose** — the duplicate Estimate
document type was merged into Quote earlier in this run, with no backward
compatibility. Do not re-add it, and do not add an estimates alias.

## Concurrency — strict file ownership

Another agent is overhauling the document creator right now and owns
`apps/billing-api/src/modules/{customers,catalog}/**`,
`packages/billing/src/resources/customers.ts`,
`packages/billing/src/resources/items.ts`, their types, and both apps'
`features/documents/**`.

- **You own:** `packages/billing/src/resources/{quotes,invoices,credit-notes}.ts`,
  their types under `packages/billing/src/types/**`, `packages/billing/src/schemas.ts`,
  the package's resource index/factory, and tests under
  `packages/billing/src/resources/__tests__/`.
- **Do NOT touch:** `apps/`, `packages/billing-ui/`, or the customers/items
  resources and their types.

Pull before you start and again before you finish.

## Read first (binding)

`.claude/rules/sdk-conventions.md` (the verb vocabulary is not negotiable),
`.claude/rules/stripe-api-pattern.md`, `.claude/rules/billing-data-plane.md`,
`.claude/rules/error-handling.md`, `.claude/rules/testing.md`,
`.claude/rules/ai-code-quality.md`.

## Scope

Add the missing typed operations, matching each file's **existing** shape
exactly — same `Request(...)` helper, same schema-passing convention, same
`RequestOptions` handling, same JSDoc density. Read `customers.ts`, which is the
most complete resource in the package, and follow it.

### Quotes

Add `create`, `retrieve`, `update`, and `delete` to the existing resource, on
the paths the backend actually registers. Verify each path and its request and
response schema against
`apps/billing-api/src/modules/documents/documents.routes.ts` — do not guess.

### Invoices

Add `retrieve`, `update`, and `delete`.

**`delete` is the correct verb** per `.claude/rules/sdk-conventions.md` — not
`del`, and not `deleteInvoice`. The Billing app's own browser client happens to
use `deleteInvoice` locally; that is an app-local name and is not the standard
for this package.

### Credit notes

Create `packages/billing/src/resources/credit-notes.ts` with `list`, `create`,
`apply`, and `void` against the registered routes, and wire it into the package
the same way the sibling resources are wired.

`void` is a reserved word in some positions — check how `invoices.ts` already
solved this in its own `void` method and be consistent with it rather than
inventing a different name.

## Contract rules that apply here

- Every serialized resource keeps its literal `object` discriminator; list
  responses keep the existing envelope. Reuse the existing schema helpers rather
  than hand-writing a second list shape.
- Results stay `{ data, error }`. **Never** convert a returned application error
  into a throw (`.claude/rules/error-handling.md`).
- Money stays integer minor units or decimal **strings** end-to-end. Never a JS
  `number`.
- Timestamps are Unix seconds.
- Do not add `upsert`, `getX`, `findX`, `fetchX`, or `retrieveByX`. Alternate-key
  lookups use a typed `retrieve({ ... })` object.

## Tests — minimum 20 `it()` cases

Per `.claude/rules/testing.md`. Follow `packages/billing/src/resources/customers.test.ts`
for style. Assert exact call arguments, not just that a mock was called.

- Per new method (≥16 total): it hits the **exact** path with the exact method,
  body, and schema, and it propagates a success payload with its full shape.
- Error propagation (≥2): a returned API error surfaces as `{ data: null, error }`
  with its code and message intact and is **not** thrown.
- Encoding (≥2): an id containing a character needing URL encoding is encoded in
  the path for both a quote and a credit note.

## Verification (run and report real output)

```
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

## Do not

- Do not re-add an estimates resource or alias.
- Do not use `del`; the verb is `delete`.
- Do not change any app code or `packages/billing-ui`.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.
- Do not throw a returned application error.
- Do not commit or branch.

## Report

`plans/2026-09-07-customer-contacts-ui/reports/codex/2026-09-07-billing-sdk-parity.md`
— every method added with its verified path, the **counted** `it()` total, real
verification output, and anything you could not verify.
