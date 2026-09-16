# Brief: remove `next/link` from `@876/billing-ui` via a host-supplied link

Branch: `refactor/billing-ui-host-link` (already checked out, stacked on
`feature/invoice-lifecycle-hardening`). Repo root `/root/projects/876`.

## Why

`packages/billing-ui` is a shared product-UI package consumed by three Next
hosts: `apps/billing`, `apps/invoice`, `apps/console`. Eleven of its components
import `next/link` directly. Per `.agents/rules/shared-product-ui.md` a
`<product>-ui` package must not own routing — hosts supply hrefs and routing.
Binding the package to `next/link` also makes it unusable from any non-Next
host later.

The naive fix — swapping `<Link>` for `<a>` — is **wrong** and must not be
done: it silently drops client-side navigation and prefetching, turning every
in-app link into a full page reload. That regression was already caught once on
the parent branch and reverted.

## The design (decided — implement exactly this, do not redesign)

Add `packages/billing-ui/src/link.tsx`:

- `export type BillingUiLinkComponent` — a component type accepting at minimum
  `href: string`, `className?: string`, `children`, and passing through the
  usual anchor props. Model it so `next/link` satisfies it without a cast.
- `export const BillingUiLinkProvider` — a React context provider taking a
  `component: BillingUiLinkComponent` prop.
- `export function Link(...)` — the component every billing-ui source uses. It
  reads the context and renders the host-supplied component; when no provider
  is present it falls back to a plain `<a>`, so the package still renders
  standalone (Storybook, tests, a non-Next host).

Mark the file `'use client'` if the surrounding components require it — match
what the existing components already do.

Then, in each of these eleven files, replace `import Link from 'next/link'`
with an import of the package's own `Link` (`'./link'`, or `'../link'` /
`'../../link'` from inside `panels/`). **Do not change any JSX beyond the
import** — the element stays `<Link href=...>`:

```
src/bank-accounts-grid.tsx
src/customer-contact-form.tsx
src/customers-table.tsx
src/invoice-lifecycle-actions.tsx
src/invoices-table.tsx
src/items-table.tsx
src/payments-table.tsx
src/panels/customer-contacts-panel.tsx
src/panels/customer-transactions-panel.tsx
src/panels/access/role-members-panel.tsx
src/panels/access/roles-list-panel.tsx
```

`src/panels/panel.test.ts` also matches a grep for `next/link`, but only as a
**fixture string inside the test**. Do not treat it as an import and do not
break that fixture.

Export the new module from the package the same way its siblings are exported —
check `packages/billing-ui/package.json` for the subpath export convention and
follow it. Do not add a barrel that re-exports the whole directory.

## Host wiring

All three hosts must provide `next/link`, or their links silently degrade to
the `<a>` fallback:

- `apps/billing`
- `apps/invoice`
- `apps/console`

Put `BillingUiLinkProvider` in each host's existing client provider composition
(look under `src/components/providers/`) rather than inventing a new shell.
Console renders billing-ui panels inside its organization workspace — make sure
the provider is above those, not only above the app root if that differs.

## Second, unrelated fix in the same PR

`plans/2026-09-07-invoice-lifecycle-hardening/plan.md:201` claims 35 new
literal `it()` declarations for the run. The true figure is **34 direct `it()`
calls plus 2 `it.each()` declaration sites (36 declaration sites total)**.
Correct that line so the plan states the real counts, and keep the surrounding
wording accurate. Do not restructure the plan or touch anything else in it.

## Required test

Add a boundary test in the package asserting that **no** source file under
`packages/billing-ui/src` imports `next/link` (excluding the `panel.test.ts`
fixture string). Model it on the existing walker in
`src/panels/panel.test.ts` — that file already shows how to parse import
statements properly, and explains why a single lazy regex gets it wrong. Reuse
that approach rather than writing a new naive regex.

Also add focused tests for the new `Link`: that it renders the host-supplied
component when a provider is present, and falls back to an anchor when it is
not. Assert real rendered output, not that a mock was called.

## Hard constraints

- **Do not commit, push, merge, rebase, or create/delete/rename any branch.**
  Stay on `refactor/billing-ui-host-link`. The orchestrator commits.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`. If
  `next/link`'s type genuinely will not satisfy the contract without a cast,
  that means the contract type is wrong — fix the type, do not cast.
- Do not change any component's rendered markup, class names, or props beyond
  the import swap and the provider wiring.
- Do not "improve" anything else you notice. Report it instead.
- Do not redirect stdout to any file inside the repository.

## Verification — run all of these in the foreground and make them pass

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
```

If a test suite is slow, shard it rather than skipping it. Report real numbers.

## Report

Write `plans/2026-09-07-invoice-lifecycle-hardening/reports/codex/2026-09-08-billing-ui-host-link.md`:
every command with its real result and test counts, every file changed and why,
anything you could not verify, and any finding you chose not to fix with
file:line.
