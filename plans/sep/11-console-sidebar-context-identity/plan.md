# Implementation Plan: Console sidebar keeps "Console" at the top

- **Run ID:** `2026-09-11-console-sidebar-context-identity`
- **Branch:** `main` (working tree only — see below)
- **Status:** IN_PROGRESS

> ## ⛔ DO NOT COMMIT
>
> The user has said explicitly: **no commit, no branch change, no push until
> they ask for it.** Another agent is making unrelated changes in this same
> tree; the two sets of changes will be split into commits together at the end.
> Leave everything below as uncommitted working-tree changes.

## Problem

On `https://console-dev.87six.dev/apps/876-projects` (and every `/apps/[slug]/*`
route, plus any drill-down section and Storage), the sidebar header stops
showing the Console logo + "Console" and instead shows a back control titled
with the open context ("876 Projects"). Cause:
`apps/console/src/components/shell/sidebar.tsx` → `ContextHeader` renders
`BackControl` in the `SidebarHeader` whenever the context has a parent.

## Desired behaviour

1. The `SidebarHeader` **always** shows the Console mark + "Console" (a link to
   `/`), in every context, expanded or collapsed.
2. When a non-platform context is open, a **context identity row** is mounted in
   the sidebar body **above the first nav item**: the context's logo and its
   name (plus `subtitle` when set).
   - For an app record the logo is the app's real logo
     (`app.logo_url`, initials fallback) via `OrgAvatar` from
     `@876/ui/org-avatar` — the same component the app detail header uses.
   - For a context without a logo (sections, Storage) the tile shows the
     context's `NavIcon` in its `colorClassName`.
3. **Collapsed rail:** the identity row collapses to the logo tile alone,
   centred like a nav icon, with a right-side tooltip naming the context.
4. Returning to the parent context stays available: expanded, a small
   `ChevronsLeft` icon button at the right end of the identity row
   (`aria-label="Back to <parent.backLabel>"`), keeping the existing
   `setDismissed` behaviour; `Escape` keeps working. Collapsed, the back button
   is hidden — the Console mark at the top already returns to the platform root,
   and every current context's parent is the platform root.

## Design decisions

- **Logo travels as plain data.** Add optional `logoUrl?: string | null` to
  `SidebarContext` (`sidebar-context.ts`). It crosses the RSC boundary as a
  string, like `icon`, so the registry stays serializable.
- `appSidebarContext(appKind, slug, appName, logoUrl)` in
  `features/apps/app-detail-nav.ts` gains the logo; `_contexts.ts` passes
  `app.logo_url`. `resolveApp` is already request-cached — no new I/O.
- Mobile sheet (`mobile-nav.tsx`) is **out of scope**; it already titles the
  sheet with the context and the user reported the desktop rail only.
- No change to the context resolver, nav registry, or routes.

## Files

| File | Change |
| --- | --- |
| `apps/console/src/components/shell/sidebar.tsx` | Header always Console; new identity row above `ContextBody`; `BackControl` folded into it |
| `apps/console/src/components/shell/sidebar-context.ts` | optional `logoUrl` on `SidebarContext` |
| `apps/console/src/features/apps/app-detail-nav.ts` | `appSidebarContext` accepts and sets `logoUrl` |
| `apps/console/src/app/(app)/apps/[slug]/_contexts.ts` | pass `app.logo_url` |
| `apps/console/src/components/shell/sidebar.test.tsx` | update/extend |
| `apps/console/src/features/apps/app-detail-nav.sidebar.test.ts` | update/extend |

## Dispatched briefs

| Delegate | Brief |
| --- | --- |
| sub-agent (Opus, medium — general update per `cli.md`) | [briefs/sub-agent/2026-09-11-sidebar-context-identity.md](./briefs/sub-agent/2026-09-11-sidebar-context-identity.md) |

## Execution reports

| Delegate | Report |
| --- | --- |
| orchestrator | [reports/orchestrator/2026-09-11-verification.md](./reports/orchestrator/2026-09-11-verification.md) |

## Checklist

- [ ] `logoUrl` added to `SidebarContext` and set by `appSidebarContext`
- [ ] Header always renders the Console mark
- [ ] Identity row above first item, expanded + collapsed
- [ ] Back control inside identity row; Escape still works
- [ ] Tests updated and extended
- [ ] Orchestrator verification (below) run in the foreground
- [ ] **Commit — only when the user explicitly asks**

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test -- src/components/shell src/features/apps
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any\|@ts-ignore" apps/console/src/components/shell apps/console/src/features/apps
```

## Handoff state

Uncommitted working-tree changes on `main`. When the user asks to commit,
stage only the files in the table above plus this `plans/` folder, as a
`feat(console): …` commit separate from the other agent's work (per `git.md`,
branch first — ask which base).

## Follow-up work (uncommitted, 2026-09-11)

Two user-requested follow-ups landed on top of the sidebar work, same
uncommitted tree, no commit per the standing instruction.

### 1. App detail header + tab strip removed

On every `/apps/[slug]/*` route the record no longer renders its identity
band (logo, name, status, slug, homepage link) or its tab strip — navigation
lives in the sidebar's app context, so the tabs were a second rendering of
the same sections. The separate section pages are unchanged; only the chrome
is gone.

| File | Change |
| --- | --- |
| `apps/console/src/app/(app)/apps/[slug]/layout.tsx` | Passthrough shell: keeps `generateMetadata`, renders `{children}` in the existing `px-4 py-6 sm:px-6 lg:px-8` gutter. `Identity`, `IdentityFallback`, `AppTabs` and all `DetailHeader`/`RouteTabs`/badge/avatar imports deleted |
| `apps/console/src/features/apps/app-detail-nav.ts` | `getAppTabs` deleted (sole consumer was the removed tab strip); `RouteTabItem` import dropped; section type comment updated to name the sidebar as the only renderer |
| `apps/console/src/features/apps/app-detail-nav.test.ts` | Deleted (tested only `getAppTabs`) |
| `apps/console/src/features/apps/app-detail-nav.sidebar.test.ts` | `getAppTabs` import dropped; the tabs-vs-rail parity test now asserts the rail builds one `/apps/<slug><segment>` href per `appDetailSections` entry |

`appDetailSections` is untouched — the sidebar context still derives from it.
404s still come from each page's own `resolveApp` + `notFound()`.

### 2. Main data-table subroutes run full-bleed

Same gutter-removal idea as the earlier list-detail bleed work
(`--876-shell-gutter` hosts own the insets; the table sheet touches the
frame): each table card cancels the `apps/[slug]` layout's horizontal gutter
with `-mx-4 sm:-mx-6 lg:-mx-8` and drops its own edge chrome
(`rounded-none border-x-0`), so titles/toolbars stay inset while the table
meets the viewport edge. Vertical `py-6` breathing room is kept. Skeleton
fallbacks (`loading.tsx` + page `<Suspense>` fallbacks) carry the identical
bleed classes so hard loads and client navigations paint the same sheet.

| Route | Table card | Skeleton parity |
| --- | --- | --- |
| `apps/(list)` (top-level Apps directory) | `apps-table.tsx` — full-bleed, **no split card**: rows keep pushing to the app record | `loading.tsx` + page fallback |
| `plans/(list)` | `plans-table.tsx` | `loading.tsx` + page fallback |
| `subscribers/(list)` | `subscribers-table.tsx` | `loading.tsx` + page fallback |
| `features/(list)` | `features-table.tsx` | `loading.tsx` + page fallback |
| `api-keys` | `api-keys-table.tsx` | `TabContentSkeleton` (neutral filler, unchanged) |
| `modules` | `modules-manager.tsx` table card + pending `Skeleton` | `TabContentSkeleton` (neutral filler, unchanged) |
| `widgets` | list card + list fallback (empty-state message card stays inset) | page fallback covered by the same card change |
| `plans/[planSlug]/pricing/(list)` | page-level card div | `loading.tsx` |
| `plans/[planSlug]/subscribers` | `subscribers-table.tsx` | `loading.tsx` + page fallback |

Deliberately out of scope: `provisioning` (needs the `ListDetailShell`
`bleed` treatment at the shell level, not per-card classes),
`entitlements` (picker grid, not a data table), `diagnostics`,
form/detail pages, and the plan-detail header/tabs (a separate nested
shell the user did not ask to change).

### Verification for the follow-ups

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console test -- src/features/apps
grep -rn "getAppTabs" apps/console/src plans/2026-09-11-console-sidebar-context-identity
```
