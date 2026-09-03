# Console shell — the contextual sidebar

Console's sidebar is a **stack of navigation contexts**, not one rail with
optional panels. The platform root is one context; a drill-down section is
another; a product and an organization's workspace will be others. Exactly one
level is mounted at a time, so the card's height always matches what is showing.

This exists because Console is becoming several applications in one: entering a
product should feel like entering that product, with a way back up. See
`plans/2026-09-03-console-workspace-and-sidebar/plan.md` for the whole design.

## Files

| File                     | Owns                                                        |
| ------------------------ | ----------------------------------------------------------- |
| `sidebar-context.ts`     | The context model and every resolver. No Console knowledge. |
| `nav-config.ts`          | Console's platform registry — the root context's entries.   |
| `nav-contexts.ts`        | Console's separately declared contexts.                     |
| `sidebar.tsx`            | The desktop rail.                                           |
| `mobile-nav.tsx`         | The same stack as a sheet.                                  |
| `sidebar-motion.ts`      | The spring, and the `linear()` easing generated from it.    |
| `sidebar-preferences.ts` | The expand/collapse preference.                             |
| `sidebar-slots.ts`       | Non-navigation rail content, declared as data.              |

## Declaring a context

Two ways, and the difference matters.

**As children of a platform entry** (`nav-config.ts`) — the ordinary case. The
entry keeps its own href and tint, and its children become the context's
entries:

```ts
{
  key: 'projects', title: 'Projects', href: '/projects', icon: 'projects',
  requires: { permission: 'console:projects' },
  children: [ /* … */ ],
}
```

**As a standalone declaration** (`nav-contexts.ts`) — when the context needs to
exist before its navigation does, or when it is not a child of the platform
tree at all:

```ts
{
  key: 'storage', kind: 'product', title: 'Storage', href: '/storage',
  icon: 'storage', parentKey: PLATFORM_CONTEXT_KEY, groups: [],
}
```

**An empty context is a supported state.** `resolveNavigation` drops an entry
whose declared children all resolve away — right for a group inside a context,
wrong for a context itself — which is exactly why a standalone declaration
exists. Storage is the standing proof: the rail swaps and the back control
works before that product has a single screen. Do not delete it as cleanup.

**From a route segment, through the `@sidebar` slot** — when the context needs
data only that segment has. `/apps/[slug]` knows the app's `app_kind`, and the
shell above it does not; an RSC layout cannot read the pathname without making
the whole shell dynamic, and a client provider written to by a nested layout
would flash the platform rail before the product rail arrived. So the segment
renders its own sidebar into a parallel slot:

```
src/app/(app)/
  layout.tsx                             receives `sidebar`, passes it to Shell
  @sidebar/
    default.tsx                          every unmatched route
    apps/[slug]/[[...section]]/page.tsx  the product rail, kind-resolved
```

`ConsoleSidebar` resolves the access context, navigation, and slots, so a slot
page only supplies the extra contexts its segment owns. The optional catch-all
is what keeps the rail in place below the record — `/apps/876-crm/plans/pro`
must not drop back to the platform rail.

`groups` is kept rather than a flat entry list so a context renders the
registry's own dividers; the platform rail's three groups are the reason.

## Resolution

**The open context is derived from the pathname, never from click state.** A
deep link, a refresh, and the browser's back button all land on the right level
with nothing to keep in sync.

- `resolveSidebarContextStack(pathname, navigation, declared)` — the stack, root
  first, deepest last. A context claims a path by its own href or any entry's.
  Claiming contexts order by href length, which is depth for prefix-nested
  paths; one whose declared parent is not on the stack is dropped rather than
  grafted onto the root.
- `resolveSidebarBackContext(stack, key)` — one level up. This is what the back
  control names, so a workspace beneath a product says "Back to CRM", not "Back
  to Console".
- `entryOpensContext(entry, contexts)` — asked of the entry's **href**, not its
  children, because a standalone context has no children to read. Getting this
  wrong leaves an entry-less context unable to reopen after a back-out.
- `resolveActiveEntryKey(pathname, context)` — longest match wins, so a context
  index and a record page are both attributed correctly.

The single piece of local state is the deliberate back-out, held as the
dismissed context's key **and** the path it was dismissed from, so navigating
anywhere reinstates the derived level with no effect needed to clear it.

## Back and expand are two controls

Back pops one level. Expand reveals labels at whatever level is open. Folding
them into one button makes neither discoverable.

The rail is **collapsed by default at every level** — entering a context swaps
the rail's contents, it does not widen it. Labels arrive only when asked for.
The preference is global, not per context, and persists under the versioned key
`876_console_sidebar_expanded:v1` through `useSyncExternalStore`, with every
read and write wrapped so a browser that blocks site data still renders.

## Spring motion

`sidebar-motion.ts` samples a real spring — stiffness, damping, mass — into a
CSS `linear()` easing. That indirection is what lets a spring drive a _height_:
the height is content-derived via `interpolate-size: allow-keywords`, so it
cannot be driven by a JS loop without measuring first, and a declarative timing
function keeps `prefers-reduced-motion` in CSS where it belongs.

Tune amplitude in `SIDEBAR_SPRING` — lower `damping` for more bounce. At
320/24/1 the damping ratio is ~0.67 and the rail overshoots ~6%. The endpoints
are pinned to exactly 0 and 1, because a spring never fully settles and a final
stop of 0.9969 would leave the rail fractionally short and then snap.

**`SIDEBAR_SPRING_SETTLE_MS` and the transition duration in `sidebar.tsx` must
stay equal.** The stops describe that whole window; a shorter transition
truncates the settle, a longer one stretches the overshoot.

## Slots

A slot is non-navigation rail content — a card, a standalone button, an
announcement, a live indicator. Declared as plain data beside the navigation it
sits with:

```ts
{ key, region, title, icon, componentKey, requires? }
```

Regions render top to bottom: `top`, `above-nav`, `below-nav`, `footer`.
`componentKey` is resolved by the client shell exactly as an icon key is, so
declarations stay RSC-serializable. `title` and `icon` are what the collapsed
rail shows — a slot that can only render expanded has nothing to show for most
of its life.

Slots are gated by `navRequirementPasses` from `@876/core/access`, the same
predicate as nav entries, so a slot cannot become the one place on the rail
where a permission is not checked.

`sidebarSlotDefinitions` is deliberately empty: the mechanism ships before the
first card.

## Extraction

These primitives are written to leave. Nothing in `sidebar-context.ts`,
`sidebar-motion.ts`, `sidebar-preferences.ts`, or `sidebar-slots.ts` imports a
Console route, a Console permission, or `@/lib/services/*` — Console's specifics
arrive as data through `navConfig`, `navContexts`, and props.

**Do not extract to a package yet.** Per `.claude/rules/app-structure.md` a
component moves to `packages/ui` when a _second app_ needs it, and Console is
the first. When Couriers or Billing adopts this, the move is mechanical.

Naming follows the same rule: kebab-case files, PascalCase exports, and no
`Console` prefix inside Console — the path already says `apps/console`.

## Known gap: dynamic contexts on mobile

`MobileNav` renders in the header, above the `@sidebar` slot, so it still
receives only the statically declared `navContexts`. A section context and
Storage work there; a per-app product context does not, and mobile shows the
platform rail inside an app record.

Closing it means a second slot (`@mobilenav`) rendering the sheet with the same
resolved contexts. Do that when the first dynamic context has to reach mobile —
the workspace rail in Phase 3 is the likely forcing move.

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```
