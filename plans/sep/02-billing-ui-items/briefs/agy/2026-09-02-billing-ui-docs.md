# Task: document the new `@876/billing-ui` package

Repo root: `/root/projects/876`. Branch: `feature/product-navigation-registries`.
**Docs only.** Do not touch any `.ts`, `.tsx`, `.json`, or `.mjs` file.

Orchestrator note (not an instruction to you): this brief is dispatched by the
primary agent via the `agy` CLI. Do not shell out to `agy` yourself.

## Context you must read first

1. `packages/billing-ui/src/items-table.tsx` — the package's only export today.
2. `packages/billing-ui/package.json` — name, exports map, dependencies.
3. `packages/ui/README.md` — **copy this file's tone, heading style and length.**
   It is the template. Do not invent a different structure.
4. `.claude/rules/shared-product-ui.md` — the rule this package implements.

## Deliverable 1 — `packages/billing-ui/README.md` (new file)

Write it in the voice of `packages/ui/README.md`. It must state:

- **What the package is:** reusable React surfaces for the 876 finance product
  domain, shared by `apps/billing` and `apps/invoice` today, and by Console's
  operator workspace when that lands.
- **What it must never contain:** routing, data loading, session or permission
  resolution, or any bounded service client. Hosts own those. This is the rule
  from `.claude/rules/shared-product-ui.md`; restate it briefly, do not quote the
  whole rule.
- **The one export today**, `@876/billing-ui/items-table`, with a short prop
  table for `ItemsTableProps` taken from the actual source: `items`,
  `defaultCurrency`, `baseHref`, `formatAmount`, `emptyState`, `showPriceCount`.
  One line each, describing what the host supplies and why.
- **Why `baseHref` and `formatAmount` are props rather than package-owned.**
  `baseHref` because the host owns routing — the same table renders at `/items`
  in both apps and under `/orgs/<slug>/workspace/billing/items` in Console.
  `formatAmount` because a missing amount is host policy: Billing renders it as
  "Custom pricing", Invoice as an em dash, and hard-coding either would have
  forced a third money formatter into the repo.
- **A short "adding a surface" section:** add the file under `src/`, add a
  subpath to the `exports` map in `package.json`, and note that the package is
  already registered in `scripts/shared-ui-packages.mjs` so every app picks it up
  without editing its own `next.config.ts`.
- **The transpile warning:** these packages ship raw TSX, so a missing entry in
  `scripts/shared-ui-packages.mjs` does not fail the build — it fails at runtime
  in the browser with `Element type is invalid`. `pnpm check:transpile` guards it.

Keep it under 90 lines. No marketing language. No emoji.

## Deliverable 2 — update the rule's package list

In **both** `.claude/rules/shared-product-ui.md` and
`.agents/rules/shared-product-ui.md`, line 17 currently reads:

```
Existing packages include `@876/crm-ui` and `@876/work-ui`. A domain with one host stays app-local until a second host needs the same product surface.
```

Change it to name all four packages that now exist — `@876/crm-ui`,
`@876/work-ui`, `@876/access-ui`, and `@876/billing-ui` — keeping the second
sentence exactly as it is.

**The two files must remain byte-identical after your edit.** `CLAUDE.md`
requires it. Change nothing else in either file.

## Verify before you report done

```bash
diff .claude/rules/shared-product-ui.md .agents/rules/shared-product-ui.md   # must print nothing
git status --short                                                          # only the 3 expected files
```

Report which files you changed and paste the `diff` result.

## Do not

- Do not edit any file other than the three named above.
- Do not create a `packages/billing-ui/docs/` directory.
- Do not run a formatter over the repository.
- Do not commit, branch, or push. The orchestrating agent commits.
