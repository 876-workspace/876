# Billing SDK parity

## Added surface

- `quotes.create` — `POST /api/v1/quotes`
- `quotes.retrieve` — `GET /api/v1/quotes/:quoteId`
- `quotes.update` — `PATCH /api/v1/quotes/:quoteId`
- `quotes.delete` — `DELETE /api/v1/quotes/:quoteId`
- `invoices.retrieve` — `GET /api/v1/invoices/:invoiceId`
- `invoices.update` — `PATCH /api/v1/invoices/:invoiceId`
- `invoices.delete` — `DELETE /api/v1/invoices/:invoiceId`
- `creditNotes.list` — `GET /api/v1/credit-notes`
- `creditNotes.create` — `POST /api/v1/credit-notes`
- `creditNotes.apply` — `POST /api/v1/credit-notes/:creditNoteId/apply`
- `creditNotes.void` — `POST /api/v1/credit-notes/:creditNoteId/void`

All paths, methods, and request/response families were verified against
`apps/billing-api/src/modules/documents/documents.routes.ts`. Quote and invoice
delete methods return typed tombstones. Credit notes use the literal
`credit_note` discriminator and shared list schema.

## Tests

`packages/billing/src/resources/__tests__/documents.test.ts` contains 24
executed cases: every quote, invoice, and credit-note operation (including
existing transitions), two returned-application-error cases, and quote and
credit-note ID encoding cases. The focused run passed:

```
Test Files  1 passed (1)
Tests  24 passed (24)
```

## Verification

| Command | Result |
| --- | --- |
| `pnpm --filter @876/billing typecheck` | Passed: `tsc --noEmit` |
| `pnpm --filter @876/billing exec vitest run src/resources/__tests__/documents.test.ts` | Passed: 24 tests |
| `pnpm --filter @876/billing test` | Blocked by 3 unrelated, concurrent `src/settings-catalog.test.ts` assertions: the catalog now includes `crm` and one module is disabled by default; the new document suite has no failures. |
| `pnpm --filter @876/billing-ui typecheck` | Passed: `tsc --noEmit` |
| `pnpm --filter @876/billing-app typecheck` | Passed: `tsc --noEmit` |
| `pnpm --filter @876/invoice-app typecheck` | Passed: `tsc --noEmit` |

`git fetch origin` completed. Both initial and final `git pull --ff-only origin
feature/customer-contacts-ui` attempts could not pull because the named remote
branch does not exist; the local branch has no configured upstream.
