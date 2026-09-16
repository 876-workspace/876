# Codex Brief — Shared Item Variant & media UI, composed by Billing and Invoice

**Run:** `plans/2026-09-07-item-variants-media`
**Branch:** `feature/item-variants-media` (already checked out — do NOT create, rename, merge, rebase, or delete any branch)
**Model:** gpt-5.6-terra, high reasoning

## Context

The backend, contracts, and both hosts' BFF routes for optional Item **variants** and 876
Storage-backed Item **media** are already implemented and on this branch. What is missing is the
presentation layer: there is currently no way for a user to author options, see generated variants,
or upload an item image. Your job is that layer.

The domain: an Item is `single` by default. When an organization enables the `product-variants`
preference on the `items` module, an Item may instead be `variant` mode — carrying up to three
Item-local **options** (e.g. Size, Colour), their values, and the generated sellable **variants**
(the cartesian product). The parent Item holds common facts; each variant may override SKU, selling
and cost amount, active status, stock quantity, and media. Media are 876 Storage files referenced by
**opaque `fileId`** — never an R2 key or a provider URL.

## Read these first — they are binding, not background

- `.agents/rules/finance-app-parity.md` — **the governing rule for this task.** 876 Invoice is a
  deliberately reduced 876 Billing over one financial data plane. A shared finance surface is
  defined **once** as a **panel** in `@876/billing-ui`; hosts compose it, and never re-implement it.
  The word is *panel* — not widget, not card, not section, not block. A panel **renders, it does not
  fetch**: no `@876/billing` client, no session helper, no `fetch`. It takes resolved plain data and
  callbacks, and it takes href builders as props rather than hard-coding a route.
- `.agents/rules/shared-product-ui.md` — the host/product ownership split.
- `.agents/rules/app-layout.md` — page containers, `ResourceToolbar`, form anatomy (`FormRow`,
  `Label` owns the label→control gap, required marker, hints as tooltips not paragraphs), the one
  page-title size (`876-page-title`), table cell hierarchy.
- `.agents/rules/app-structure.md` — where a file goes: route-local `_components/`, then
  `features/<domain>/`, then a package. Default to the narrowest bucket. No barrel `index.ts`.
- `.agents/rules/data-loading.md` — **render chrome immediately, suspend only what waits on I/O.**
  A create form must not be hidden because one select needs live options; keep the form mounted and
  put the loading state inside that one control.
- `.agents/rules/storage-architecture.md` — the upload flow, and why the client never chooses an
  object key, bucket, owner, category, or audience.
- `.agents/rules/testing.md`, `.agents/rules/types.md`, `.agents/rules/code-style.md`,
  `.agents/rules/ai-code-quality.md`.
- Root `CLAUDE.md` **UI Copy** (no explanatory paragraph under a heading; keep `Empty` states to a
  short title) and **UI Design** (**never a green button** — green is status-only; use `brand`/`info`).

## Your file scope — STAY INSIDE IT

You may edit only:

- `packages/billing-ui/**`
- `apps/billing/**`
- `apps/invoice/**`

You must **NOT** touch (other agents are working in these concurrently):

- `apps/billing-api/**`, `packages/billing/**`, `packages/storage/**` ← another Codex run
- `apps/storage-api/**` ← the orchestrator
- `plans/**` except your own report file named below

If you find you genuinely need a contract change outside your scope, **stop, skip that piece, and
report it** rather than reaching across.

## What to build

### A. Shared panels in `@876/billing-ui`

Follow the existing conventions in that package exactly — study `items-table.tsx`,
`item-stock-summary.tsx`, `item-stock-adjustment-form.tsx`, and `panels/customer-*-panel.tsx` for
the established prop, state, and test style before writing anything new.

1. **Item option builder** — add/remove up to **three** option dimensions, each with a name and its
   values. Enforce the max-three rule and per-Item uniqueness of option names and of values within
   an option, in the UI as well as the API. Show the resulting variant count as the user types.
2. **Generated variant table** — the cartesian product, with per-row SKU, selling amount, cost
   amount, stock quantity, and active toggle. Money is minor-unit integers / decimal **strings**
   end-to-end (`.agents/rules/billing-data-plane.md`) — a rate or amount must never be carried as a
   JS `number`. Numbers render `tabular-nums`; money columns are right-aligned.
3. **Variant detail / edit** presentation, including variant-level stock.
4. **Item / variant image gallery + uploader** — thumbnails, ordering, a primary image, detach, and
   the legacy `imageUrl` read fallback for Items that predate Storage media. The uploader is
   presentation only: it calls host-supplied callbacks for start/complete. A failed *complete* must
   be retryable **without re-uploading the bytes**.
5. **Variant chooser for the document line editor** — when a variant-mode Item is picked in a quote
   or invoice, the user must choose a concrete variant; the draft stores both `itemId` and
   `variantId`, and shows the variant label, SKU, and stock. Extend the existing shared document
   line-items editor rather than building a second one — `finance-app-parity.md` forbids a second
   line-item editor or a second totals calculation.

Each panel owns its own **empty, loading, and error** presentation via a discriminated `state` prop
— an empty list and a failed load are different pictures, and three hosts must not disagree about
what either looks like.

### B. Host composition — Billing **and** Invoice, at parity

Billing's item screens are at `apps/billing/src/app/(app)/items/` (`new`, `[itemId]`,
`[itemId]/edit`, `[itemId]/stock`, …); Invoice mirrors them. Wire the panels into:

- Item **create** — options and variant generation, available only when the preference is on;
- Item **edit** and **detail** — variant table, variant editing, media;
- Item **settings** — the `product-variants` preference toggle in each product's items settings;
- the **document line editor** — the variant chooser.

Both hosts render the **same panels**. A host difference is a **prop**, never a fork, and never a
branch on the host's name inside a panel. Billing may show more than Invoice (that is the product
difference); the shared surfaces must not diverge.

Data is loaded **in the host** through its existing bounded client / BFF routes that already exist
on this branch, then passed down as plain props. Mutations go through the host's typed browser
client to its own same-origin `/api/...` route — **no server actions**.

**When the preference is off, none of the variant authoring UI appears at all** — and hiding it is
UX, not security: the API guard is the boundary and already exists.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`, no `as any`.**
- **Do not weaken production code for testability** — do not make a required prop optional, do not
  remove a `ResourceToolbar`, do not loosen a signature so a test renders more easily.
- No fetching, session reading, or permission checking inside a `@876/billing-ui` panel.
- No hard-coded hrefs inside a panel.
- No green buttons.
- No explanatory `<p>` under a heading.
- **Do not commit.** The orchestrator stages and commits. No AI attribution anywhere.
- If a panel needs a new shared package dependency, do not add one — report instead.

## Tests — floors, not suggestions

- **≥ 14 `it()` cases** across the new `@876/billing-ui` panels: option builder max-three and
  uniqueness rules, generated-row count for a given option set, money rendered from strings without
  precision loss, media empty vs failed vs loaded states, legacy `imageUrl` fallback, upload
  retry-without-re-upload, variant chooser selection storing both ids.
- **≥ 4 `it()` cases per host** (Billing and Invoice) covering: preference off hides variant
  authoring, preference on reveals it, the create flow submits the expected payload, and the two
  hosts render the same variant/media state.

Assert full shapes and exact call arguments (`toHaveBeenCalledWith`), never bare `toBeDefined()` or
`toHaveBeenCalled()`. Check each package's `vitest.config.ts` **environment** before writing a
component test — a suite written for the wrong environment never executes.

## Verification — run these yourself, and report the real output

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

All of these are currently green except for the work you are adding — so any failure is yours.

## Report

Write `plans/2026-09-07-item-variants-media/reports/codex/2026-09-07-shared-variant-media-ui.md`
containing: every panel added and the host screens that compose it; the **counted** number of
`it()` cases per file; the decisions the brief did not settle; anything you skipped because it fell
outside your file scope; the full verification output; and any gap you are leaving, stated plainly.
A truthful "not done" beats a confident claim.
