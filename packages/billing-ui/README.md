# @876/billing-ui

Reusable React surfaces for the 876 finance product domain, shared by `apps/billing` and `apps/invoice` today, and by Console's operator workspace when that lands.

This package owns presentation only. It must never contain routing, data loading, session or permission resolution, or any bounded service client. Hosts own those.

## Import Pattern

```tsx
import { ItemsTable } from '@876/billing-ui/items-table'
```

Import surfaces directly from subpaths. The package exports `@876/billing-ui/items-table` today.

## ItemsTableProps

| Prop              | Type                           | Description                                                                           |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `items`           | `ItemRow[]`                    | Catalog item records loaded and converted by the host.                                |
| `defaultCurrency` | `string`                       | Fallback currency code supplied by the host when item currency is omitted.            |
| `baseHref`        | `string`                       | Base path prefix supplied by the host because the host owns routing.                  |
| `formatAmount`    | `(amount, currency) => string` | Currency formatter supplied by the host to enforce app-specific missing-price policy. |
| `emptyState`      | `ReactNode`                    | Optional host view displayed when the items list is empty.                            |
| `showPriceCount`  | `boolean`                      | Optional flag enabled by hosts that model multiple selling prices per item.           |

`baseHref` and `formatAmount` are props rather than package-owned:

- `baseHref` because the host owns routing — the same table renders at `/items` in both apps and under `/orgs/<slug>/workspace/billing/items` in Console.
- `formatAmount` because a missing amount is host policy: Billing renders it as "Custom pricing", Invoice as an em dash, and hard-coding either would have forced a third money formatter into the repo.

## Adding a Surface

1. Add the component file under `src/`.
2. Add a subpath entry to the `exports` map in `package.json`.

The package is already registered in `scripts/shared-ui-packages.mjs`, so every app picks it up without editing its own `next.config.ts`.

## Transpilation

These packages ship raw TSX, so a missing entry in `scripts/shared-ui-packages.mjs` does not fail the build — it fails at runtime in the browser with `Element type is invalid`. `pnpm check:transpile` guards it.

## Commands

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
```
