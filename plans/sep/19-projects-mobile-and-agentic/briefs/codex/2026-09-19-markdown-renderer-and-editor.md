# Brief — Phase 5: a markdown renderer and editor worth reading on a phone

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Read these files, then start

1. `packages/ui/src/components/markdown.tsx` (30 lines — the renderer)
2. `packages/ui/src/components/markdown-editor.tsx` (204 lines — the editor)
3. `packages/ui/src/components/markdown.test.tsx` and
   `markdown.advanced.test.tsx` (extend, never replace)
4. `packages/ui/src/876.css` — find how existing classes and dark-mode blocks
   are written; you will add a theme block and must match the file's style

## What is wrong

`Markdown` is `react-markdown` + `remark-gfm` and one 1,400-character Tailwind
arbitrary-variant class string. Concretely:

1. **There is no syntax highlighting.** Every code block renders as flat
   monospace on a grey background. This app is used to read implementation
   plans and specs — code is most of the content.
2. **The heading scale is inverted.** `h1` is `text-[15px]`, `h2` is `text-sm`
   (14px), `h3` is also `text-sm` — a heading is *smaller* than comfortable body
   text and `h2`/`h3` are indistinguishable. A document has no visible structure.
3. **Tables have no overflow container.** `[&_table]:w-full` on a 390px screen
   forces the table to overflow the page and breaks horizontal layout for the
   whole route, not just the table.
4. **Code blocks cannot be copied** and carry no language label.
5. **Body text is `text-sm` (14px) with `leading-6`** — a UI size used for long
   prose. Reading a spec on a phone at 14px is the wrong default.
6. Task lists (`- [ ]`), which GFM parses, get no styling at all.

## What to build

### 1. Syntax highlighting — `rehype-highlight`

Add `rehype-highlight` to `packages/ui/package.json` dependencies (pin an exact
version, matching how the existing `react-markdown` / `remark-gfm` entries are
pinned — exact, no caret).

```tsx
import rehypeHighlight from 'rehype-highlight'

<MarkdownRenderer
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
  urlTransform={safeUrl}
>
```

**Why this and not Shiki:** the renderer runs in both server and client
components across this monorepo. `rehype-highlight` is synchronous, needs no
async theme loading, and themes through plain CSS classes — so light/dark
follows the platform's existing variables instead of shipping two JSON themes.
Shiki is more accurate and materially heavier; that trade is not worth it here.
Do not substitute a different library.

`ignoreMissing: true` matters: an unknown language in a fenced block must
render as plain code, never throw.

### 2. The highlight theme lives in CSS, driven by platform variables

Add a theme block to `packages/ui/src/876.css` targeting `hljs` token classes.
**It must follow the file's existing dark-mode convention** — read how other
blocks do it and mirror it exactly. Per the platform standard that is:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { … }
}
:root[data-theme='dark'] { … }
```

Cover at minimum: `.hljs-keyword`, `.hljs-string`, `.hljs-comment`,
`.hljs-number`, `.hljs-function`, `.hljs-title`, `.hljs-attr`, `.hljs-built_in`,
`.hljs-literal`, `.hljs-type`, `.hljs-variable`, `.hljs-punctuation`.

Build the palette from existing 876 CSS variables wherever one fits; introduce
new variables only where none does, and name them `--code-*`. Comments must be
clearly muted; strings and keywords clearly distinct in **both** themes. Do not
hardcode a hex that only works in light mode.

### 3. A real typographic scale

Replace the class blob. Extract it into a named constant in the same file so it
is readable and diffable — a 1,400-character inline string is why the current
bugs went unnoticed.

| Element | Now | Target |
| --- | --- | --- |
| body | `text-sm leading-6` | `text-[0.9375rem] leading-7` |
| `h1` | `text-[15px]` | `text-xl font-semibold mt-6 mb-2` |
| `h2` | `text-sm` | `text-lg font-semibold mt-5 mb-2` |
| `h3` | `text-sm font-medium` | `text-base font-semibold mt-4 mb-1.5` |
| `h4` | unstyled | `text-[0.9375rem] font-semibold mt-3` |

Keep the existing link, blockquote, list, `hr` and inline-code treatments —
they are fine. Preserve `safeUrl` **exactly as written**; it is the XSS guard on
link protocols and must not be touched.

### 4. Tables must not break the page

Wrap every table in a scroll container. `react-markdown` lets you override a
node renderer:

```tsx
components={{
  table: ({ children, ...props }) => (
    <div className="my-3 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table {...props}>{children}</table>
    </div>
  ),
}}
```

The negative margin lets a wide table scroll edge-to-edge on a phone instead of
forcing the whole route to scroll sideways.

### 5. Code blocks: language label + copy

Override the `pre` renderer to produce a block with:

- the detected language as a small muted label, top-right, when one is known
  (read it off the child `code` element's `language-*` class);
- a copy button that copies the raw text, with a transient "Copied" state;
- `-mx-4 px-4 sm:mx-0 sm:px-0 rounded-none sm:rounded-md` so code goes
  full-bleed on a phone — the most readable form for a narrow screen — and
  stays a card on desktop.

**The copy button makes this component interactive.** `Markdown` is imported by
server components across the repo, so you must **not** add `'use client'` to
`markdown.tsx`. Put the interactive code block in its own
`packages/ui/src/components/markdown-code-block.tsx` with `'use client'` at the
top, and import it. A client component imported *by* a server component is fine;
marking the shared renderer as client is not.

Guard `navigator.clipboard.writeText` in `try/catch` — it rejects on insecure
origins and when permission is denied. Render a failure state; never fail
silently.

### 6. Task lists

`- [ ]` / `- [x]` parse to `<input type="checkbox" disabled>` inside `<li>`.
Style them: remove the list marker on those items, align the box with the first
text line, and mute completed items. They must stay `disabled` — this renderer
is read-only and a clickable checkbox that does nothing is worse than none.

### 7. The editor on a phone

In `markdown-editor.tsx`:

- the toolbar must not wrap into three rows at 390px — make it a single
  horizontally scrollable row (`flex gap-1 overflow-x-auto` with
  `scrollbar-none` if the repo has such a utility; check before inventing one);
- touch targets are at least 36px square;
- if there is a write/preview toggle, ensure the preview uses the same
  `Markdown` component so what you see is what renders — if it does not today,
  make it so;
- ensure the textarea does not trigger iOS zoom-on-focus: its font size must be
  at least 16px (`text-base`), not `text-sm`.

Read the file before changing it and keep its existing API. **Do not change any
exported prop signature** — several apps consume this editor.

## Hard constraints

- `packages/ui` is the shared design system — Console, Couriers, Billing,
  Invoice, CRM and Projects all render this markdown. A regression here is a
  platform-wide regression. Every change must be an improvement at **every**
  width, not a phone fix that costs desktop.
- Do **not** add `'use client'` to `markdown.tsx`.
- Do not touch `safeUrl`.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green. No explanatory `<p>` under a heading.
- **Do not touch** — other delegates own these:
  `packages/ui/src/components/resource-toolbar.tsx`,
  `packages/projects-ui/src/issue-detail.tsx`,
  `packages/projects-ui/src/project-detail.tsx`,
  `packages/projects-ui/src/mobile-list.tsx`,
  anything under `apps/projects/`.
  You **do** own `packages/ui/src/876.css` for the `hljs` theme block only —
  append it; do not reformat or reorder the rest of the file.

## Tests — floor is 16 new `it()` cases

Extend `markdown.test.tsx` / `markdown.advanced.test.tsx`, and add
`markdown-code-block.test.tsx`:

1. a fenced block with a known language gets `hljs` token markup;
2. a fenced block with an unknown language renders as plain code, no throw;
3. a fenced block with no language renders without throwing;
4. the language label renders for a known language;
5. no language label renders when none is detected;
6. the copy button copies the raw code text;
7. the copy button renders a failure state when `writeText` rejects;
8. a table is wrapped in an overflow container;
9. `h1`, `h2`, `h3` render at distinct sizes (assert the classes);
10. a task list renders disabled checkboxes;
11. a checked task item renders as checked;
12. `safeUrl` still strips a `javascript:` URL;
13. `safeUrl` still permits `https:` and `mailto:`;
14. inline code keeps its existing treatment;
15. the editor toolbar is a single scrollable row;
16. the editor textarea is at least `text-base`.

Assert exact classes and strings, and both branches. `toBeDefined()` alone is
not a test (`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
```

Then confirm you have not broken a consumer:

```bash
pnpm --filter @876/projects-ui test
```

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-markdown-renderer-and-editor.md`
— files changed and why, the dependency you added and its exact version, the
**counted** number of `it()` cases added, real command output, what you could
not verify, and anything left undone.
