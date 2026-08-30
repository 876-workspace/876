# Shared Product UI Surfaces

Read this before building a product screen that more than one 876 surface will
render — a CRM customer record shown in both 876 CRM and Console, a Work task
list shown in CRM and a future careers app, an invoice document shown in Invoice
and Billing — and before creating a new product app that reuses any existing
domain UI.

Companion to `.claude/rules/app-structure.md` (where a component lives inside
one app), `.claude/rules/access-tiers.md` (on whose authority the host calls),
and `.claude/rules/app-layout.md` (what a page looks like).

## The problem

The same domain screen ends up implemented twice — once in the product app,
once in Console — and the two drift. A tab is added in one and not the other; a
status badge means different things; a field renders in CRM and is missing in
the operator view of the same record. Nobody notices, because both compile.

## The rule

> **A product screen that more than one host renders is defined once, in a
> `@876/<product>-ui` package. Hosts adapt it; they never re-implement it.**

```
packages/ui         design-system primitives — no domain knowledge
packages/<p>-ui     one product's screens — no host knowledge
apps/<host>         routing, data, authorization, mutations
```

Existing packages: `@876/crm-ui`, `@876/work-ui`. A new product domain with two
hosts gets its own; a domain with exactly one host stays in that app under
`features/<domain>/` until a second host appears (`app-structure.md`).

## What the package owns, and what it must not

A `<product>-ui` package owns **presentation and product composition**: the
record chrome, the tab set, the list/detail arrangement, the field layout, the
empty and loading treatments. That is the part that must not differ between
hosts.

It must not own, and must not import:

- **routing** — no hard-coded paths. A host passes `baseHref` /
  `customersHref`; the package concatenates. A path literal in a shared package
  is a host assumption that will be wrong for the second host.
- **data loading** — no `$876`, no service client, no `fetch`. Hosts load and
  pass plain props.
- **authorization** — no permission checks, no session reads. A host that may
  not show an action does not pass it (`actions`, `newCustomerHref`), and the
  package renders nothing rather than deciding.
- **mutations** — no route-handler calls. Callbacks in, host decides.
- **another host's app code** — never import from `apps/`.

It may depend on `@876/ui`, `@876/core`, and its own product's contract package
(`@876/crm`, `@876/work`) for types.

**Host-only affordances are explicit props, not conditionals on a host name.** A
shared component must never branch on "is this Console". If it needs to know,
the caller was supposed to tell it.

## Every app transpiles the shared list, automatically

These packages ship raw `.tsx`, so every Next app must list them in
`transpilePackages`. Doing that per app is exactly the drift this rule exists to
prevent, so no app writes the list itself:

```ts
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'

const nextConfig: NextConfig = {
  transpilePackages: sharedTranspilePackages(['@876/sdk', '@876/core']),
}
```

Adding a package to `SHARED_UI_PACKAGES` in `scripts/shared-ui-packages.mjs`
wires it into every existing app and every future one — careers, events, and
whatever comes after — with no per-app edit. `pnpm check:transpile` enforces
this in CI.

**A missing entry does not fail the build.** It fails in the browser, as
`Element type is invalid. Received a promise that resolves to: undefined`, at
the first client component the package exports. That is how `@876/crm-ui` and
`@876/work-ui` broke Console's CRM workspace on 2026-08-30, and it is why the
list is shared rather than copied.

## Compatibility delegates

When a surface moves out of `@876/ui` into a product package, the old
`@876/ui/<name>` entry point stays as a one-line re-export rather than being
deleted:

```ts
export { WorkTaskList, type WorkTaskListProps } from '@876/work-ui/task-list'
```

There is then still exactly one implementation, and no caller has to be updated
in the same change as the move.

## Adding a new host to an existing surface

1. Add the `@876/<product>-ui` dependency to the host's `package.json`.
2. Write a **thin adapter** in `apps/<host>/src/features/<domain>/components/`
   that supplies the host's `baseHref`, its tab subset, and its permitted
   actions.
3. Load the data in the host, through its own `$876` facade at its own access
   tier, and pass plain props.
4. Authorize in the host's route guard and route handlers — never in the
   package.
5. If the host needs a variation the package cannot express, **add a prop to
   the package**. Forking the component is the failure mode this rule forbids.

## Creating a new product app

Beyond `.claude/rules/new-app-guide.md`: the new app inherits every shared
surface through `sharedTranspilePackages()` and needs no UI of its own for a
domain that already has a `<product>-ui` package. Build genuinely new screens in
`features/<domain>/` first, and promote them to a package only when a second
host renders them.

## Do not

- Do not copy a product screen into a second host.
- Do not put a route path, a data call, a session read, or a permission check in
  a `<product>-ui` package.
- Do not branch on the host inside a shared component.
- Do not import `apps/` from `packages/`.
- Do not hand-write `transpilePackages` in an app's `next.config.ts`.
- Do not delete a moved `@876/ui` entry point; leave a delegate.
- Do not promote a surface to a package before a second host needs it.
