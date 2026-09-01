# Access Control Standard

Read this before adding or changing permissions, role resolution, navigation gating, route guards, API authorization, feature-gated capabilities, or experiments in any 876 app.

Related rules: `access-tiers.md`, `app-access.md`, `feature-flags.md`, and `app-layout.md`.

## One catalog format, storage chosen by tier

Every app declares permissions with the canonical `AppPermissionCatalog` format from `@876/core/access`. Permission keys are durable identifiers once persisted; rename one only through an explicit coordinated contract and data migration.

The access tier decides where roles live, not how permissions are described or resolved:

- **Operator-tier** surfaces such as Console act on 876's authority. Their roles/grants may live in the operator app's own datastore.
- **Org-tier** product apps store organization-scoped roles and assignments in the platform app-access plane.

Both tiers consume the same catalog format and `resolveEffectivePermissions`. A new app should declare policy rather than reimplement a resolver.

## The three enforcement layers

Every gated capability has all three layers:

1. **Navigation visibility** — the navigation registry requirement hides doors the subject cannot use. This is UX, never the security boundary.
2. **Route guard** — the page or nearest gating layout checks the same permission key before rendering. This is security.
3. **API authorization** — every mutating route handler authorizes before invoking the owning service/facade. This is security and the final application-side word.

Hiding a link never replaces a guard. A route guard never replaces authorization on a mutation.

### Binding rule

A navigation entry's `requires.permission` must equal the permission checked by its destination route or nearest gating layout. Every app with permission-gated navigation must have a binding test that walks the registry and proves this relationship. Fix the route or registry when the test fails; never weaken the test to tolerate drift.

## Permission, feature flag, experiment

These answer different questions and occupy different slots in `AccessContext`.

| Mechanism    | Question                                                            | May authorize?                      |
| ------------ | ------------------------------------------------------------------- | ----------------------------------- |
| Permission   | May this subject do this?                                           | Yes                                 |
| Feature flag | Does this capability exist for this subject yet?                    | Only as an AND alongside permission |
| Experiment   | Which presentation variant should an already-permitted subject see? | Never                               |

When a capability has both a permission and a feature flag, visibility and route access require **permission AND feature**. A feature rollout is not a role permission. Authorization is not a PostHog flag.

Experiments return variant strings and belong only in `AccessContext.experiments`. Presentational code may call `variantOf`; authorization code must not use experiment assignments. Do not add `canExperiment` or route guards based on variants.

## Request-scoped access context

Resolve one request-scoped `AccessContext` and reuse it for navigation and guards. It contains:

- the acting subject;
- catalog-intersected effective permission keys;
- enabled feature keys;
- experiment variant assignments.

Memoized request resolvers must take primitive arguments such as `userId`; `React.cache` uses `Object.is`, so allocating `{ userId }` at each call defeats memoization.

`can`, `hasFeature`, and `variantOf` are pure queries over the already-resolved context. They do not fetch data and do not broaden access.

## Navigation registry contract

Declare navigation with `defineNavigation` and plain data. A `NavEntry` may require `permission`, `feature`, and/or `anyPermission`.

Resolution rules:

- permission and feature are ANDed;
- `anyPermission` succeeds when at least one named permission is held and ANDs with the other requirements;
- children filter before parents;
- a declared parent with zero visible children is removed;
- an empty group is removed;
- an empty `anyPermission` array is unsatisfiable.

Navigation crosses the RSC-to-client boundary, so registry output must be structurally cloneable. Store icon **keys**, not React components or functions, and resolve those keys in the client shell. Resolve/filter navigation on the server before sending it to the browser.

## Console affiliation policy

A Console access grant is the only gate. Neither an 876 account, an Efesto Technologies organization membership, nor an employee profile grants Console access; absence of a Console grant means absence of Console access.

- **`staff`** — an Efesto Technologies member. Guard-time verification requires a live, active membership in `CONSOLE_STAFF_ORGANIZATION_ID`. Position comes from the employee profile. Expiry is optional because employment itself supplies the subtractive lifecycle check.
- **`contractor`** — engaged by Efesto but not employed by it. Expiry and justification are required. Position is free text on the Console grant.
- **`external`** — an auditor, regulator, law-enforcement liaison, or partner with a legitimate bounded need for Console. Expiry and justification are required. External operators are deliberately not verified against Efesto membership. Position is free text on the Console grant.

Platform account type is irrelevant to affiliation. An external auditor may use a personal or enterprise 876 account; Console authorizes the operator from its own grant, not from the platform account shape.

Employment verification is subtractive and one-directional. An explicit inactive or missing Efesto membership denies a `staff` grant. A provider/infrastructure outage does not: the already-valid Console grant remains usable, the outage is captured, and verification is retried on the next request. This check can only remove access; it can never create or widen access.

Only `staff` may hold `owner` or `super-admin`. Contractor and external grants are capped at `admin`; create and update validation must evaluate the resulting affiliation/role combination.

## Subtractive verification and outage direction

Some checks can only **subtract** from an already-valid grant, such as Console verifying that a grant marked `staff` still corresponds to active employment. A verification that can only subtract may fail open on an infrastructure failure when the product decision explicitly requires continuity: preserve the already-established grant, capture the outage, and retry on the next request.

A negative business result is not an infrastructure outage. An explicit inactive/missing employment record denies access. A verification that could ever **add** or widen access must fail closed.

Document every fail-open verification. Do not generalize this rule into "authorization fails open"; ordinary permission and grant resolution remains fail closed.

## API authorization

Client-initiated mutations use the app's thin same-origin route handler. The handler must:

1. authenticate and check the exact permission;
2. return a stable 403 authorization value when denied;
3. parse transport input;
4. call the owning service/facade once;
5. return the canonical result envelope.

Do not redirect from an API authorization failure. Keep application chrome mounted and let the client handle the error value according to `error-handling.md`.

## Required tests

For every app that adopts this standard:

- catalog drift test: persisted/system role keys are a subset of the catalog;
- navigation resolution tests with exact visible href sets by role;
- registry-to-route binding test;
- guard behavior tests, including negative space;
- guard-coverage test for every mutating route handler;
- serialization and input-immutability tests for shared navigation primitives;
- permission + feature AND tests;
- an assertion that experiments cannot authorize a route/capability.

## Do not

- Do not treat navigation hiding as security.
- Do not use a feature flag as a permission or a permission as rollout state.
- Do not let an experiment variant decide whether access exists.
- Do not maintain a second hand-written permission list for a role editor.
- Do not ship the full privileged navigation registry to an unprivileged browser and filter it client-side.
- Do not persist React components/functions in a navigation registry that crosses an RSC boundary.
- Do not rename persisted permission keys casually; use a coordinated compatibility and data migration.
- Do not make organization membership implicitly grant an operator-tier surface.
- Do not copy operator-tier role storage into org-tier product apps; copy the catalog/context/registry pattern instead.
- Do not fail open when a verification can widen access.
- Do not add a mutation without both route-level authorization and owning-service enforcement.
