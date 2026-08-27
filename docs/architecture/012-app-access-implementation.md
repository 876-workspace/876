# App access profiles — implementation and local adoption

This note accompanies [ADR-012](./012-app-access-profiles.md). It describes the branch implementation, the stable surfaces that application code should consume, and the local follow-through that requires a checked-out repository/runtime.

## Branch

`web-app-acceess-profile`

The branch is additive. It does not rename an existing table, column, route, operation ID, error code, or environment variable. It does not run a database migration.

## Implemented platform layer

### Database

Core now owns:

- `app_permissions` — an app's permanent `<module>.<action>` catalog;
- `app_roles` — platform templates and organization-specific app roles;
- extended `app_assignments` — app role, grants, denies, title, attributes, assignment/access/revocation lifecycle and soft-delete fields;
- `memberships.position`;
- invite-token references for future app/org role selection.

The additive migration is `apps/api/prisma/migrations/20260827000001_app_access_profiles/migration.sql`. Apply it through the repo's normal migration/deploy workflow after reviewing the generated Prisma client locally. Do not use `prisma migrate dev` against production.

### API

`apps/api/src/modules/app-access/` is the bounded module. It owns the new tables and exposes:

- platform-admin app permission catalog CRUD + sync;
- platform role-template CRUD;
- organization app-role CRUD;
- app membership profile CRUD;
- one profile row per entitled app for a member;
- per-app roster;
- acting-user `/members/me` effective permissions.

Effective permissions fail closed:

`(role.permissions ∪ grants − denies) ∩ live catalog`, after entitlement and assignment lifecycle checks.

Existing `/organizations/:org_id/app-assignments` routes keep `object: 'app_assignment'` and their existing operation IDs. `app_role` and `title` are additive.

### Core access package

Use `@876/core/access` inside product applications:

```ts
import {
  defineAppPermissionCatalog,
  groupByModule,
  hasPermission,
  resolveEffectivePermissions,
} from '@876/core/access'
```

The package is pure TypeScript: no Prisma, React, Next.js, or provider dependency.

### Seeds

Run the app-access seed after bootstrap:

```bash
pnpm --filter @876/api seed -- --only=bootstrap,appAccess
```

The seed registers catalogs/templates for:

- `876-couriers` — the current Couriers module/action catalog, including customer import/export and package export;
- `876-crm` — requests, customers, tasks, teams, categories, reports and settings;
- `876-billing` — billing operational modules;
- `876-invoice` — invoice operational modules.

`876-enterprise` is deliberately excluded. Couriers defaults to `staff`; CRM/Billing/Invoice default to `viewer`. Admin is never a default.

The seed only writes platform catalog/template rows. It does not overwrite organization-scoped roles.

## Entitlement → role materialization

`apps/api/src/services/app-access-provisioning.ts` is the shared idempotent hook:

```ts
await materializeEntitledAppRoles({
  organizationId,
  appIds,
})
```

Call it immediately after durable app entitlement creation in both places that grant app access:

1. organization provisioning, after `ensureOrgAppSubscriptions()` returns `appIds`;
2. an existing organization's explicit entitlement/subscription activation path, after the subscription is active/trialing.

The underlying `materializeRoleTemplatesForApp()` leaves an existing `(app, organization, key)` role untouched and ignores `876-enterprise`. The wrapper emits `provisioning.app_role_seeded` and `provisioning.app_role_skipped`.

This call-site wiring is intentionally isolated for local review because those provisioning paths are high-impact and should be typechecked/tested in the checked-out repo before being enabled.

## Client surfaces

### Console/internal (`@876/admin`)

```ts
$876.appPermissions.list(appId)
$876.appPermissions.sync(appId, permissions)
$876.appRoles.list(appId)
$876.orgAppRoles.list(orgId, appId)
$876.appMemberships.listForMember(orgId, membershipId)
$876.appMemberships.listForApp(orgId, appId)
$876.appMemberships.create(orgId, body)
$876.appMemberships.update(orgId, assignmentId, body)
$876.appMemberships.delete(orgId, assignmentId)
```

The unified control plane maps these as:

```ts
workspace.apps.permissions
workspace.apps.roles
workspace.apps.orgRoles
workspace.apps.memberships
```

They are not duplicated onto the flat consumer facade.

### Product/session (`@876/sdk`)

Only self-scoped access is exposed:

```ts
$876.appMemberships.me.retrieve({ organizationId, appId })
$876.appMemberships.list({ organizationId })
```

`list()` first reads the organization's entitlements, then calls `/members/me` for each entitled app. It never calls the organization-wide app-membership roster endpoint.

## Console UI mapping

When wiring the branch locally, use these stable data surfaces instead of querying core tables or product role tables directly.

| Console page | Read | Mutations |
| --- | --- | --- |
| `/apps/[slug]/permissions` | `appPermissions.list` | create/update/delete/sync |
| `/apps/[slug]/roles` | `appRoles.list` + permission catalog | role template CRUD |
| `/orgs/[slug]/apps` | `orgAppRoles.list`, `appMemberships.listForApp` | role CRUD, assign/change/revoke |
| `/orgs/[slug]/members` accordion | `appMemberships.listForMember` | assign/change role/overrides/revoke |
| member overview | existing org role + `memberships.update(position)` | role/position/status update |
| user detail apps panel | per-org `listForMember` | links to org member view |

Keep the existing Console route-handler pattern: browser → typed Console client → thin `app/api/...` handler → `workspace`/`$876`; no server actions and no service namespace in browser URLs.

## Enterprise mapping

Use the same organization-scoped resources under settings:

- `settings/apps` — entitlement list + assigned count + org app roles;
- `settings/apps/[appSlug]` — org app roles and app roster;
- `settings/members/[membershipId]` — org role/position plus `listForMember` accordion.

Read visibility is `apps:read`; mutation is `apps:assign`. Hide the navigation entry when neither permission is present.

## CRM reference adoption

CRM should stop treating its operational team-membership row as role truth. Keep that row only for CRM team/queue placement.

A CRM permission guard should cache on primitive keys and read:

```ts
const access = await $876.appMemberships.me.retrieve({
  organizationId,
  appId,
})

if (!access.data?.effective_permissions.includes(permission)) {
  // existing forbidden/not-found guard behavior
}
```

`settings/users` should use the core app-membership roster. `settings/roles` should use organization CRM roles. No CRM `users` or identity-role table is introduced.

## Couriers transition

Do not remove Couriers `Role`/`TeamMember` operational tables in this branch. The core seed is the canonical future permission catalog. Before deleting the legacy authorization source, add a local parity test comparing `apps/couriers/src/lib/permissions/catalog.ts` against `APP_ACCESS_SEED_DEFINITIONS['876-couriers']` and migrate guards to `$876.appMemberships.me.retrieve()`.

## Organization-scoped member search

The organization member list route now accepts `q` and performs server-side filtering with the existing result cap. Product-app “existing member” pickers must use that route. Console's global user search remains the deliberate platform-admin exception.

## Invite follow-through

The migration adds `invite_tokens.app_role_id` and `invite_tokens.org_role_id` additively. The local invite workflow should pass the selected app role through create/accept and, on acceptance, idempotently create membership then app membership. If the member already exists in the organization, only the app membership is added. Entitlement must be checked at invite-create time.

The invite workflow is not switched on merely by adding the columns; enable it only after the existing invite service tests pass with the new transaction.

## Local verification

Run these from the repository checkout after pulling the branch:

```bash
pnpm --filter @876/api db:validate
pnpm --filter @876/api generate
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test

pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test
pnpm --filter @876/client typecheck && pnpm --filter @876/client test
```

Then run the affected app checks as UI wiring is completed. No database connection or migration command was executed while preparing this branch through GitHub.

## Review notes

- App permission and app role rows intentionally reuse the existing `permission` (`per_`) and `role` (`rol_`) ID families; table/object discriminators provide semantic distinction without inventing another permanent ID contract.
- Existing roleless app assignments are not backfilled to an admin role. They fail closed until explicitly assigned an app role.
- Billing/Invoice seed actions use the new normalized `<module>.<action>` vocabulary rather than copying the legacy colon-based Billing permission strings; the old strings remain untouched for compatibility while the product migrates.
- Organization permissions (`apps:read`, `apps:assign`) and product permissions are separate planes and must never be unioned.
