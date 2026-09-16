# Implementation Plan: Shared finance product UI — items table

- **Run ID:** `2026-09-02-billing-ui-items`
- **Branch:** `feature/product-navigation-registries`
- **Status:** COMPLETED ✅

## Overview

Create `@876/billing-ui` and land its first real surface, so Console's operator
workspace has a shared items table to render when its data path exists.

Billing and Invoice each carried their own `ItemsTable`. The two files were the
same component — identical columns, markup, and row-click behaviour — differing
only in that Invoice's lacked the price-count column and typed the amount as a
serialized string rather than Prisma's `BigInt` minor units. Console needs the
same table a third time, which is exactly the threshold `shared-product-ui.md`
sets for extraction.

## Key design decisions

**Two differences became props, not forks.** `baseHref` because the host owns
routing (both apps pass `/items`; Console will pass its workspace path).
`formatAmount` because a missing amount is product policy — Billing renders
"Custom pricing", Invoice an em dash. Owning a formatter in the package would
have added a third money formatter to a repo that already has two that disagree
on exactly this case.

**`showPriceCount` is opt-in** so Invoice, which does not model several prices
per item, does not render a column of zeroes. **`defaultSellingAmount` accepts
`bigint | string | null`** so neither host converts on every row.

**`ResourceRowLink` was promoted to `@876/ui` rather than copied a third time.**
Billing and Invoice each had a copy, identical but for the icon alias imported.
`app-structure.md` calls `components/patterns/` a waiting room; a third consumer
appeared, so it graduated. Nine call sites moved.

**The package targets ES2020**, not the ES2017 in the `crm-ui` template it was
scaffolded from, because it handles `BigInt` minor units by design and both
consuming apps already target ES2020.

## Delegation

| Work                                                            | Who                            | Why                                                       |
| --------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Package, extraction, host adoption, `ResourceRowLink` promotion | Primary agent                  | Codex quota exhausted; this is cross-cutting package work |
| README + shared-product-ui rule list                            | `agy`, `gemini-3.8-flash-high` | Docs-only, matches the `cli.md` routing table             |

Brief: [briefs/agy/2026-09-02-billing-ui-docs.md](./briefs/agy/2026-09-02-billing-ui-docs.md)

`agy` was updated first (`agy update` — already on 1.1.24, the latest) and its
quota checked before dispatch: Gemini 30% weekly / 100% five-hour, **Claude and
GPT 0% weekly** until 2026-09-06. That 0% is why the Sonnet half of the request
could not run; it is a separate bucket from the Gemini one.

Its output was verified against `git status`/`diff` rather than its report, per
`cli.md`. It matched, the rule mirrors stayed byte-identical, and it followed
`packages/ui/README.md`'s heading style as instructed.

## Checklist

- [x] `packages/billing-ui` scaffolded with tsconfig, vitest config, exports map
- [x] `ItemsTable` extracted with `baseHref` / `formatAmount` / `showPriceCount`
- [x] 17 package tests, including both hosts' base-href and money policies
- [x] `ResourceRowLink` promoted to `@876/ui`; both app copies deleted
- [x] Billing and Invoice adopt the package; both local tables deleted
- [x] Billing's skeleton-column parity test follows the component
- [x] `@876/billing-ui` registered in `scripts/shared-ui-packages.mjs`
- [x] README + shared-product-ui rule updated (both mirrors)

## Verification

All run in the foreground by the orchestrator.

| Command                                                        | Result                              |
| -------------------------------------------------------------- | ----------------------------------- |
| `pnpm --filter @876/billing-ui typecheck`                      | clean                               |
| `pnpm --filter @876/billing-ui test`                           | 17 passed                           |
| `pnpm --filter @876/billing-app typecheck`                     | clean                               |
| `pnpm --filter @876/billing-app lint`                          | 0 errors (14 pre-existing warnings) |
| `pnpm --filter @876/billing-app test`                          | 743 passed, 69 files                |
| `pnpm --filter @876/invoice-app typecheck`                     | clean                               |
| `pnpm --filter @876/invoice-app lint`                          | 0 errors (3 pre-existing warnings)  |
| `pnpm --filter @876/invoice-app test`                          | 213 passed, 25 files                |
| `pnpm check:transpile`                                         | OK                                  |
| `node scripts/check-app-structure.mjs`                         | OK                                  |
| `grep -rn "eslint-disable\|@ts-ignore\| as any"` over new code | nothing                             |

## Handoff state

Commits: `581d6e3f` (ResourceRowLink), `03f74a71` (package), `092757a5` (host
adoption), `4205c433` (docs). Branch not pushed; no PR opened.

### Correction: Console could read finance data all along

An earlier version of this section claimed Console could not fetch items and
needed a new billing-api operator route, an admin resource, and a Console
module. **That was wrong**, and it was wrong because only
`packages/billing/src/admin/client.ts` was checked.

What is actually true, verified in `apps/billing-api/src/http/auth/guards.ts`:
an `integration`-kind route has an explicit internal-credential branch that
resolves the tenant from the `:organizationId` path and returns
`platformAdmin: true` **without** requiring an app finance connection or its
scopes — which is correct, because 876 acting as operator is not a third-party
app. `catalog.controller.ts` then drops its source-app filter for that
principal, so a platform admin sees the whole tenant catalog.

Console's `billing` export is `create876BillingServiceClient`, which aliases the
integration client, already configured with `BILLING_INTERNAL_KEY`. So
`billing.items.list(orgId)`, `billing.invoices.list(orgId)` and
`billing.customers.list(orgId)` worked before this run began. No billing-api
change and no new client resource were needed.

### Console workspace: what now renders real data

| Route                        | Source                                              |
| ---------------------------- | --------------------------------------------------- |
| `workspace/billing/items`    | `billing.items.list` + tenant currency              |
| `workspace/invoice/items`    | same tenant catalog — one finance plane, two views  |
| `workspace/invoice/invoices` | `billing.invoices.list` + one batched customer page |

Still placeholders: both workspace overviews, `billing/subscriptions`, and
`billing/accounts`. `billing.subscriptions` and `billing.customers` are
available on the same client, so these are page work rather than plumbing.

The operator permission projection remains unbuilt. It is now genuinely the
next thing worth doing, since real product screens render in Console and the
operator currently sees them on Console permissions alone.
