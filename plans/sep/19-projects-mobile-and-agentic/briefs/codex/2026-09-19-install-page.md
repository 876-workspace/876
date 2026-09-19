# Brief — Phase 3d: an /install page for adding 876 Projects to a homescreen

Branch: `feature/projects-mobile-and-agentic`. Do **not** create a branch. Do
**not** commit — the orchestrator commits.

## Why

The native Expo app is parked. The web app is already a complete PWA — it has
`src/app/manifest.ts`, a service worker built by `build:sw`, `offline.html`,
and maskable icons in `public/pwa/` — so it installs to a homescreen today and
then runs without browser chrome, which is the whole point.

Nothing in the app tells anyone that. This page does, and it replaces the
"host an APK at /download" idea entirely.

## Read first — 4 files, then start

1. `apps/projects/src/app/manifest.ts` — the installed name, icons and colours
   you must describe accurately
2. `apps/projects/src/app/(app)/_components/home-header.tsx` — the app's own
   page-composition idiom
3. `apps/projects/src/components/shell/user-menu.tsx` — where you add the link
4. `packages/projects-ui/src/mobile-list.tsx` — the phone language

Do not read further. Everything else is below.

## What to build

### The route

`apps/projects/src/app/(app)/install/page.tsx`, inside the authenticated shell
so it inherits navigation and the session guard like every other `(app)` route.

```ts
export const metadata: Metadata = { title: 'Install' }
```

Per `.claude/rules/page-metadata.md` the local title only — the root layout owns
the `| 876 Projects` suffix and the `noindex` policy. Do not add a description,
canonical, or Open Graph block: this is a private app screen.

### The content

Three platform sections, each a short numbered list of the **real** steps:

| Platform | Steps |
| --- | --- |
| iPhone / iPad (Safari) | Share → *Add to Home Screen* → Add. Note that it must be **Safari** — Chrome on iOS cannot install a web app. |
| Android (Chrome) | ⋮ menu → *Add to Home screen* / *Install app* → Install |
| Desktop (Chrome / Edge) | the install icon in the address bar, or ⋮ → *Install 876 Projects* |

Then one short section — **three bullets maximum** — on what installing
actually gets you: it opens without browser chrome, it keeps you signed in, and
it still opens a `/i/<ref>` link straight to that issue.

Copy rules, from `CLAUDE.md` → UI Copy: **no explanatory paragraph under any
heading.** Numbered steps and short bullets only. Do not write a sentence
restating what the list below it already says.

### Detect what is already true

A small `'use client'` component that reads, in a `useEffect` (never during
render — these are browser-only APIs and this page is server-rendered, so
touching them in the render body is a hydration mismatch):

- `window.matchMedia('(display-mode: standalone)').matches`, **or**
  `('standalone' in window.navigator && window.navigator.standalone)` for iOS
  Safari, which does not implement `display-mode: standalone`;
- the `beforeinstallprompt` event, stashed on a ref.

Then:

- **already installed** → a short confirmation replaces the steps. Someone
  reading this page from inside the installed app should not be told how to
  install it.
- **`beforeinstallprompt` fired** → render a real **Install** button calling
  `prompt()` on the stashed event. Chrome fires this once; after `prompt()`
  resolves, drop the reference and hide the button — a second `prompt()` on a
  used event throws.
- **neither** → the manual steps, with the section matching the current
  platform ordered first. Detect with a simple `navigator.userAgent` test; being
  wrong only reorders sections, so keep it simple and do not install a UA
  parsing dependency.

Render the manual steps **on the server for every platform** and let the client
component only reorder/hide. A page that shows nothing until JavaScript runs is
worse than one that shows all three lists.

### The link into it

Add an **Install app** entry to the user menu in
`apps/projects/src/components/shell/user-menu.tsx`, following the entries
already there exactly — same item component, same icon convention, same
ordering style. One entry; do not add a banner, a toast, or an interstitial.

## Hard constraints

- No function props across the RSC boundary
  (`.claude/rules/production-render-errors.md` Rule 1) — the page is a Server
  Component, so the interactive piece is its own `'use client'` module.
- Never touch `window`, `navigator` or `matchMedia` during render.
- No `eslint-disable`, no `@ts-ignore`, no `as any`.
- No green buttons — the install button uses the existing `info` variant.
- No explanatory `<p>` under a heading.
- File placement follows `.claude/rules/app-structure.md`: anything that renders
  and is local to this route goes in `app/(app)/install/_components/`, never as
  a bare `.tsx` sibling of `page.tsx`.
- **Do not touch** — other delegates own these right now:
  `packages/ui/src/components/resource-toolbar.tsx`, `packages/ui/src/876.css`,
  `packages/projects-ui/src/{phase-list,time-entry-list,timesheet-summary,mobile-list}.tsx`,
  `packages/projects-ui/src/automation/notification-list.tsx`,
  anything under `apps/projects-api/` or `apps/projects-mcp/`,
  `apps/projects/src/app/(app)/issues/**`.

## Tests — floor is 10 new `it()` cases

Beside the components (`*.test.tsx`), in `@876/projects-app`:

1. the page renders all three platform sections on the server;
2. each section renders its numbered steps;
3. the iOS section states that Safari is required;
4. standalone display-mode renders the already-installed state;
5. the iOS `navigator.standalone` path also renders it;
6. neither signal renders the manual steps;
7. a fired `beforeinstallprompt` renders the Install button;
8. clicking Install calls `prompt()` exactly once;
9. the button is gone after the prompt resolves;
10. the user menu contains an Install app entry linking to `/install`.

Assert exact strings and both branches. `toBeDefined()` alone is not a test
(`.claude/rules/testing.md`).

## Verify yourself, one command at a time, never in parallel

```bash
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app exec vitest run src/app/\(app\)/install src/components/shell/user-menu.test.tsx
```

`@876/projects-app` is the Next.js app. `@876/projects` is a different
workspace — the contract package — and running it verifies nothing here.

The full app suite has pre-existing failures unrelated to this work; run the
targeted files above, and do not try to fix a failure in a file you did not
touch.

## Report

`plans/sep/19-projects-mobile-and-agentic/reports/codex/2026-09-19-install-page.md`
— files changed and why, the **counted** number of `it()` cases added, real
command output, what you could not verify, and anything left undone.
