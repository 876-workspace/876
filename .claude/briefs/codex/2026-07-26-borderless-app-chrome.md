# Brief: roll out the borderless app-chrome treatment across all apps

## Why

The Couriers app was retuned by hand to a flatter chrome: the app-shell topbar
no longer draws a bottom border, the sidebar's edge border is softened to 50%
opacity, the portal header drops its bottom border, and the widgets pop-out card
drops its drop shadows. Those edits already exist in the working tree (see
"Reference diff" below). Every other 876 app still has the old bordered/shadowed
chrome, so the surfaces look inconsistent side by side.

Your job: apply the **same three treatments** to the remaining apps. Nothing
else. This is a visual-consistency pass, not a redesign.

## Reference diff (already applied — do NOT re-apply, use as the pattern)

- `apps/couriers/src/components/couriers-shell.tsx:66`
  `<AppShellHeader className="dark:bg-876-canvas h-16 …">` →
  `<AppShellHeader className="border-b-0 dark:bg-876-canvas h-16 …">`
- `apps/couriers/src/components/couriers-sidebar.tsx:28`
  `<Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">` →
  `className="border-sidebar-border/50 bg-sidebar"`
- `apps/couriers/src/components/portal/portal-header.tsx:20`
  header `border-b` → `border-b-0`
- `packages/widgets/src/react/widget-popout.tsx` — `FLOATING_CARD_CHROME` and the
  mobile panel branch: the light-mode `shadow-[…]` + `dark:shadow-none` pairs
  were replaced with a single `shadow-none`.

## Exact file scope — change ONLY these

### 1. App-shell topbars — remove the bottom border

| File                                                             | Line (approx) | Change                                                                                                                                 |
| ---------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/billing/src/components/billing-shell.tsx`                  | 58            | `<AppShellHeader>` → `<AppShellHeader className="border-b-0">`                                                                         |
| `apps/console/src/components/console-shell.tsx`                  | 69            | `<AppShellHeader>` → `<AppShellHeader className="border-b-0">`                                                                         |
| `apps/enterprise/src/components/enterprise/enterprise-shell.tsx` | 53            | raw `<header className="876-topbar border-876-surface-border … border-b pr-4 …">` → replace `border-b` with `border-b-0`               |
| `apps/876/src/components/account/account-shell.tsx`              | 180           | raw `<header className="border-876-surface-border bg-876-surface/70 sticky … border-b px-4 …">` → replace `border-b` with `border-b-0` |

Note on the primitive: `AppShellHeader` in
`packages/ui/src/components/app-shell.tsx:48` still carries `border-b` in its
base class list. **Leave the primitive alone.** Couriers already established the
per-consumer `border-b-0` override as the pattern, and the primitive must keep
its default for any future consumer that wants a bordered topbar.

### 2. Sidebars — soften the edge border to `/50`

Change **only the `<Sidebar …>` root element's** `border-sidebar-border` →
`border-sidebar-border/50`:

| File                                                               | Line (approx)                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `apps/billing/src/components/billing-sidebar.tsx`                  | 33                                                             |
| `apps/console/src/components/console-sidebar.tsx`                  | 19                                                             |
| `apps/enterprise/src/components/enterprise/enterprise-sidebar.tsx` | 92                                                             |
| `apps/876/src/components/account/account-shell.tsx`                | 154 (`<Sidebar className="border-sidebar-border bg-sidebar">`) |

**Do NOT touch** the inner logo/avatar badge `<span>`s that also use
`border-sidebar-border` (e.g. `billing-sidebar.tsx:40`, `console-sidebar.tsx:25`,
`enterprise-sidebar.tsx:98`). Those are separate elements with their own border
and must keep full opacity.

### 3. Shadows

Already handled in `packages/widgets/src/react/widget-popout.tsx`. **Do not**
touch `widget-popout.tsx:449` (the launcher button shadow) — that one is
deliberately kept. No other shadow edits are in scope.

## Explicitly out of scope

- `packages/ui/src/components/app-shell.tsx` and `packages/ui/src/components/sidebar.tsx` (the primitives)
- Any `shadow-[…]` on cards, buttons, dialogs, auth surfaces, or page sections
- `apps/console/src/app/(app)/features/[id]/feature-header.tsx` (a page-level detail header, not app chrome)
- Any `apps/couriers/**` or `packages/widgets/**` file (already done)
- Anything under `.next/`, `.open-next/`, or `node_modules/`

## Verification (run these, report the output)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/app typecheck
pnpm --filter @876/console test
pnpm --filter @876/couriers test
```

If a sidebar snapshot/class assertion fails, update the assertion to match the
new class — do not revert the class change.

## Rules

- Do **not** run `git add`, `git commit`, `git push`, or create branches. The
  orchestrating agent commits.
- Do not reformat untouched lines; keep diffs minimal (Prettier config is at the
  repo root, `singleQuote: true`).
- Report every file you changed with a one-line summary each.
