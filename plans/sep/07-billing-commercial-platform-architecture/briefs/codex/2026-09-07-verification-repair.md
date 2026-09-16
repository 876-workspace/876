# Brief: Repair verification failures on the Billing commercial platform branch

**Branch:** `feature/billing-commercial-platform-architecture` (already checked out; do NOT create, switch, merge, or rebase branches)
**Run:** `plans/2026-09-07-billing-commercial-platform-architecture/`
**Model note:** you are Codex, invoked by the orchestrating Claude agent. Do **not** commit. The orchestrator stages and commits.

## Context

GPT Web implemented Phases 0–17 of the Billing commercial platform refactor on this branch
(~116 commits). It cannot execute a shell, so nothing it wrote has ever been run. The
orchestrator has now run the verification suite. Five defects block the gate. Your job is to
fix all of them without weakening any gate, and without undoing the architecture GPT Web built.

The architecture intent is recorded in:
- `.claude/rules/billing-commercial-platform.md`
- `docs/architecture/013-billing-commercial-platform.md`
- `plans/2026-09-07-billing-commercial-platform-architecture/plan.md`

**Read these before writing code:** `.claude/rules/express-api.md`, `.claude/rules/ai-code-quality.md`,
`.claude/rules/billing-commercial-platform.md`, `.claude/rules/testing.md`, `.claude/rules/error-handling.md`,
`.claude/rules/naming.md`.

---

## Defect 1 — `calculateCatalogAmount` call sites use the removed 2-argument form (4 typecheck errors + 4 test failures)

The canonical calculator is `apps/billing-api/src/modules/billing-engine/calculations.ts`:

```ts
export function calculateCatalogAmount(options: {
  pricingModel: PricingModel
  unitAmount: bigint | null
  quantity: number
  packageSize?: number | null
  tiers?: readonly PriceTier[]
}): bigint
```

`quantity` moved **into** the options object. Four call sites still pass `(price, quantity)`.
Because JS ignores the extra argument, `quantity` arrives `undefined` and the function throws
`Quantity must be a positive integer.` at runtime — this is the cause of all four test failures.

Call sites to fix:
- `src/modules/catalog/repositories/price-lists/resolve.ts:32`
- `src/modules/catalog/repositories/price-lists/resolve.ts:64`
- `src/modules/subscriptions/repositories/bill.ts:176`
- `src/modules/subscriptions/repositories/preview.ts:77`

Each currently reads like `calculateCatalogAmount({ ...price, unitAmount }, quantity)`.
Fold `quantity` into the single options object. Do **not** change the calculator signature back —
the single-object form is the intended canonical contract.

Failing tests (all in `src/modules/subscriptions/__tests__/bill.test.ts`) must pass unchanged.
Do not edit those tests to accommodate broken production code.

## Defect 2 — 20 circular dependency violations (`pnpm --filter @876/billing-api boundaries`)

`main` is clean: `no dependency violations found (515 modules)`. This branch introduces 20
`no-circular` errors. They are all the same cycle, entered from several roots.

The cycle:

```
catalog/repositories/price-lists/resolve.ts
  → @/modules/billing-engine            (barrel: index → routes → controller → service → repository)
  → billing-engine.repository.ts
  → @/modules/subscriptions             (barrel: index → routes → controller → service)
  → subscriptions.service.ts → repositories/bill.ts
  → @/modules/catalog                   (barrel)
  → catalog.service.ts → repositories/price-lists/resolve.ts   ← closes the loop
```

Two GPT Web changes created it:
1. `catalog/repositories/price-lists/resolve.ts:3` imports `calculateCatalogAmount` from
   `@/modules/billing-engine` — importing a **module barrel** that transitively pulls routes,
   controllers, and the subscriptions module.
2. `catalog/index.ts:1` re-exports `calculateCatalogAmount` from `@/modules/billing-engine`,
   so `subscriptions` reaches the calculator *through catalog*, adding the return edge.

`calculateCatalogAmount` and `applyPercentageAdjustment` are **pure deterministic functions**:
no Prisma, no I/O, no domain coordination. They are exactly the kind of thing the shared
commercial kernel exists for.

Fix the cycle **structurally**, not by relaxing the depcruise rule. Preferred approach, in order:

1. Move the pure calculation primitives into the shared commercial kernel (the `commerce`
   module GPT Web added) or another leaf module that imports no other domain module, and have
   `billing-engine`, `catalog`, `pricing`, and `subscriptions` all import from that one owner.
2. Remove the `catalog/index.ts` re-export of `calculateCatalogAmount` entirely. Catalog is not
   the owner of pricing arithmetic, and per `ai-code-quality.md` a barrel that only renames
   another module's export is a duplicate path, not an abstraction. Update
   `subscriptions/repositories/bill.ts:11` and `preview.ts:6` to import from the real owner.
3. Only if 1 and 2 genuinely cannot resolve it, propose splitting the offending module barrels
   so a pure-calculation entrypoint does not drag routes/controllers — and say so in your report.

**Do not** add a depcruise exception, do not add `eslint-disable`, and do not weaken
`.dependency-cruiser.cjs`. The rule caught a real defect.

`pnpm --filter @876/billing-api boundaries` must report zero violations.

## Defect 3 — invented Storage error code (`@876/billing` typecheck)

`packages/billing/src/server/item-media.test.ts:134` asserts on
`'storage/resource-link-conflict'`. **That code does not exist** anywhere in the repo.
The real, registered codes are in `packages/storage/src/types/common.ts`; the resource-link one is
`'storage/resource-link-not-found'`.

Decide correctly rather than mechanically:
- The test is named *"recovers an existing exact Storage link before retrying Billing attach"*,
  so it is exercising a **conflict/already-linked** path.
- If the Storage API genuinely returns a distinct already-exists error for
  `resourceLinks.create`, find that real registered code (check `apps/storage-api` and
  `packages/core/src/lib/errors/`) and use it.
- If Storage has no such code and the behaviour is real and needed, register the error properly
  in its owning catalog per `error-handling.md` — one canonical definition, added to
  `packages/storage/src/types/common.ts`, the storage-api error registry, and the parity test —
  rather than fabricating a string in a consumer's test.
- If the recovery path does not actually exist in the implementation, fix the test to describe
  what the code really does.

State which of these you chose and why, in your report.

## Defect 4 — lint error blocking the gate

```
src/modules/access/__tests__/finance-catalog-drift.test.ts
  27:10  error  Do not assign to the variable `module`.  @next/next/no-assign-module-variable
```

This is **pre-existing on `main`** (the file is unchanged by this branch), but the lint gate must
be green before this branch merges. Fix it minimally: rename the `for (const module of ...)` loop
variable to something non-reserved (e.g. `permissionModule`) in that test file only. Do not
reformat or restructure the file, and do not touch the three unrelated pre-existing warnings.

## Defect 5 — verify nothing else regressed

After fixing 1–4, confirm the whole suite. In particular:
- `apps/billing-api` has **658 tests**; the count must not drop. If your fix makes a test
  obsolete, replace it rather than deleting coverage.
- `pnpm --filter @876/billing-api api:contract:check` currently passes with **zero** wire
  differences. It must still pass with zero — this branch is not allowed to change the public
  v1 contract.

---

## Out of scope — do not touch

- Do not run `prisma migrate deploy` or any migration against a live database.
  `db:migration:check` currently reports pending migrations; that is expected and is the
  orchestrator's concern, not yours.
- Do not modify `pnpm-lock.yaml` (the orchestrator already regenerated it).
- Do not create, rename, delete, merge, or rebase branches. Do not open a pull request.
- Do not commit. Leave all changes in the working tree.
- Do not add `as any`, `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`.
- Do not add speculative commerce features (orders, channels, fulfillment, warehouses).
  See the non-goals in `plan.md`.

## Verification commands — run all of these yourself, in the foreground

```bash
pnpm --filter @876/billing-api generate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/storage typecheck
pnpm --filter @876/storage test
```

Every one must be green before you report done. Report the real output; do not claim a pass you
did not see.

## Report

Write `plans/2026-09-07-billing-commercial-platform-architecture/reports/codex/2026-09-07-verification-repair.md`
containing: per-defect status, exactly which files you changed and why, the structural decision
you made for Defect 2 and the reasoning, the choice you made for Defect 3, the final test counts
per package, the verbatim tail of each verification command, and anything you could not fix with
the reason. Do not write a run log or transcript anywhere in the repository.
