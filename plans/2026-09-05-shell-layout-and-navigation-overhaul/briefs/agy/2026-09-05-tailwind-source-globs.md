# Task: compile the shared product-UI packages into every host app's CSS

You are working in the monorepo at `/root/projects/876`, on branch
`feat/shell-layout-navigation-overhaul`. Do not create, switch, or delete
branches. Do not commit. Do not open a pull request.

## The bug

Each Next.js app declares its Tailwind v4 content sources in
`apps/<app>/src/app/globals.css` with `@source`. Audited today, every app
declares only its own tree (plus `packages/widgets` in four of them):

```
apps/876/src/app/globals.css        @source '../';
apps/billing/src/app/globals.css    @source '../';  + packages/widgets
apps/console/src/app/globals.css    @source '../';  + packages/widgets
apps/couriers/src/app/globals.css   @source '../';  + packages/widgets
apps/crm/src/app/globals.css        @source '../';
apps/enterprise/src/app/globals.css @source '../';
apps/invoice/src/app/globals.css    @source '../';  + packages/widgets
apps/projects/src/app/globals.css   @source '../';
```

`packages/ui/src/styles.css` sources only `./components` and `./auth`.

**No app sources any shared product-UI package** — `@876/projects-ui`,
`@876/crm-ui`, `@876/work-ui`, `@876/billing-ui`, `@876/access-ui`. So any
utility class used _only_ inside one of those packages is never generated for
the host app, and that component renders unstyled for those classes.

Concrete proof: `packages/projects-ui/src/project-detail.tsx` renders its
summary tiles as `<div className="grid gap-4 sm:grid-cols-3">`. In Console they
render three-across, because Console's own source tree happens to use
`sm:grid-cols-3` somewhere so the class exists. In the Projects app they render
as three full-width stacked bars, because `sm:grid-cols-3` was never compiled
there. That is the bug you are fixing.

## What to do

### 1. Read the existing single source of truth first

`scripts/shared-ui-packages.mjs` already exports the shared product-UI package
list used for `transpilePackages` in every app's `next.config.ts`, and
`pnpm check:transpile` already enforces it. **Read that file and the check
script it backs before writing anything.** Your fix must reuse that list, not
restate it.

### 2. Add the `@source` globs

For every app that transpiles a shared product-UI package, add a matching
`@source` line to that app's `globals.css`, in the same style as the existing
`packages/widgets` lines. For example, in `apps/projects/src/app/globals.css`:

```css
@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';
```

Work out per app which packages it actually transpiles by reading its
`next.config.ts` and `package.json` dependencies — do not add every package to
every app.

Place the new lines directly under the existing `@source '../';` line and keep
the existing explanatory comment accurate.

### 3. Add a check so this cannot regress

Add a check that fails when a package is in an app's shared transpile list but
has no matching `@source` in that app's `globals.css`. Follow the shape of the
existing `check:transpile` script — either extend it or add a sibling script
registered in the root `package.json` the same way. A shared UI package added
next month must fail CI rather than silently render unstyled.

Write at least 4 test cases for the check: a matching app passes; an app missing
one glob fails and names the package and the app; an app with an extra unrelated
glob still passes; an app that transpiles nothing shared passes.

### 4. Report what changed visually

Some pages will look different once these classes exist — that is the point.
List, per app, which shared product-UI components are now getting classes they
previously were not. Read the components to answer this; do not guess.

## Hard constraints

- Do not edit any `.tsx` component. This task is CSS sources and one check
  script only.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`. Use `as unknown as T`
  only for a genuine external type mismatch, and say why in your report.
- Do not change `transpilePackages` in any `next.config.ts` — the transpile list
  is already correct; only the CSS sources are missing.
- Do not touch `packages/ui/src/styles.css` unless you can explain why the fix
  belongs there instead, in which case explain it in the report and do it there
  once rather than in eight apps.
- Do not commit. The orchestrator stages and commits.

## Verify before reporting (run these yourself)

```bash
node scripts/check-app-structure.mjs
pnpm check:transpile
pnpm --filter @876/projects build
```

Then confirm the generated CSS actually contains the class:

```bash
grep -r "grid-cols-3" apps/projects/.next/static/css/ | head
```

If that grep finds nothing, the fix is not working — say so plainly rather than
reporting success.

## Report

Write your report to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/agy/2026-09-05-tailwind-source-globs.md`
covering: every file changed and why; the per-app package→glob mapping you
derived and how; the check script and its test count (an actual count, not "a
few"); the verification commands you ran and their real output; the visual-change
inventory from step 4; and anything you could not verify.

A truthful "not verified" is worth more than a confident claim.
