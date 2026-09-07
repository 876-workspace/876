# Orchestrator report — completion and verification

## Delegation outcome

Three Codex runs (`gpt-5.6-terra`, high) were dispatched against two briefs.
**All three exited 1 and none wrote the required report**, so each was judged
from the diff rather than a summary. Between them they produced the billing-api
routes, the serializer fix, the four shared panels, the integration and
currencies SDK resources, and a first cut of the finance route. The orchestrator
completed the rest.

## Defects found and fixed

| # | Defect | Found by | Fix |
| - | ------ | -------- | --- |
| 1 | `TaxRateSchema` required `isDefault` but `serializeTaxRate` never emitted it — every tax-rate response failed validation at runtime | diff review | serializer emits it; serializer test added |
| 2 | `CurrencyCreatedSchema` constrained `id` to 3 characters, tighter than the server's `z.string()` | contract review | relaxed to match the server |
| 3 | `currency-settings-panel` export key duplicated in `package.json` | diff review | deduped; JSON re-validated |
| 4 | `currencies.enable` test asserted the mutation shape; the route returns the created shape | test run | fixture corrected |
| 5 | Integration test expected "Billing API returned an invalid response"; the registry says "Billing service" | test run | expectation corrected against `transport.ts` |
| 6 | New integration paths absent from the Express-only contract inventory | test run | inventory updated with a rationale comment |
| 7 | `resource-manifest` no longer alphabetically sorted | test run | reordered |
| 8 | Finance `page.tsx` deleted by a later Codex run, leaving a 404 | user's dev server | recreated, formatted, with the access-state fix |
| 9 | Access state rendered a phantom `currencies` tab the viewer could not use | review | renders no tabs |
| 10 | Old `payment-modes` and `taxes` routes survived alongside the new one | review | removed; nav collapsed to one Finance item |

## Tests added

| Area | `it()` cases |
| ---- | ------------ |
| `payment-mode-settings-panel` | 10 |
| `tax-rate-settings-panel` | 11 |
| `tax-authority-settings-panel` | 11 |
| `currency-settings-panel` | 11 |
| `@876/billing` currencies resource | 8 |
| billing-api tax serializer | 3 |
| Invoice settings navigation (added to the existing file) | 6 |

## Verification

All run in the foreground, all green:

| Workspace | Result |
| --------- | ------ |
| `@876/billing` | typecheck ✅ · 308 tests ✅ |
| `@876/billing-ui` | typecheck ✅ · 380 tests ✅ |
| `@876/billing-api` | typecheck ✅ · boundaries ✅ · 637 tests ✅ |
| `@876/invoice-app` | typecheck ✅ · 352 tests ✅ |
| `@876/billing-app` | typecheck ✅ · 858 tests ✅ |
| `check-app-structure` | OK |

`grep` over every touched path found no `eslint-disable`, `@ts-ignore`,
`@ts-expect-error`, or `as any`.

## Known gaps

- **`pnpm --filter @876/billing-api lint` fails on `main` already** — one error in
  `modules/access/__tests__/finance-catalog-drift.test.ts` and three unused-var
  warnings in `http/errors.ts` and `providers/accounting/zoho-books/errors.ts`.
  None of those files are touched here; left alone deliberately.
- **Tenant payment-mode seeding was not requested.** It changes provisioning for
  every new workspace and could reasonably be its own pull request.
- **A parallel session left `plans/2026-09-07-invoice-finance-route-tabs/plan.md`**
  proposing route-level tabs instead of the client-state tabs built here. It is
  untracked, carries no code, and contradicts this design; it needs a decision
  before anyone acts on it.
