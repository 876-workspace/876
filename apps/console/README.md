# Console application configuration

Console reads platform configuration through the named operator clients in
`src/lib/clients/`. Product sign-in feature evaluation and administrative
catalog reads have separate purposes: the former resolves a user's enabled
flags; the latter supplies all of an app's configuration options.

`src/lib/apps-catalog.ts` shares the complete public-app catalog between the
shell's feature evaluation and app detail routes. It follows every cursor page
and caches only within the current server render. A later request sees current
operator edits.

Shared server loaders under `src/lib/console/` own repeated configuration reads:

- `modules.ts`: module lists for plan creation, entitlements, module management,
  and feature associations; complete same-app root feature options.
- `provisioning.ts`: application/finance resource catalogs and parallel
  currency/language reads for provisioning editors.
- `catalog-pages.ts`: complete cursor catalogs, preserving failed-page errors
  instead of treating a partial list as complete.

Create-plan fields render while the server-started module promise is pending.
Submission stays disabled when the catalog is unavailable. Catalog and mutation
errors remain visible in the form, with entered values and selections retained.
Module management also blocks saving when rollout options could not be loaded,
so a failed lookup cannot clear an existing feature association.

Code-owned Billing/Invoice identities come from `@876/core/modules`; plan
composition and rollout associations remain operator-controlled. The API's
explicit seed operation materializes the commercial module rows that Console
displays. See [API seed instructions](../api/README.md#schema-and-seeds).
Console does not seed catalogs or modify provisioning defaults during sign-in.
