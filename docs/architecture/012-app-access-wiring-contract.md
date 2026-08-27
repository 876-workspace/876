# App access wiring contract

This is the handoff contract for application/UI integration after the platform app-access primitives land.

The wiring agent should **not** create another identity, role, permission, app-membership, or entitlement model. It should call the functions and client resources below.

## Database ownership

Core owns the durable authorization records:

- `app_permissions`
- `app_roles`
- extended `app_assignments`
- `memberships.position`
- `invite_tokens.app_role_id`
- `invite_tokens.org_role_id`

The migration is:

`apps/api/prisma/migrations/20260827000001_app_access_profiles/migration.sql`

`invite_tokens.app_role_id` and `invite_tokens.org_role_id` are indexed foreign keys with `ON DELETE SET NULL`.

## App access API module

Bounded module:

`apps/api/src/modules/app-access/`

Do not query its tables from another module. Cross-module code uses its public `index.ts` exports.

### Public backend primitives

```ts
import {
  ensureAppMembershipForProvisioning,
  findOrgAppRoleForAccess,
  listAppPermissionKeysForProvisioning,
  materializeRoleTemplatesForApp,
  resolveEffectiveAppPermissions,
} from '@/modules/app-access'
```

### `ensureAppMembershipForProvisioning`

Use after a trusted lifecycle has already ensured the user is an active organization member.

```ts
await ensureAppMembershipForProvisioning({
  organizationId,
  userId,
  appId,
  appRoleId,
  actorUserId,
})
```

It is idempotent, reuses/reactivates the unique app-assignment row, validates entitlement and role ownership through the canonical app-access service, and never grants 876 Enterprise an app role.

### `materializeRoleTemplatesForApp`

Creates organization-scoped copies of the app's platform role templates. Existing `(app, organization, key)` rows are preserved.

For multiple entitled apps use:

```ts
import { materializeEntitledAppRoles } from '@/services/app-access-provisioning'

await materializeEntitledAppRoles({ organizationId, appIds })
```

The wrapper logs:

- `provisioning.app_role_seeded`
- `provisioning.app_role_skipped`

Wire it after durable entitlement activation. Do not duplicate template-copy logic in Billing, Console, Invoice, CRM, or Couriers.

## App permission and role provisioning manifests

Reusable manifest helpers live in:

`apps/api/src/services/app-role-provisioning-catalog.ts`

Available functions:

```ts
appRoleProvisioningDefinition(appSlug)
parseProvisioningPermissionList(value)
parseAppRoleProvisioningResources(appSlug, resources)
validateAppRoleProvisioningResources(appSlug, resources)
validateAppRoleProvisioningPermissions({ appId, appSlug, resources })
```

The wiring agent should merge `appRoleProvisioningDefinition()` into application provisioning catalog output and run both validators before publish.

Static validation already enforces:

- no app-role resource for `876-enterprise`;
- resource key `<app_slug>:<role_key>`;
- stable role key syntax;
- dotted `<module>.<action>` permission syntax;
- unique role keys;
- at least one role;
- exactly one default role.

DB-backed validation already ensures every role permission exists in the persisted app permission catalog.

## Invite primitives

Invite persistence/validation helpers live inside the organizations module because the existing invite lifecycle is owned there:

- `invite-app-access.schemas.ts`
- `invite-app-access.repository.ts`
- `invite-app-access.service.ts`

Use sibling imports from `organizations.service.ts` when wiring the existing create/accept flow. Do not export these helpers from `organizations/index.ts`; keeping them internal avoids an app-access ↔ organizations public-index cycle.

### Create-time wiring

After the existing invite row is created, call:

```ts
const selection = await setInviteAppAccessSelection({
  inviteId: invite.id,
  organizationId,
  sourceAppId: invite.sourceAppId,
  appRoleId: body.app_role_id,
  orgRoleId: body.org_role_id,
})
```

The helper:

- verifies invite organization ownership before mutation;
- binds the app role to the invite's stored source app;
- requires active/trialing app entitlement;
- verifies the app role belongs to the same app and organization;
- verifies the organization role belongs to the organization.

### Accept-time wiring

Before changing membership role/app access:

```ts
const selection = await resolveInviteAppAccessSelection(token)
```

This revalidates the persisted roles and current entitlement so deleted roles or lost entitlement fail closed.

Use `selection.orgRoleName` as the canonical local organization role name for the existing membership lifecycle.

After the canonical membership lifecycle has created/reactivated the member:

```ts
await applyInviteAppAccess({
  organizationId,
  userId,
  sourceAppId: selection.sourceAppId,
  appRoleId: selection.appRoleId,
})
```

`applyInviteAppAccess()` delegates to `ensureAppMembershipForProvisioning()` and is idempotent.

## Membership position

The canonical membership route already accepts `position`.

Backend wrappers:

```ts
import {
  createMembershipProfile,
  updateMembership,
} from '@/modules/memberships'
```

`createMembershipProfile()` runs the existing provider/org-role lifecycle first and then persists `memberships.position`.

`updateMembership()` is the exported profile wrapper and combines the existing lifecycle update with position persistence.

Do not write `memberships.position` directly from Console or Enterprise.

## App-role invariants

The API mutation surface enforces:

- system organization app roles are read-only;
- system platform templates cannot be deleted;
- platform system templates only allow presentation-field changes already permitted by the canonical service;
- a mutable current default cannot be unset without selecting another default;
- deleting the only/default-last role is rejected;
- selecting a new default clears the previous default transactionally;
- roles referenced by app assignments cannot be deleted;
- the last active `admin` assignment cannot be removed/demoted.

Error code for the default invariant:

`app-role/default-required`

## Product permission catalogs and templates

Idempotent platform seed:

```bash
pnpm --filter @876/api seed -- --only=appAccess
```

Seed definitions exist for:

- `876-couriers`
- `876-crm`
- `876-billing`
- `876-invoice`

There is intentionally no `876-enterprise` definition.

The Couriers permission catalog includes the current module CRUD keys plus customer import/export and package export.

## Internal/admin client

`@876/admin` exposes:

```ts
$876.appPermissions
$876.appRoles
$876.orgAppRoles
$876.appMemberships
```

Use:

```ts
$876.appPermissions.list(appId)
$876.appPermissions.create(appId, body)
$876.appPermissions.update(appId, permissionId, body)
$876.appPermissions.delete(appId, permissionId)
$876.appPermissions.sync(appId, permissions)

$876.appRoles.list(appId)
$876.appRoles.retrieve(appId, roleId)
$876.appRoles.create(appId, body)
$876.appRoles.update(appId, roleId, body)
$876.appRoles.delete(appId, roleId)

$876.orgAppRoles.list(orgId, appId)
$876.orgAppRoles.retrieve(orgId, appId, roleId)
$876.orgAppRoles.create(orgId, appId, body)
$876.orgAppRoles.update(orgId, appId, roleId, body)
$876.orgAppRoles.delete(orgId, appId, roleId)

$876.appMemberships.list(orgId, filters)
$876.appMemberships.retrieve(orgId, assignmentId)
$876.appMemberships.create(orgId, body)
$876.appMemberships.update(orgId, assignmentId, body)
$876.appMemberships.delete(orgId, assignmentId)
$876.appMemberships.listForMember(orgId, membershipId)
$876.appMemberships.listForApp(orgId, appId)
```

The unified workspace control plane exposes the same concepts under:

```ts
workspace.apps.permissions
workspace.apps.roles
workspace.apps.orgRoles
workspace.apps.memberships
```

## Product/session SDK

`@876/sdk` intentionally exposes only acting-user reads:

```ts
$876.appMemberships.me.retrieve({ organizationId, appId })
$876.appMemberships.list({ organizationId })
```

`list()` composes organization entitlements with one `/members/me` lookup per entitled app; it never uses the organization roster route.

## Product guard helper

Use the pure package rather than reimplementing permission math:

```ts
import {
  defineAppPermissionCatalog,
  groupByModule,
  hasPermission,
  resolveEffectivePermissions,
} from '@876/core/access'
```

The API's canonical effective resolver additionally gates on entitlement and assignment lifecycle before applying:

`(role permissions ∪ grants − denies) ∩ live permission catalog`.

Organization permissions are never merged into product permissions.

## Remaining work is wiring, not platform design

The next agent may wire these primitives into:

- organization provisioning and explicit entitlement activation;
- provisioning manifest catalog/publish;
- invite create/accept;
- Console and Enterprise pages;
- CRM and Couriers product guards/settings;
- app-specific UI/tests.

It should not add replacement tables or another permission resolver. If a call site seems to need direct access to `app_permissions`, `app_roles`, or rich `app_assignments`, add a bounded public app-access service function instead.
