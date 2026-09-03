# Console sidebar shell

The Console sidebar is a pathname-derived context stack. The platform rail is
level 0; a declared section, product, or workspace replaces it with that
context's entries. Only one context is rendered at a time.

## Contexts

Contexts are plain serializable data:

```ts
{
  key: 'crm',
  kind: 'product',
  title: 'CRM',
  href: '/apps/crm',
  parentKey: 'platform',
  entries: [...]
}
```

`NavEntry.children` supplies section contexts already owned by the Console
navigation registry. `sidebar-context-config.ts` is for contexts that need a
standalone declaration before their complete navigation exists. Empty contexts
are valid; Storage is the current example and intentionally has no screens.

`resolveSidebarContextStack()` owns pathname matching and parent ordering. The
sidebar does not keep the current context in a store. A refresh or deep link
therefore reconstructs the same context directly from the URL.

## Expand and back

The rail is collapsed by default. Expansion is an explicit, global preference
stored under the versioned key `876_console_sidebar_expanded:v1` and synchronized
through `useSyncExternalStore`.

Back is a separate control from expansion. It dismisses the active nested
context and exposes the platform rail without changing browser history.

The current implementation has a single nested level in the visible Console
registry, while the context resolver already models parent relationships for
future product → workspace stacks.

## Slots

Sidebar slots are declared as serializable data with a region, icon key and
client renderer key. Supported regions are `top`, `above-nav`, `below-nav`, and
`footer`.

The server resolves permission/feature requirements before the data crosses the
RSC boundary. Every slot therefore has a collapsed (icon + tooltip) and
expanded (full content) rendering contract once a renderer is registered.

Phase 1 ships the slot mechanism with zero real slots.

## Spring motion

`sidebar-motion.ts` exposes the named spring parameters and generates the CSS
`linear()` timing function consumed by the rail. The current values are:

- stiffness: `320`
- damping: `24`
- mass: `1`

The resulting curve intentionally overshoots by roughly 5–6% before settling.
`motion-reduce:transition-none` disables the transition for reduced-motion
users.

The card uses `interpolate-size: allow-keywords` so content-driven height can
animate where the browser supports it. The aside uses `justify-center`, keeping
row-count changes centred rather than collapsing toward the top.

## Testing

Focused shell tests cover pathname resolution, nested context ordering, empty
contexts, permission/feature-gated slots, localStorage failure handling, and the
spring output. Run the Console typecheck, lint, test suite, and the repository
app-structure check before submitting a change.
