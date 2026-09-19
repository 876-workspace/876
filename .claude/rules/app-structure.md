# App Source Structure

Read this before creating **any** component, hook, or module file in a Next.js
app (`apps/876`, `apps/enterprise`, `apps/console`, `apps/couriers`,
`apps/billing`, and every future app), and before moving one. It fixes where a
file lives so that "where does this go?" has exactly one answer, and so a
directory listing tells you what an app does rather than what its authors
happened to name things.

Companion to `.claude/rules/app-layout.md` (what a page _looks_ like),
`.claude/rules/sdk-conventions.md` (`src/lib/` layering), and
`.claude/rules/types.md` (where types live).

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
  `_components/foo.test.tsx`. That cuts both ways — a **route file's** test
  stays beside the route file (`page.tsx` + `page.test.tsx`), and must **not**
  be pushed into `_components/` to satisfy a "no bare `.tsx` beside `page.tsx`"
  reading. Both directions are enforced by
  `scripts/check-app-structure.mjs`.

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

Follow `.claude/rules/types.md`. Within this structure:

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
`.claude/rules/performance-bundle-size.md` §2.1.

The one sanctioned exception is a package's declared public entry point
(`packages/ui`'s subpath exports, `src/lib/records/index.ts`) — a boundary that
is _deliberately_ a contract, not a convenience.

## `src/lib/` — a closed root, not a pile

`src/lib/` carries the same spine in every app. Its **root holds only directories** — one
per module, each with an `index.ts`. There are no loose files.

| Directory / file | Present in                  | Holds                                                             |
| ---------------- | --------------------------- | ----------------------------------------------------------------- |
| `clients/`       | apps with 876 service data  | one explicit bounded client module per domain the host consumes   |
| `records/`       | apps with their own Prisma  | `<resource>/<verb>.ts` — the only caller allowed to query `prisma` |
| `db/`            | apps with their own Prisma  | the request-scoped `prisma` resolver, generated client            |
| `analytics/`     | every app                   | PostHog/analytics dispatch                                        |
| `auth/`          | every app                   | `guards.ts`, session helpers, route guards                        |
| `client/`        | every app                   | the typed browser mutation client                                 |
| `errors/`        | every app                   | the app's error registry and mappers                              |
| `id/`            | every app                   | id generation/parsing helpers                                     |
| `<app>-app/`     | every app                   | the app's slug/identity constants                                 |
| `logger/`        | every app                   | the app's logger                                                  |
| `features/`      | every app                   | this app's feature-flag resolution                                |
| `permissions/`   | apps with a catalog         | this app's permission catalog and helpers                         |
| `format/`        | apps that display values    | display formatting — **re-exports `@876/core`, never reimplements** |

Apps with their own Prisma records layer today: `console`, `widgets-api`.

### `clients/` reach out; `records/` are ours

These two answered to names that differed by one letter — `services/` and
`service/` — and meant opposite things. In Billing alone that was 72 imports of
one and 90 of the other, and reading `service.customers.list()` gave no signal
whether you were on the app's own data or a bounded 876 client.

- **`clients/`** — configured clients for *other* bounded 876 services:
  `platform`, `workspace`, `crm`, `billing`, `storage`. They reach outward.
  They are clients, so they are called clients.
- **`records/`** — this app's *own* rows, the only code permitted to touch
  `prisma`. They belong to this app, and to no other surface.

```ts
import { platform } from '@/lib/clients/platform'
import { records } from '@/lib/records'

const { data } = await platform.users.list({ limit: 25 })
const roles = await records.roles.list()
```

There is no third option at this root. A transitional compatibility shim does
not get a name here — it gets deleted and its callers migrated. The platform is
pre-launch; nothing carries a backwards-compatibility obligation.

### The root holds directories, not files

Every module in `src/lib/` gets a **folder and an `index.ts`**, so its parts,
its tests and its types live together and the root reads as a list of
capabilities rather than a landfill.

```
lib/permissions/index.ts        not  lib/permissions.ts
lib/permissions/index.test.ts        lib/permissions.test.ts
lib/logger/index.ts                  lib/logger.ts
lib/slug/index.ts                    lib/slug.ts
```

A module's `index.ts` is its **declared entry point** — the sanctioned
exception to the no-barrel rule above. It is not a barrel over unrelated
modules, and no other `index.ts` belongs in `lib/`.

Because TypeScript resolves `@/lib/permissions` to both `permissions.ts` and
`permissions/index.ts`, moving a module changes no import **in a Next app**.
Only relative specifiers inside the moved file shift by one directory.

**An Express service on NodeNext ESM is different.** It imports with an
explicit extension, and `../../lib/recurrence.js` does *not* resolve to
`recurrence/index.js` — every importer must become
`../../lib/recurrence/index.js`, including any `vi.mock()` path, which fails
silently rather than erroring when it is wrong.

This is not tidiness. A pile is unscannable, so people re-add instead of
reusing, and the repo measurably paid for it: **eight** copies of `features.ts`
differing only in an app slug, **three** of `apps-directory.ts` with drifted app
lists, and **two** `formatMoney` implementations with different signatures
inside console's own `lib/`.

`scripts/check-app-structure.mjs` check 8 enforces it and names the folder each
loose file belongs in. It has no exemption list: every app reached zero loose
files in one pass, so the migration ratchet that carried the 92 pre-existing
ones was deleted with the last of them.

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
"somewhere in components for now". See `.claude/rules/new-app-guide.md` for the
platform-integration side.

## Do not

- Do not leave a loose `.ts` at the `src/lib/` root; give it a folder.
- Do not leave a non-route `.tsx` as a bare sibling of `page.tsx`.
- Do not import from another route's `_components/`, in either direction.
- Do not import another feature's internals from a feature.
- Do not import `features/` from `components/`, or `app/` from either.
- Do not create a global `interfaces/` or `utils/` catch-all directory.
- Do not add a barrel `index.ts` that re-exports a directory.
- Do not prefix files with the app's own name inside that app.
- Do not add `db/` or `records/` to an app with no data of its own.
- Do not put JSX in `src/lib/`.
- Do not treat `components/patterns/` as permanent — promote to `packages/ui`
  once a second app needs it.
