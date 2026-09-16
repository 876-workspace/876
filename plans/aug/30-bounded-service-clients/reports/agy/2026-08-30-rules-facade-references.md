# Facade References Update Report

## Summary of Changes

| File                                     | Changed | Unchanged |
| ---------------------------------------- | ------- | --------- |
| `.claude/rules/app-access.md`            | 3       | 0         |
| `.claude/rules/app-layout.md`            | 1       | 2         |
| `.claude/rules/app-structure.md`         | 0       | 1         |
| `.claude/rules/billing-data-plane.md`    | 0       | 1         |
| `.claude/rules/customer-architecture.md` | 3       | 0         |
| `.claude/rules/data-loading.md`          | 2       | 1         |
| `.claude/rules/feature-flags.md`         | 1       | 0         |
| `.claude/rules/shared-product-ui.md`     | 1       | 2         |
| `.claude/rules/storage-architecture.md`  | 0       | 1         |
| `.claude/rules/new-app-guide.md`         | 2       | 5         |

## Detailed Changes

### `.claude/rules/app-access.md`

**Changed:**

- Old: `- A session-tier self read may remain \`$876.appMemberships.me.retrieve()\`.`New:`- A session-tier self read may remain \`workspace.appMemberships.me.retrieve()\`.`
- Old: `@876/sdk`
  New: `@876/account`
- Old: `@876/admin`
  New: `@876/platform`

### `.claude/rules/app-layout.md`

**Changed:**

- Old: `const result = await $876.users.list({ limit: 25, status: userStatus })`
  New: `const result = await platform.users.list({ limit: 25, status: userStatus })`

**Unchanged:**

- Text: `` `undefined` to the `$876` (or app service) call, not the literal string``
  Reason: Cannot confidently determine the owning domain; this is a generic facade reference.
- Text: `const result = await $876.widgets.list({`
  Reason: Cannot confidently determine if there is a domain or resource called widgets under the new model, as only notes and collections are explicitly listed under the widgets domain.

### `.claude/rules/app-structure.md`

**Unchanged:**

- Text: `| 876.ts or 876/ | every app             | the $876 singleton (see .claude/rules/sdk-conventions.md)    |`
  Reason: Cannot confidently determine a single domain to replace the singleton reference; this is a generic architectural reference.

### `.claude/rules/billing-data-plane.md`

**Unchanged:**

- Text: `with no cross-database foreign key. Console resolves both sides through $876`
  Reason: Resolves through both `workspace` and `billing`, no single domain applies.

### `.claude/rules/customer-architecture.md`

**Changed:**

- Old: `@876/admin`
  New: `@876/platform`
- Old: `$876.users.identifications.*`
  New: `platform.users.identifications.*`
- Old: `@876/sdk`
  New: `@876/account`

### `.claude/rules/data-loading.md`

**Changed:**

- Old: `const result = await $876.customers.admin.list({ limit: 25 })` (x2)
  New: `const result = await billing.customers.list({ limit: 25 })`

**Unchanged:**

- Text: `layout containers. Live data includes HTTP service calls through $876, typed`
  Reason: Generic reference to the facade.

### `.claude/rules/feature-flags.md`

**Changed:**

- Old: `- **Apps evaluate** through \`$876.features.evaluate({ appId, userId })\` —`New:`- **Apps evaluate** through \`workspace.features.evaluate({ appId, userId })\` —`

### `.claude/rules/shared-product-ui.md`

**Changed:**

- Old: `transpilePackages: sharedTranspilePackages(['@876/sdk', '@876/core']),`
  New: `transpilePackages: sharedTranspilePackages(['@876/account', '@876/core']),`

**Unchanged:**

- Text: `- **data loading** — no $876, no service client, no fetch. Hosts load and`
  Reason: Generic reference.
- Text: `3. Load the data in the host, through its own $876 facade at its own access`
  Reason: Generic reference.

### `.claude/rules/storage-architecture.md`

**Unchanged:**

- Text: `columns with no cross-DB foreign key**, resolving details through $876.`
  Reason: Resolves through multiple domains, no single domain applies.

### `.claude/rules/new-app-guide.md`

**Changed:**

- Old: `@876/sdk`
  New: `@876/account`
- Old: `@876/admin`
  New: `@876/platform`

**Unchanged:**

- Text: `Initialize one client per app and export it as $876 from src/lib/876.ts,`
  Reason: Generic reference.
- Text: `then call $876.<resource>.<verb>() directly. Never a raw fetch to the API,`
  Reason: Generic reference.
- Text: `through a thin route handler that authorizes and then calls $876 — **no server`
  Reason: Generic reference.
- Text: `directly — it resolves user/org details through $876.`
  Reason: Implies multiple domains (`platform`, `workspace`), no single domain applies.
- Text: `| Client         | $876 in server components    | create876Client + credentials: 'include' | create876Client on native HTTP                |`
  Reason: Generic reference.

## Confirmation

Confirmed: `.claude/rules/<file>` and `.agents/rules/<file>` are identical for all ten files specified in the scope.
