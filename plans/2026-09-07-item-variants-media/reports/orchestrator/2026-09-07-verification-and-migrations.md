# Orchestrator Report — verification, migrations, Storage authorization

**Run:** `2026-09-07-item-variants-media`
**Branch:** `feature/item-variants-media`
**Date:** 2026-09-07

## Why this report exists

GPT web wrote the branch and executed nothing — no typecheck, no test, no
migration. Its own report says so plainly, and that honesty is what made this
pass cheap. This records the first execution the branch ever received.

## Measured state on pull (before any fix)

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | **failed** — `@876/storage` added to `apps/billing/package.json`, lockfile never updated |
| `@876/billing-api typecheck` | **6 errors** — `StockLine.variantId` missing from `stock.test.ts` fixtures |
| `@876/billing typecheck` | **1 error** — `BillingCustomerCreated` type export dropped from `integration/types/index.ts` |
| `@876/billing-app` / `@876/invoice-app` typecheck | **failed**, both on the single `@876/billing` error above |
| `@876/billing-api test` | **6 failed / 621 passed** — stock fixtures, frozen route-auth matrix, frozen OpenAPI contract |
| `@876/billing test` | **2 failed / 286 passed** — items resource contract, settings catalog |
| `@876/storage test` | **3 failed / 386 passed** — frozen error-code set, frozen client surface |
| `@876/storage-api test` | **1 failed / 524 passed** — `ENTITY_PREFIXES` missing `resource_link` |
| `@876/billing-ui test` | 321 passed |
| `@876/billing-app` / `@876/invoice-app` test | 858 and 346 passed |
| `@876/billing-api boundaries` | clean |
| `node scripts/check-app-structure.mjs` | clean |

Every failure is a frozen-contract or fixture that was never updated to match
an intentional new surface — the exact and predictable consequence of writing
code you cannot run. None was a design error.

**Not caused by this branch, left alone:**
`apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts`
fails `@next/next/no-assign-module-variable`. It is pre-existing on `main`
(last touched by `9a9ae9a1`), so fixing it here would be unrelated churn.

## Fixed directly by the orchestrator

1. **`packages/billing/src/integration/types/index.ts`** — restored the dropped
   `export type { BillingCustomerCreated }`. One line, and it was blocking
   typecheck in the package and both app hosts.
2. **`pnpm-lock.yaml`** — recorded the real `@876/storage` dependency (6 lines;
   verified it is a genuine dependency change, not environment churn).
3. **`apps/storage-api`** — the authorization gap below.

Everything else was delegated to Codex `gpt-5.6-terra` at high reasoning across
two briefs with non-overlapping file scopes.

## Storage resource-link authorization — the one security finding

GPT web flagged this honestly in its own report and left it. It is real, and it
was the reason this piece was not delegated: `.claude/rules/cli.md` reserves
security-sensitive work for the primary agent.

The `/v1` boundary authenticates a **service, not a person** — the shared
internal key proves only that *some* 876 service is calling. As shipped:

- `list` checked nothing beyond the key, so any key holder could enumerate
  which items, invoices, or conversations in **another organization** carry
  media;
- `delete` checked nothing, so any key holder could detach another
  organization's branding from its own record;
- `create` verified the file matched the owner named in the request body — but
  that owner is the **caller's own claim**. Matching it proves the caller
  guessed the owner id correctly, not that it *is* the owner.

### The fix

All three routes now consult the files domain's existing
`domains/files/authorization.py` rather than growing a second authorization
implementation (`ai-code-quality.md`: find the existing owner first). A link is
only ever as disclosable as the file behind it.

- **create** additionally requires `authorize_file_read` — a file can only be
  attached by a caller entitled to read it.
- **list** resolves each link's file and returns only the readable ones.
  Storage knows who owns a *file*; it cannot know who owns another app's
  *resource*. So an unauthorized caller gets an **empty list, not a denial** —
  a 403 would confirm the resource exists and carries media, which is precisely
  the enumeration being prevented.
- **delete** requires `authorize_file_delete`, which unlike read does **not**
  open up for `public` files. An organization logo is world-readable so it can
  render in an `<img>`; that is not a licence for another app to strip the
  branding. World-readable is not world-detachable.

Every denial answers with the same 404 as a missing link, byte for byte, so
neither endpoint becomes an oracle for which ids exist. One test asserts the
two responses are identical.

### Evidence it works

15 tests added in `tests/test_resource_link_authorization.py`. **12 of them fail
against the previous router** — verified by stashing only the router file and
re-running. A test that cannot fail is not a test.

`storage-api`: **540 passed**, ruff clean, mypy clean, ruff-format clean.

## Migrations — applied

Against the Neon `billing` database (`ep-curly-shadow-aws12mci`):

```
20260907120000_merge_estimates_into_quotes   applied
20260907190000_item_stock_tracking           applied
20260907210000_item_variants_media           applied
```

The first two were already on `main` and had never been applied — the dev
database was three migrations behind. `prisma migrate deploy` (never
`migrate dev`) was used. `db:migration:check` now reports **"Database schema is
up to date!"**

Storage: `alembic upgrade head` applied `202609070001_create_resource_links`.

### Residual drift, pre-existing and out of scope

`db:drift` still reports four items, none related to this branch:

- an orphaned `BillingInterval` enum in the database that no model references;
- three index-name differences on `billing_plans`, `billing_prices`, and
  `billing_subscriptions`.

These are cosmetic and predate this work. They should be resolved by a
deliberate migration of their own, not folded into a feature branch.

## Delegated to Codex

| Brief | Scope |
| --- | --- |
| `2026-09-07-backend-contract-repair.md` | `apps/billing-api`, `packages/billing`, `packages/storage` — the six measured failures, plus ≥7 new variant stock tests |
| `2026-09-07-shared-variant-media-ui.md` | `packages/billing-ui`, `apps/billing`, `apps/invoice` — shared panels and host composition, ≥14 + ≥4/host tests |

Both were told explicitly not to touch `apps/storage-api` (the orchestrator was
editing it), not to touch each other's scope, and not to commit.
