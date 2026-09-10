# Console shell — contextual navigation in the standard sidebar

Console's desktop navigation uses the standard full-height `@876/ui/sidebar`
application shell. What is special about Console is **not** its sidebar chrome;
it is the navigation model inside that chrome.

Console navigation is a stack of contexts. The platform root is one context; a
drill-down section is another; product records and organization workspaces can
add deeper contexts. Exactly one context owns the sidebar contents at a time.
Entering a workspace therefore **replaces the contents of the existing sidebar**
rather than mounting a second sidebar beside it.

The compact content-sized floating card that Console used previously is still a
supported 876 design mechanism, but it is now owned by
`@876/ui/floating-nav-rail`. Projects is its first active app consumer. The
shared shadcn `Sidebar variant="floating"` remains a different, full-height
floating/inset treatment.

See `plans/2026-09-03-console-workspace-and-sidebar/plan.md` for the contextual
navigation design and `plans/2026-09-10-console-standard-sidebar/plan.md` for
the presentation split.

## Ownership

| Concern | Owner |
| --- | --- |
| Standard full-height desktop sidebar | `@876/ui/sidebar` |
| Compact content-sized floating navigation card | `@876/ui/floating-nav-rail` |
| Console context model and resolvers | `sidebar-context.ts` |
| Console root navigation registry | `nav-config.ts` |
| Console standalone contexts | `nav-contexts.ts` |
| Console contextual desktop renderer | `sidebar.tsx` |
| Console mobile contextual renderer | `mobile-nav.tsx` |
| Access/navigation/slot resolution | `server-sidebar.tsx` / `server-mobile-nav.tsx` |
| Route-specific desktop composition | `app/(app)/@sidebar/**` |
| Route-specific mobile composition | `app/(app)/@mobilenav/**` |
| Non-navigation sidebar content declarations | `sidebar-slots.ts` |
| Desktop expanded/collapsed state | `SidebarProvider` in `@876/ui/sidebar` |

Console no longer owns a separate sidebar spring or localStorage expansion
store. `AppShell` provides the shared `SidebarProvider`; `Shell` seeds its
`defaultOpen` value from the standard `sidebar_state` cookie; and the desktop
`SidebarTrigger` controls presentation width. First visit defaults to expanded.

## Shell geometry

The desktop sidebar is a sibling of `AppShellContent`, not a child of the page
body:

```tsx
<AppShell defaultOpen={defaultSidebarOpen}>
  <AppShellSidebarArea>{sidebar}</AppShellSidebarArea>
  <AppShellContent>
    <AppShellHeader>
      <SidebarTrigger />
      {/* search / actions / user menu */}
    </AppShellHeader>
    <AppShellBody>
      <AppShellMain>{children}</AppShellMain>
      {widgetRail}
    </AppShellBody>
  </AppShellContent>
</AppShell>
```

That is the standard 876 workspace-app shell shape. `Sidebar variant="sidebar"`
provides the persistent left edge and reserves the corresponding content gap.
Collapsing it changes the width to the shared icon width; it does not change the
active Console navigation context.

On mobile, the desktop sidebar does not render. `@mobilenav` supplies the
context-aware sheet in the topbar instead.

## Declaring a context

There are two static declaration forms and one route-supplied form.

### Children of a platform entry

This is the ordinary section case. The entry keeps its own href and tint while
its children become the section context's entries:

```ts
{
  key: 'projects',
  title: 'Projects',
  href: '/projects',
  icon: 'projects',
  requires: { permission: 'console:projects' },
  children: [/* … */],
}
```

### Standalone declarations

Use `nav-contexts.ts` when a context must exist independently of resolved child
navigation, including an empty context:

```ts
{
  key: 'storage',
  kind: 'product',
  title: 'Storage',
  href: '/storage',
  icon: 'storage',
  parentKey: PLATFORM_CONTEXT_KEY,
  groups: [],
}
```

An empty context is intentional and supported. `resolveNavigation` can remove an
entry whose children all resolve away, which is correct for navigation inside a
context but would incorrectly erase the context itself. Storage is the standing
proof: entering it replaces the root navigation and still provides a way back
before Storage has any child screens.

### Route-supplied contexts

Use the `@sidebar` and `@mobilenav` parallel routes when a context needs data
owned by a route segment. `/apps/[slug]`, for example, knows the app record and
its `app_kind`; the root shell does not. A workspace route likewise knows the
organization and selected product workspace.

```text
src/app/(app)/
  layout.tsx
  @sidebar/
    default.tsx
    apps/[slug]/page.tsx
    apps/[slug]/[...section]/page.tsx
    workspace/[orgSlug]/[...section]/page.tsx
  @mobilenav/
    default.tsx
    apps/[slug]/page.tsx
    apps/[slug]/[...section]/page.tsx
    workspace/[orgSlug]/[...section]/page.tsx
```

Desktop and mobile stay aligned because both slot trees call the same
route-level context resolver. App-record slots use `resolveAppContexts`; org
workspace slots use `resolveWorkspaceContexts`. Add route-specific context to
the shared resolver, not independently to one renderer.

`resolveAppContexts` remains under the route subtree because it uses the app
record loader; `features/` must not import route code.

## Workspace behavior

`/workspace/<org>` is the workspace launcher. It belongs to no single product,
so it keeps the platform context.

A route below the launcher, such as a product workspace route, contributes the
appropriate workspace/product context. The existing sidebar then renders that
context:

```text
platform sidebar
      ↓ enter product
product context in same sidebar
      ↓ enter org workspace
workspace context in same sidebar
```

Do not implement this as:

```text
platform sidebar + product sidebar
```

or:

```text
workspace page containing its own secondary app sidebar
```

There must be one source of navigation truth for the active context.

A workspace context may set `subtitle` to the organization name because the
sidebar is the chrome that identifies both the product and the organization.
An app record that names only one thing leaves `subtitle` unset.

## Parallel-route requirements

The concrete app record route and its descendants use a base `page.tsx` plus a
required `[...section]` route. The workspace slot also uses a required
`[...section]` because `/workspace/[orgSlug]` is a real launcher page. Do not
replace these with an optional catch-all that conflicts with the concrete route.

The catch-all is what keeps route-specific navigation active below the record;
for example, `/apps/876-crm/plans/pro` must not fall back to platform navigation.

## Resolution

The open context is derived from the pathname rather than stored click state.
A deep link, refresh, browser back, and browser forward therefore resolve the
same navigation level without synchronizing a second navigation state machine.

- `resolveSidebarContextStack(pathname, navigation, declared)` returns the stack
  root-first and deepest-last. Claiming contexts order by href length, and a
  context whose declared parent is not already on the stack is dropped rather
  than silently grafted elsewhere.
- `resolveSidebarBackContext(stack, key)` returns one level up. A workspace
  beneath CRM can therefore say "Back to CRM" rather than always returning to
  the platform root.
- `entryOpensContext(entry, contexts)` matches by the entry href rather than by
  `children`, because a separately declared context can be empty.
- `resolveActiveEntryKey(pathname, context)` uses the longest matching href so a
  record page belongs to the correct navigation entry instead of its shorter
  index prefix.

The one local navigation state in the desktop renderer is a deliberate
**back-out**. Pressing the contextual back control displays the parent context
without navigating away. It stores the dismissed context key together with the
current pathname, so any actual navigation reinstates the route-derived context.

## Back versus collapse

These remain deliberately separate operations:

- **Back** changes which navigation context is being displayed.
- **Collapse** changes only the width/presentation of the standard sidebar.

The contextual back control lives in the sidebar header when a parent exists.
The collapse control is the shared `SidebarTrigger` in the desktop topbar. Do
not combine them into one control.

## Desktop identity

At the platform root, the sidebar header owns the Console logo/name. In a deeper
context that header is replaced by the contextual back control plus the current
context title/subtitle. This matches the full-height sidebar geometry: the app
identity belongs at the top of the left navigation surface, while the content
topbar begins with the standard collapse trigger.

The mobile topbar keeps its compact Console identity beside the mobile
navigation sheet trigger because the desktop sidebar is absent there.

## Slots

A sidebar slot is non-navigation content such as an announcement, standalone
action, live indicator, or future card. Declarations remain plain data:

```ts
{ key, region, title, icon, componentKey, requires? }
```

Regions retain their order:

1. `top`
2. `above-nav`
3. navigation groups
4. `below-nav`
5. `footer`

In the standard renderer, `top` lives in `SidebarHeader`, `above-nav` and
`below-nav` live in `SidebarContent`, and `footer` lives in `SidebarFooter`.
Slot permission filtering remains in `resolveSidebarSlots` and uses the same
navigation requirement predicate as ordinary nav entries.

`sidebarSlotDefinitions` is currently empty. Keep the mechanism; do not invent a
slot merely to exercise it.

## Shared floating navigation rail

The old compact Console presentation has been promoted because Projects was
already carrying the same geometry and spring implementation.

`@876/ui/floating-nav-rail` owns only reusable presentation:

- compact 3.75rem collapsed width;
- `w-56` expanded width;
- content-sized rounded card surface;
- shell gutter placement;
- shared spring easing and reduced-motion transition behavior;
- a presentation-only toggle that calls the consumer's state setter.

It does **not** own:

- route matching;
- navigation data;
- permissions;
- app identity;
- workspace semantics;
- expansion persistence.

Projects currently owns its app-scoped localStorage preference while consuming
the shared rail. A future app can choose a different state policy without
changing the primitive.

Do not confuse this primitive with `Sidebar variant="floating"`; the latter is
the shadcn full-height floating sidebar treatment.

## Extraction boundary

The contextual stack stays Console-local for now. Although much of
`sidebar-context.ts` is generic, Console is still the only app using this exact
platform → section → product → workspace stack. Per the reuse-first rule, do not
promote the resolver merely because it could theoretically be shared.

If a second app adopts the same navigation-context behavior, first remove the
remaining Console-specific path-matching dependency, then promote the behavior
to its correct cross-app owner. Until then, the shared boundary is presentation
only.

## Verification

GPT-Web cannot execute these commands. Run them from the local orchestrator:

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
```

Manual browser checks should cover root Console, section contexts, app-record
contexts, organization product workspaces, collapse persistence, mobile context
parity, and Projects' compact floating rail.
