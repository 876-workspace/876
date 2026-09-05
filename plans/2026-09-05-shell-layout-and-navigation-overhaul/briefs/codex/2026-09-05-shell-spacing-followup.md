# Follow-up: the gutter still doubles on every page that is not a list/detail

You previously introduced `--876-shell-gutter` and made the floating sidebar
insets symmetric. That part is right and is being kept. Two defects remain.
Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## Defect 1 — the doubling is only fixed for `ListDetailShell`

The sidebar `<aside>` is a **flex sibling** of `AppShellMain` inside
`AppShellBody` (see `apps/console/src/components/shell/shell.tsx:150-155`), so
it is in normal flow. The horizontal box model on a Console page is:

```
window edge │ aside pl │ CARD │ aside pr │ AppShellMain │ Page pl │ content │ Page pr │ edge
```

With your change, `aside` is `px-[var(--876-shell-gutter)]` and `Page` is
`px-[var(--876-shell-gutter)]`, so on **any page that is not a list/detail
section**:

| Gap                  | Value                                  |
| -------------------- | -------------------------------------- |
| window edge → card   | **1 gutter**                           |
| card → content       | aside `pr` + Page `pl` = **2 gutters** |
| content → right edge | **1 gutter**                           |

That is precisely the asymmetry the user reported, and it is now **larger** than
before: at `lg` the gutter is 32px, so it reads 32px versus 64px, where the
original `pl-3`/`pr-1` + `px-4` read 12px versus 20px.

Your `-ml-[var(--876-shell-gutter)]` on `ListDetailShell` cancels the second
gutter, but only for sections that use that shell. Console `/settings`,
`/dashboards`, every form page, and every plain page still double it.

The negative margin is also fragile on its own terms: `ListDetailShell` is
exported independently of `ListDetailSection`, and Console's organization
workspace renders it under a different height wrapper
(`.claude/rules/app-layout.md` §5a). A caller that renders the shell without a
`Page` gets a negative margin pulling it under the sidebar.

### Fix it at the source instead

**The sidebar should own only the window inset. The content gutter is `Page`'s
job.** Make the in-flow asides `pl-[var(--876-shell-gutter)]` with **no right
padding**, and **delete the `-ml-` reclaim from `ListDetailShell`**. Then:

| Gap                  | Value                 |
| -------------------- | --------------------- |
| window edge → card   | 1 gutter (aside `pl`) |
| card → content       | 1 gutter (Page `pl`)  |
| content → right edge | 1 gutter (Page `pr`)  |

Even everywhere, with no negative margin and no assumption about the parent.

This is safe: `.claude/rules/app-layout.md` §2 already makes `Page` the
outermost wrapper of every routed page, and the only Console routes without one
are parallel-route slots (`@sidebar`, `@mobilenav`) and
`widgets/notes/[...path]`, none of which render in the main content column
beside the sidebar. **Verify that claim yourself** before relying on it, and
report anything you find that contradicts it.

Applies to the in-flow asides in `apps/console`, `apps/projects`, and
`apps/crm`.

## Defect 2 — you inflated the shared sidebar's vertical padding

In `packages/ui/src/components/sidebar.tsx` you changed the floating/inset
variant from `p-2` to `p-[var(--876-shell-gutter)]`. That is **8px → 32px at
`lg`, on all four sides**. The vertical change was not asked for and makes the
card visibly heavy.

`apps/billing`, `apps/couriers`, and `apps/invoice` all render
`variant="floating"`, so this affects three shipping apps.

Note this sidebar is **`fixed`**, not in flow: a spacer div reserves the width
and the fixed element overlays it, so its geometry differs from the in-flow
asides above. Work out the correct horizontal inset for that arrangement — the
same three gaps must come out equal — and **keep the vertical padding at its
original `p-2`**. Update the collapsed-width `calc()` to stay consistent with
whatever horizontal padding you land on.

## Tests — this is why the defect survived

Your three new cases pass while the bug is present, because none of them
measures the gap on a page that is not a list/detail section.

Add cases that would have failed before this follow-up:

- a plain `Page` inside the shell: window→card, card→content, and
  content→right-edge all resolve to the same token;
- the same for a `ListDetailShell` page, with the negative margin gone;
- the floating (`fixed`) variant: the same three gaps are equal for
  billing/couriers/invoice's arrangement;
- the floating variant's **vertical** padding is unchanged from `p-2`;
- `ListDetailShell` rendered **without** a `Page` parent does not apply a
  negative margin.

Assert the resolved relationship, not the literal class string where you can —
a test that only greps for `pl-[var(--876-shell-gutter)]` passes for a layout
that is still wrong.

## Constraints

- Keep `--876-shell-gutter` and its 4/6/8 values; they are correct.
- Keep the symmetric-inset work and the `h-8.5` row alignment.
- Do not change vertical rhythm anywhere else.
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not touch `apps/api`, `packages/core/src/access/**`, or
  `apps/*/src/app/globals.css` — other work owns those.
- Do not commit.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/invoice typecheck && pnpm --filter @876/invoice test
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test
node scripts/check-app-structure.mjs
```

## Report

Append to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-shell-spacing-contract.md`
under a `## Follow-up` heading: the corrected box model for both the in-flow and
the fixed arrangement, with the three gaps computed at each breakpoint; whether
you found any main-column route without a `Page`; the **counted** number of
`it()` cases added; verification output; and anything you could not verify.
