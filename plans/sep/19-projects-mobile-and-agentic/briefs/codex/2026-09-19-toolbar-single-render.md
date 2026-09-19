# Brief — fix: `ResourceToolbar` must render its actions once, not twice

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## The defect

`packages/ui/src/components/resource-toolbar.tsx` currently renders **two
complete layouts** — a phone one (`sm:hidden`) and a desktop one
(`hidden sm:flex`) — and hides one with CSS. That was my instruction in the
previous brief and it was wrong.

Consequences, all real:

1. **Every interactive control exists twice in the DOM.** A screen reader
   announces two "More actions" buttons and two primary buttons on every page in
   every app. That is an accessibility defect, not a test artefact.
2. **Consumer tests break across the whole platform.** Any app test that queries
   a toolbar control now fails with
   `Found multiple elements with the role "button" and name "More actions"`.
   Confirmed in `apps/projects/src/app/(app)/board/page.test.tsx`;
   `ResourceToolbar` is used by console, couriers, billing, invoice, crm and
   projects, so the blast radius is all six.
3. Two `DropdownMenu` instances mount per toolbar for no benefit.

## The fix — one DOM, responsive by CSS

Render **one** toolbar. The phone and desktop presentations differ in *layout
and type scale*, which CSS expresses natively; nothing needs duplicating.

### 1. Make the title class responsive instead of swapping elements

In `packages/ui/src/876.css`, `876-page-title-lg` currently sets the phone size
unconditionally. Make it the phone size that **reverts to the standard page
title at `sm`**, so one element serves both:

```css
/* 876-page-title-lg — the phone large-title app bar (roughly iOS 34pt): the
   header is the loudest thing on a phone screen, so actions stay quiet. From
   sm up it returns to the standard page title, which lets the toolbar render a
   single title element instead of one per breakpoint. */
[class~='876-page-title-lg'] {
  font-size: 2rem;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.02em;
}

@media (min-width: 40rem) {
  [class~='876-page-title-lg'] {
    /* match 876-page-title exactly — read it in this file and copy its
       declarations rather than guessing the values */
  }
}
```

Read the existing `876-page-title` rule in that file and mirror its exact
declarations in the `min-width` block. Keep the selector style the file already
uses (`[class~='…']`, because a class starting with a digit is not a writable
CSS selector).

Leave the `[data-has-fab='true'] [class~='876-toolbar-mobile-primary']` rule at
the end of the file untouched.

### 2. Collapse the component to one tree

Target structure — a single container that stacks on phone and becomes a row at
`sm`, with the action cluster ordered first on phone and last on desktop:

```tsx
<div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
  <div className="order-2 min-w-0 sm:order-1">
    {titleFilter ? (
      <div className="876-page-title-lg">{titleFilter}</div>
    ) : (
      <h1 className="876-page-title-lg">{title}</h1>
    )}
    {description ? (
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    ) : null}
  </div>

  <div className="order-1 flex shrink-0 items-center justify-end gap-2 sm:order-2">
    {primaryButton ? (
      <span className="876-toolbar-mobile-primary sm:!block">{primaryButton}</span>
    ) : null}
    {hasDropdown ? <DropdownMenu>…</DropdownMenu> : null}
  </div>
</div>
```

Requirements this must satisfy — each is a test below:

- **Exactly one** element with role `button` named "More actions".
- **Exactly one** primary button.
- **Exactly one** `<h1>`, whether or not `titleFilter` is supplied. When
  `titleFilter` is present it renders its own `<h1>`, so the wrapper is a `div`;
  when absent the wrapper *is* the `<h1>`. That behaviour exists today — keep it.
- On phone the actions sit **above** the title; at `sm` they sit to its right.
  Achieve this with `order-*` utilities on one DOM, never by rendering twice.
- The dropdown trigger is `ghost` + `rounded-full size-9` on phone and the
  existing `outline` `icon-sm` at `sm` and up. Express that with responsive
  utility classes on the single trigger — for example
  `rounded-full border-0 sm:rounded-md sm:border` — rather than two triggers.
  Read the current classes before changing them and preserve the desktop result
  exactly.
- `mobilePrimary === 'fab-owns-it'` must still hide the primary button **below
  `sm` only**, and show it from `sm` up. Today the phone-only branch made that
  trivial; on a single tree use `hidden sm:inline-flex` (or equivalent) on the
  wrapper when `mobilePrimary === 'fab-owns-it'`, so desktop is unaffected.
  Keep the `876-toolbar-mobile-primary` class on the wrapper so the
  `data-has-fab` CSS rule keeps working.

### 3. Delete the layout-scoping test helpers

`resource-toolbar.test.tsx` defines `phoneLayout()` / `desktopLayout()` helpers
that only exist because of the duplication. Remove them and query the single
tree directly. Do not keep them as no-ops.

## Hard constraints

- **Desktop output must be visually identical to before.** This is used by six
  apps; a regression here is a platform-wide regression. When in doubt, copy the
  existing desktop classes verbatim onto the single tree.
- Do not change any prop name, default, or exported type. `mobilePrimary`
  defaults to `'button'` and must stay that way.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- Do not touch anything outside `packages/ui/src/components/resource-toolbar.tsx`,
  `packages/ui/src/components/resource-toolbar.test.tsx`, and the
  `876-page-title-lg` rule in `packages/ui/src/876.css`.
- Specifically **do not touch** `apps/projects-api/`, `apps/projects-mcp/`, or
  `packages/projects/` — another delegate is working there right now.

## Tests — rewrite `resource-toolbar.test.tsx` to the single tree, floor 12 `it()`

1. renders the title once — `getAllByRole('heading', { level: 1 })` has length 1;
2. one `<h1>` when `titleFilter` is present (and it is the filter's own);
3. the title wrapper carries `876-page-title-lg`, asserted via `className`
   (a digit-leading class is not a writable CSS selector, and jsdom's engine
   rejects even the attribute form — assert on `className`, do not use
   `.closest()`);
4. exactly one button named "More actions";
5. exactly one primary button;
6. `mobilePrimary` defaults to `'button'` and renders the primary;
7. `mobilePrimary="fab-owns-it"` keeps the primary in the DOM but hidden below
   `sm` — assert the responsive class, since jsdom does not apply media queries;
8. the primary wrapper keeps `876-toolbar-mobile-primary`;
9. no primary renders when `primaryLabel` is undefined, under either
   `mobilePrimary` value;
10. `refresh` contributes its standard transfer actions, once;
11. `dropdownActions` render in the menu with their labels;
12. `description` renders once.

Assert exact strings and counts. `toBeDefined()` alone is not a test
(`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
```

Then prove the consumer is fixed:

```bash
pnpm --filter @876/projects-app exec vitest run 'src/app/(app)/board/page.test.tsx'
```

That last suite must go from 5 failures to passing. If it still reports
`Found multiple elements`, the duplication is not fully removed — fix it rather
than adjusting the consumer test.

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-toolbar-single-render.md`
— files changed and why, the **counted** number of `it()` cases, real output of
all three commands including the board suite, what you could not verify, and
anything left undone.
