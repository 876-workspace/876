# Billing list toolbar standard — part 2

## Converted list surfaces

| List surface | Heading | Add | Menu |
| --- | --- | --- | --- |
| Streaming resource lists: catalog add-ons, coupons, plans, price lists, prices, products; subscriptions; vendors; sales receipts, invoices, quotes, recurring invoices, credit notes | Shared `StatusFilterHeading`; `All <title>` is now the first option | Shared wrapper normalizes permitted creates to `Add` | Shared toolbar provides Refresh plus disabled Import and Export |
| Banking | Shared status heading, first option `All Banking` | `/banking/new`, retained with an open account | Refresh, Import, Export |
| Payments Received | `All Payments Received` | `/payments/new`, retained with an open payment | Refresh, Import, Export |
| Price Lists | Shared heading, first option `All Price Lists` | `/price-lists/new`, retained with an open price list | Refresh, Import, Export |
| Items and Customers | First option now names the resource | Existing permission-gated Add retained | Existing Refresh inherits Import and Export |
| Expenses | `All Expenses` | Omitted: no create route exists | Refresh, Import, Export |
| Accounting Providers | `All Accounting Providers` | Existing permission-gated `/settings/accounting-providers/new` Add retained | Refresh, Import, Export |
| Adopt provider records | `All Provider Records` | Omitted: this is an adoption queue with no create route | Refresh, Import, Export |
| Billing UI roles | Existing shared heading and Add retained | Existing `/roles/new` Add retained open or closed | Refresh, Import, Export |

## Status gaps

- Payments Received and Expenses expose only the `all` heading because their list calls do not accept a lifecycle-status parameter.
- Accounting Providers and the provider-record adoption queue expose only `all`; their current service calls have no status parameter. No client-side filtering or API/SDK changes were added.

## Intentionally skipped

- Detail, create, edit, settings-form, dashboard, and document action toolbars were not list pages.
- Expenses and provider-record adoption intentionally have no Add action because no existing create route exists.

## Tests

Added 9 `it()` cases: six toolbar-standard regressions (including Billing UI roles) and three split-view tests proving Add remains supplied with an open record (Payments Received, Banking, Price Lists).

## Verification

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter ./apps/billing typecheck`: passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter ./apps/billing lint`: passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter ./apps/billing test`: passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @876/billing-ui typecheck`: passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @876/billing-ui test`: passed. Vitest emitted four non-failing jsdom `Not implemented: navigation to another Document` notices.
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/check-app-structure.mjs`: passed (`app-structure: OK`).
- `rg -n 'eslint-disable|as any|@ts-ignore'` across every changed file in `apps/billing/**` and `packages/billing-ui/**`: no matches.
