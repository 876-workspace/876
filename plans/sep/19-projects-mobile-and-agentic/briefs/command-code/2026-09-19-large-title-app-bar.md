# Brief — Phase 3a: give `ResourceToolbar` an iOS-style large-title app bar on phone

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Read budget — these 3 files only

1. `packages/ui/src/components/resource-toolbar.tsx` (the file you change)
2. `packages/ui/src/components/resource-toolbar.test.tsx` (extend it)
3. `packages/ui/src/components/status-filter-heading.tsx` (read only — to see
   how the heading renders its chevron)

Do not read the apps. Everything else is below.

## Why

`ResourceToolbar` renders a desktop toolbar and it is used unchanged on phones.
On a 390px screen the result is a 20px page title with a saturated blue `+ Add`
pill and a bordered white `···` box crammed onto one row — while the app also
renders a floating action button for the *same* add action a thumb-reach below.

The target is the pattern iOS Settings and WhatsApp use: **a big quiet header**.
Large heavy title on its own line, small bare circular icon actions above it,
and no duplicate primary button.

## The change — `ResourceToolbar` only

Current render body, verbatim:

```tsx
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        {titleFilter ?? <h1 className="876-page-title">{title}</h1>}
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {primaryButton}
        {hasDropdown && (
          <DropdownMenu>…</DropdownMenu>
        )}
      </div>
    </div>
  )
```

### 1. Add one prop

```ts
  /**
   * How the primary action behaves below `sm`. `'fab-owns-it'` suppresses the
   * primary button on phone because the host already renders a floating action
   * button for the same action — two primary affordances on one screen is one
   * too many. Defaults to `'button'`, which is the existing behaviour.
   */
  mobilePrimary?: 'button' | 'fab-owns-it'
```

Default `'button'`. **This default is load-bearing**: Console, Couriers, Billing
and Invoice all use this component and must render exactly as they do today.

### 2. Render two layouts from one component

Do not branch in JavaScript on viewport width — that is a hydration mismatch and
these toolbars are server-rendered. Render both and switch with Tailwind.

**Phone (`sm:hidden`):**

```tsx
<div className="mb-4 sm:hidden">
  {hasDropdown ? (
    <div className="flex justify-end">
      {/* the same DropdownMenu, but the trigger is bare and circular */}
    </div>
  ) : null}
  <h1 className="text-[2rem] leading-tight font-bold tracking-tight">
    {titleFilter ?? title}
  </h1>
  {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
  {mobilePrimary === 'button' ? <div className="mt-3">{primaryButton}</div> : null}
</div>
```

- The phone dropdown trigger uses `buttonVariants({ variant: 'ghost', size: 'icon-sm' })`
  plus `rounded-full size-9` — **no border, no card surface**. It currently uses
  `variant: 'outline'`, which is what makes it read as a white box.
- The large title carries `titleFilter` when one is supplied, so a
  `StatusFilterHeading` becomes the big tappable title with its chevron inline —
  that is the iOS "tap the large title" idiom and it is the point.
- Because `titleFilter` renders its own `<h1>` in `status-filter-heading.tsx`,
  **do not nest a second `<h1>`**. Render the wrapper as a plain `<div>` when
  `titleFilter` is present and as `<h1>` when it is not. Two `<h1>`s is an
  accessibility defect and the test below checks for it.

**Desktop (`hidden sm:flex`):** the existing markup, unchanged, byte for byte
apart from the responsive class.

### 3. The large title needs a class, not a magic number

Add a `876-page-title-lg` class next to the existing `876-page-title` in
`packages/ui/src/876.css` (find `876-page-title` — it is defined there) and use
it instead of inline `text-[2rem]`. `app-layout.md` §10b exists precisely because
call-site heading sizes drift; do not add a second one.

```css
/* 876-page-title-lg — the phone large-title app bar. Roughly iOS 34pt: the
   header is the loudest thing on a phone screen, so actions stay quiet. */
.876-page-title-lg {
  font-size: 2rem;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.02em;
}
```

Match the surrounding file's conventions — read how `876-page-title` is written
and follow it exactly.

## Hard constraints

- **Default behaviour must not change for any existing caller.** A caller that
  passes no `mobilePrimary` gets today's phone rendering except for the new
  large title and the ghost overflow trigger. That visual change is intended and
  applies to every app; the *primary button suppression* is opt-in only.
- No function props across the RSC boundary — this file is already
  `'use client'`, so it is fine internally, but do not add a prop that requires
  a server caller to pass a function.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green. Do not change `primaryVariant` handling.
- Do not touch anything outside `packages/ui/src/components/resource-toolbar.tsx`,
  its test, and `packages/ui/src/876.css`.
- Do **not** touch any file under `apps/projects/src/app/(app)/issues/` or
  `packages/projects-ui/src/issue-detail.tsx` — other delegates are in those.

## Tests — floor is 10 new `it()` cases

Extend `packages/ui/src/components/resource-toolbar.test.tsx`:

1. renders the title in both the phone and desktop layouts;
2. exactly one `<h1>` is rendered when `titleFilter` is absent;
3. exactly one `<h1>` is rendered when `titleFilter` is present;
4. `mobilePrimary` defaults to `'button'` — the primary button is present in the
   phone layout;
5. `mobilePrimary="fab-owns-it"` removes the primary button from the phone
   layout but keeps it in the desktop layout;
6. the phone dropdown trigger does not carry the outline variant classes;
7. the desktop dropdown trigger still does;
8. `description` renders in both layouts;
9. `refresh` still contributes its standard transfer actions;
10. no primary button renders at all when `primaryLabel` is undefined,
    regardless of `mobilePrimary`.

Assert exact classes/strings and both branches. `toBeDefined()` alone is not a
test (`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
```

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/command-code/2026-09-19-large-title-app-bar.md`
— files changed and why, the **counted** number of `it()` cases added, the real
output of the commands you ran, what you could not verify, and anything left
undone.
