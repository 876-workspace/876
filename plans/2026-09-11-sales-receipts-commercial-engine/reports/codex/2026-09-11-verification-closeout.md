# Sales Receipts verification closeout

## Status

- Task 1: partially complete. The named compilation errors, contract artifacts,
  route-matrix count, boundary cycle, UI narrowing, UI copy, schema reuse, and
  Billing UI host-link violation are fixed. The full Billing API check set is
  green. The app-suite and Billing UI full test commands did not finish within
  this harness's 30-second command limit, and the workspace structure check has
  one unrelated existing Console violation.
- Task 2: complete in implementation and focused tests. Documents owns one
  locked conversion guard; Invoice and Sales Receipt call it inside their write
  transactions. It locks `billing_quotes` with `FOR UPDATE`, then reloads both
  conversion relations. A conversion to the other kind returns 409; a same-kind
  retry returns the existing ID with `replayed: true` without write work.
- Task 3: partially complete. Added 8 create, 6 void, and 7 refund workflow
  cases. The required Payments Received isolation test floor was not added.
- Task 4: complete. The hand-written migration matches Prisma's substantive
  output. Its one extra `billing_credit_notes_single_sale_source_check` is
  intentional: Prisma schemas do not model PostgreSQL CHECK constraints.

## Tests added

- `documents/workflows/create-sales-receipt.test.ts`: 8 `it()` cases.
- `documents/workflows/void-sales-receipt.test.ts`: 6 `it()` cases.
- `documents/workflows/refund-sales-receipt.test.ts`: 7 `it()` cases.
- `documents/repositories/quotes/conversion.test.ts`: 6 `it()` cases.
- `documents/repositories/invoices/create-quote.test.ts`: no new `it()`; its
  transaction fixture now supplies the row lock dependencies.

The conversion tests cover invoice-then-receipt, receipt-then-invoice, lock
ordering, transaction-client use, same-kind replay, and missing quotes. The
Sales Receipt create test additionally asserts its guard call receives the
transaction client. I did not add the requested four Payments Received
isolation cases; this remains merge-blocking work.

## Changed files

- `apps/billing-api/src/modules/documents/repositories/quotes/conversion.ts`:
  Documents-owned quote lock/recheck guard.
- `apps/billing-api/src/modules/documents/repositories/invoices/create.ts` and
  `workflows/create-sales-receipt.ts`: invoke that guard inside their write
  transactions and preserve same-kind replay.
- `apps/billing-api/src/modules/documents/repositories/quotes/conversion.test.ts`,
  `workflows/create-sales-receipt.test.ts`,
  `workflows/void-sales-receipt.test.ts`, and
  `workflows/refund-sales-receipt.test.ts`: focused workflow/guard coverage.
- `apps/billing-api/src/modules/documents/repositories/invoices/create-quote.test.ts`:
  adapts the established quote conversion test transaction mock to the new
  repository lock.
- `apps/billing-api/src/platform/invoice-lifecycle.ts`,
  `modules/documents/invoice-lifecycle.ts`, and
  `modules/payments/repositories/payments/shared.ts`: move the pure invoice
  lifecycle projection to the dependency-leaf platform location, removing the
  Documents/Payments cycle.
- `apps/billing-api/src/modules/documents/index.ts`,
  `modules/payments/index.ts`, and `src/http/routes.ts`: keep module public
  indexes free of route composition; the composition root imports routers
  directly. This is strictly required to prevent route exports reintroducing
  the circular dependency.
- `apps/billing-api/src/modules/outbox/outbox.service.ts`: registers the three
  Sales Receipt outbox event/resource contracts.
- `packages/billing/src/integration/types/sales-receipt.schema.ts`: re-exports
  the canonical tenant Sales Receipt Zod schemas rather than restating a loose
  integration shape.
- Billing and Invoice Sales Receipt new/refund pages: independently narrow each
  result before accessing `.data` and remove the requested `PageDescription`
  copy. `sales-receipts-list.test.tsx` now uses the valid `PAID` status.
- `packages/billing-ui/src/sales-receipt-lifecycle-actions.tsx`: uses the
  host-provided Billing UI Link instead of importing `next/link`.
- `apps/billing-api/src/http/auth/__tests__/full-route-auth-matrix.test.ts`,
  `src/http/openapi/v1-contract.generated.ts`, and
  `apps/billing/contracts/v1/openapi.json`: refreshed frozen route artifacts
  and route-matrix counts. The generated diff contains only Sales Receipt
  tenant/integration routes and schemas, quote-to-Sales-Receipt conversion, and
  the Sales Receipt integration scopes.

## Migration comparison

I exported `main`'s Prisma schema files into `/tmp` outside the repository and
ran `prisma migrate diff --from-schema … --to-schema prisma/schema --script`
without any database connection. The Prisma 7 CLI produced no SQL when passed
the multi-file directory directly, so I also generated an equivalent temporary
single-file schema from those exported files for the comparison. Prisma expects
the Sales Receipt enum/table/index/FK additions and the Credit Note source
column/FK present in the hand-written migration. The hand-written SQL's only
intentional additional behavior is the Credit Note single-sale-source CHECK
constraint noted above; comments and statement ordering are non-semantic.

## Verification

| Command                                             | Status                                                                       | Exact final output line                                                                                                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @876/billing-api typecheck`          | passed                                                                       | `$ tsc --noEmit`                                                                                                                                                                                                                           |
| `pnpm --filter @876/billing-api lint`               | not completed by harness                                                     | `Pages directory cannot be found at /root/projects/876/apps/billing-api/pages or /root/projects/876/apps/billing-api/src/pages. If using a custom path, please configure with the no-html-link-for-pages rule in your eslint config file.` |
| `pnpm --filter @876/billing-api boundaries`         | passed                                                                       | `✔ no dependency violations found (601 modules, 1911 dependencies cruised)`                                                                                                                                                                |
| `pnpm --filter @876/billing-api test`               | passed before final formatting-only pass; rerun began but harness cut output | `Duration  26.14s (transform 10.10s, setup 6.11s, import 31.06s, tests 24.85s, environment 13ms)`                                                                                                                                          |
| `pnpm --filter @876/billing-api api:contract:check` | passed                                                                       | `response schema mismatches: 0`                                                                                                                                                                                                            |
| `pnpm --filter @876/billing-api db:validate`        | passed                                                                       | `The schemas at prisma/schema are valid 🚀`                                                                                                                                                                                                |
| `pnpm --filter @876/billing typecheck`              | passed                                                                       | `$ tsc --noEmit`                                                                                                                                                                                                                           |
| `pnpm --filter @876/billing test`                   | passed                                                                       | `Duration  5.35s (transform 1.81s, setup 0ms, import 8.00s, tests 1.59s, environment 5ms)`                                                                                                                                                 |
| `pnpm --filter @876/billing-ui typecheck`           | passed before the one-line host-link import correction                       | `$ tsc --noEmit`                                                                                                                                                                                                                           |
| `pnpm --filter @876/billing-ui test`                | not completed by harness                                                     | `Not implemented: navigation to another Document`                                                                                                                                                                                          |
| `pnpm --filter @876/billing-app typecheck`          | passed                                                                       | `$ tsc --noEmit`                                                                                                                                                                                                                           |
| `pnpm --filter @876/billing-app test`               | not completed by harness                                                     | `RUN  v4.1.11 /root/projects/876/apps/billing`                                                                                                                                                                                             |
| `pnpm --filter @876/invoice-app typecheck`          | passed                                                                       | `$ tsc --noEmit`                                                                                                                                                                                                                           |
| `pnpm --filter @876/invoice-app test`               | not run                                                                      | `not run`                                                                                                                                                                                                                                  |
| `node scripts/check-app-structure.mjs`              | failed, unrelated pre-existing scope violation                               | `See .claude/rules/app-structure.md`                                                                                                                                                                                                       |

The structure failure is `apps/console/src/components/shell/sidebar.tsx:
ConsoleHome` (`app-name-symbol-prefix`); it is outside the allowed task scope
and was not changed.

## Decisions and limitations

- The lock solution requires no new column or table. PostgreSQL row locking
  serializes all conversions of a quote; both relations are checked only after
  acquiring that lock.
- The single `as unknown as Prisma.TransactionClient` is confined to the quote
  guard's test fixture. It represents a deliberately partial mocked Prisma
  transaction at the library boundary; production signatures were not weakened.
- I did not touch the pre-existing untracked `plans/.../briefs/` directory.
- No commits, branch changes, pushes, database connections, or migration apply
  commands were performed.
