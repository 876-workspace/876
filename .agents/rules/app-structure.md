# App Source Structure

Read this before creating **any** component, hook, or module file in a Next.js
app (`apps/876`, `apps/enterprise`, `apps/console`, `apps/couriers`,
`apps/billing`, and every future app), and before moving one. It fixes where a
file lives so that "where does this go?" has exactly one answer, and so a
directory listing tells you what an app does rather than what its authors
happened to name things.

Companion to `.agents/rules/app-layout.md` (what a page _looks_ like),
`.agents/rules/sdk-conventions.md` (`src/lib/` layering), and
`.agents/rules/types.md` (where types live).

## The problem this fixes

A flat `src/components/` directory does not scale. At 20 files it is a list; at
65 it is a landfill. The failure is not aesthetic — it is that **nothing in a
flat directory tells you what may import what**, so every component is
implicitly global, every domain leaks into every other, and deleting a feature
means grepping the whole app to find its parts.

The fix is not "more folders". It is **scope**: every file is placed by _who is
allowed to use it_, and the directory it lives in is the enforcement of that.

## The five buckets

```
apps/<app>/src/
  app/
    (app)/
      widgets/
        _components/          ← 1. route-local: this route subtree only
        page.tsx
        [id]/
          _components/        ← nested route subtree gets its own
          page.tsx
  components/
    shell/                    ← 2. the app frame: sidebar, topbar, nav, user menu
    providers/                ← 3. context providers only
    patterns/                 ← 4. app-wide generic UI, not yet cross-app
  features/
    widgets/                  ← 5. one product domain, used by several routes
      components/
      types.ts
      utils.ts
  hooks/  lib/  stores/  types/
```

### Placement rule

Ask **"who imports this?"** — not "what kind of thing is it?".

| Who imports it                                           | Where it goes                   |
| -------------------------------------------------------- | ------------------------------- |
| One page, or one route subtree                           | `app/<route>/_components/`      |
| Several routes, all within one product domain            | `features/<domain>/components/` |
| The app frame itself (sidebar, topbar, nav, shell)       | `components/shell/`             |
| A React context provider                                 | `components/providers/`         |
| Anywhere in this app, domain-agnostic, not yet cross-app | `components/patterns/`          |
| Two or more apps, with no API/session/domain knowledge   | `packages/ui`                   |

**Default to the narrowest bucket that works.** A component starts in
`_components/`, moves to `features/` when a second route needs it, and moves to
`packages/ui` when a second _app_ needs it. Promotion is cheap and reviewable;
demotion never happens, which is why starting broad is the expensive mistake.

## The buckets in detail

### 1. `app/**/_components/` — route-local

The `_` prefix is Next.js's **private folder** convention: the directory and
everything under it is excluded from routing, so it can sit beside `page.tsx`
without becoming a URL segment.

- A route directory should contain **only** route files — `page.tsx`,
  `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`,
  `global-error.tsx`, `manifest.ts`, `sitemap.ts`, `opengraph-image.tsx` — plus
  the private siblings below.
- Three private siblings, by content:
  - **`_components/`** — anything that renders (`.tsx` exporting a component).
  - **`_lib/`** — pure helpers for this route subtree: column builders that are
    plain data, formatters, `*-utils.ts`. No JSX.
  - **`_data.ts`** — this route's data loading. Already in use in Console; keep
    the single-file form rather than a `_data/` folder until it outgrows one file.
- A non-route `.tsx` sitting as a bare sibling of `page.tsx` is a **bug in
  placement**, not a style choice. Console once had 114 of them.
- A nested route gets its **own** `_components/` for its own files. A
  descendant route **may** import from an ancestor's `_components/` — that is
  what "private to the subtree" means, and it is how a section like
  `orgs/[slug]/billing/` shares a form with its own child routes.
- A route may **never** reach sideways into another subtree's `_components/`.
  `apps/[slug]/provisioning/` importing from `orgs/provisioning/_components/`
  is the violation this rule exists to prevent: it makes route ownership
  unknowable and defeats any later boundary enforcement. If two subtrees need
  the same component, it belongs in `features/<domain>/components/`.
- The mechanical test: an import of another route's `_components/` is legal
  only when the importing file's path **starts with** the owning route's path.
- Tests live beside their subject: `_components/foo.tsx` +
  `_components/foo.test.tsx`.

### 2. `components/shell/` — the app frame

Exactly one shell per app: sidebar, topbar, nav config, nav links, mobile nav,
user menu, org/app switchers, theme switcher. These are the pieces that render
on every route and are unique to this app.

Nav **config** (`<app>-nav-config.ts`) belongs here too — it describes the app
frame, and keeping it beside the sidebar that consumes it is the point.

### 3. `components/providers/` — context providers only

Client context providers and their hooks. Nothing that renders product UI. If a
provider is getting business logic, that logic belongs in `src/lib/`.

### 4. `components/patterns/` — app-wide, domain-agnostic

Composed UI used across unrelated routes that is **not** a design-system
primitive (those are `packages/ui`) and **not** tied to one domain (that is
`features/`). Examples: a list pagination control, a status-filter heading, a
detail-field row, a metric card.

`patterns/` is a **waiting room, not a destination.** A pattern that a second
app needs should be promoted to `packages/ui`.

One level of grouping is allowed for a **cohesive cluster of pieces that are
only ever used together** — `patterns/detail/` (the detail-view accordion,
info section, stat tile, placeholder). That is a named thing, not a category
folder. Do not create category folders (`patterns/forms/`, `patterns/tables/`)
— those are the flat directory reintroduced one level down.

### 5. `features/<domain>/` — one product domain

A feature is a **product area with a name a non-engineer would recognize**:
`access`, `widgets`, `plans`, `catalog`, `subscriptions`, `documents`,
`payments`. It owns the components, types, and pure helpers used by several
routes within that area.

```
features/catalog/
  components/
    price-tier-editor.tsx
    price-tier-editor.test.tsx
  catalog-price-draft.ts
  types.ts
```

Rules:

- **A feature never imports another feature's internals.** If
  `features/subscriptions` needs something from `features/catalog`, that
  something is either a `patterns/` component or belongs in `src/lib/`. Sibling
  imports are how a "modular" tree turns back into a ball of mud.
- **`features/` may not import from `app/`.** Dependencies point inward:
  `app/` → `features/` → `components/` → `packages/ui`. Never the reverse.
- `components/` may not import from `features/` — a shell that knows about a
  product domain is no longer a shell.
- A feature directory is not a _layer_. Do not create
  `features/<domain>/{hooks,utils,constants,helpers}` reflexively; add a file
  when there is something to put in it.

## Types

Follow `.agents/rules/types.md`. Within this structure:

- A component's own props interface stays **beside the component**, exported
  from the same file. Do not relocate props to a shared types file.
- `features/<domain>/types.ts` is for types shared by **several files inside
  that feature**.
- `src/types/` is for contracts crossing feature, lib, or route boundaries.
- **Do not create a global `interfaces/` directory.** It is a flat
  `components/` folder with a different name — the same unsearchable pile, one
  level of indirection further from the code.

## Barrels

**No barrel `index.ts` re-exporting a whole directory.** Import the concrete
module (`@/features/access/components/flag-targeting-sheet`), not
`@/features/access`. Barrels hide ownership, defeat
`optimizePackageImports`-style analysis, and make it impossible to tell from a
diff which module a route actually depends on. See
`.agents/rules/performance-bundle-size.md` §2.1.

The one sanctioned exception is a package's declared public entry point
(`packages/ui`'s subpath exports, `src/lib/service/index.ts`) — a boundary that
is _deliberately_ a contract, not a convenience.

## `src/lib/` — console is the reference shape

`apps/console/src/lib/` is the canonical layout. Every app carries the same
spine; only apps that genuinely own a datastore carry the datastore layers.

| Directory / file   | Present in            | Holds                                                            |
| ------------------ | --------------------- | ---------------------------------------------------------------- |
| `876.ts` or `876/` | every app             | the `$876` singleton (see `.agents/rules/sdk-conventions.md`)    |
| `<app>-app.ts`     | every app             | the app's slug/identity constants                                |
| `analytics/`       | every app             | PostHog/analytics dispatch                                       |
| `auth/`            | every app             | `guards.ts`, session helpers, route guards                       |
| `client/`          | every app             | the typed browser mutation client                                |
| `errors/`          | every app             | the app's error registry and mappers                             |
| `id/`              | every app             | id generation/parsing helpers                                    |
| `db/`              | apps with a datastore | the request-scoped `prisma` singleton, generated client          |
| `service/<res>/`   | apps with a datastore | `<verb>.ts` per file — the only caller allowed to query `prisma` |

Apps with a datastore today: `console`, `billing`, `couriers`. `876` and
`enterprise` must **not** grow `db/` or `service/` — they have no bounded
context of their own.

`src/lib/` holds **no JSX**. A file under `lib/` that renders is a component
that landed in the wrong bucket.

## Naming

- Files are `kebab-case.tsx`; the default export is `PascalCase`.
- **Do not prefix a file _or its exported symbol_ with its own app name inside
  that app.** `components/shell/sidebar.tsx` exporting `Sidebar`, not
  `components/console-sidebar.tsx` exporting `ConsoleSidebar` — the path
  already says `apps/console`, and the prefix is noise that survives only
  because the flat folder gave no other way to group. This applies to
  components, their prop types (`ShellUser`, not `ConsoleShellUser`), local
  helpers, and nav config.
- The `<app>-app.ts` identity file in `lib/` is the deliberate exception; it
  names the app as data.
- **When dropping the prefix collides with a `@876/ui` primitive, alias the
  primitive, not the local component.** The app-local component owns the plain
  name; the imported primitive takes the suffix:

  ```tsx
  import { Sidebar as SidebarRoot, SidebarContent } from '@876/ui/sidebar'

  export function Sidebar() {
    return <SidebarRoot>…</SidebarRoot>
  }
  ```

  Re-prefixing the local component to dodge the collision reintroduces exactly
  the noise this rule removes.

- Directory names are singular for a domain (`features/access`) and plural for
  a collection of like things (`components/providers`).

## Applying this to a new app

Scaffold the five buckets empty, copy `components/shell/` from Console or
Couriers, and place the first component by the placement rule rather than
"somewhere in components for now". See `.agents/rules/new-app-guide.md` for the
platform-integration side.

## Do not

- Do not leave a non-route `.tsx` as a bare sibling of `page.tsx`.
- Do not import from another route's `_components/`, in either direction.
- Do not import another feature's internals from a feature.
- Do not import `features/` from `components/`, or `app/` from either.
- Do not create a global `interfaces/` or `utils/` catch-all directory.
- Do not add a barrel `index.ts` that re-exports a directory.
- Do not prefix files with the app's own name inside that app.
- Do not add `db/` or `service/` to an app with no datastore.
- Do not put JSX in `src/lib/`.
- Do not treat `components/patterns/` as permanent — promote to `packages/ui`
  once a second app needs it.
