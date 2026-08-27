# 012 — App access profiles

## Status

Accepted. This record defines the platform-wide app-access model for 876.

## Context

876 has one account identity across every surface. Organization membership already answers whether an account belongs to an organization and which organization role governs the 876 Enterprise workspace. Product-app access, however, has historically stopped at `app_assignments`: the row says a member may open an app, while product applications have separately invented their own role and permission models.

That split prevents Console and 876 Enterprise from administering app access consistently and makes role vocabulary drift between products.

## Layering

```text
Account (`users`)
└── Membership (`memberships`)                     account ↔ organization
    ├── organization role (`organization_roles`)   governs 876 Enterprise
    ├── position                                   free-text job position
    ├── Employee profile (`employee_profiles`)     ERM record
    └── App membership profile (`app_assignments`) one per membership + app
        ├── app role (`app_roles`)
        ├── permission grants / denies
        ├── app-scoped attributes
        └── status, title, assignment/access/revocation lifecycle
```

Organization entitlements remain upstream of this entire stack. A subscription determines whether the organization may use an app. An app assignment never grants an entitlement.

876 Enterprise is deliberately excluded from app-role gating. Every enterprise account can open 876 Enterprise by virtue of organization membership; its organization role controls what it may do there.

## Decisions

1. **Core owns identity and app authorization.** Product applications do not own user identities, app roles, app permissions, or effective permission calculation. Product databases retain only operational records keyed by opaque core IDs.
2. **Apps declare; core registers.** Each product declares its permission catalog, while core persists the catalog in `app_permissions`. Console and Enterprise can therefore render app-role administration without knowing a product's internal domain model.
3. **`app_assignments` is extended in place.** The existing physical table, uniqueness constraint, route family, operation IDs, and `object: 'app_assignment'` discriminator remain stable. New profile behavior is additive. New app-membership routes expose the richer `object: 'app_membership'` representation.

## Vocabulary

| Term | Meaning | Table |
| --- | --- | --- |
| **App permission** | One `<module>.<action>` capability declared by an app. | `app_permissions` |
| **App role** | A named permission bundle for one app. System roles are platform-managed. | `app_roles` |
| **Role template** | An `app_roles` row with `organization_id = NULL`; copied into organizations when the app is provisioned. | `app_roles` |
| **App membership profile** | A member's per-app role, overrides, attributes, status, and lifecycle. | `app_assignments` |
| **Effective permissions** | Role permissions plus grants, minus denies, intersected with the current app catalog. | computed |
| **Entitlement** | Whether an organization may open an app at all. | `subscriptions` |
| **Position** | A member's free-text job position in the organization. | `memberships.position` |

An app role is never called a feature. An app permission is never called a feature flag. An entitlement is never called a role.

## Permission-key contract

Permission keys are permanent identifiers matching:

```text
^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$
```

The left side is the app module key and the right side is the action. Human labels may change; keys do not.

## Effective-permission resolution

Resolution is fail-closed and never throws:

1. **Entitlement.** The organization must have an `active` or `trialing` subscription for the app. Otherwise return `entitled: false`, `assigned: false`, and no permissions.
2. **Assignment lifecycle.** The assignment must have `status === 'active'`, `deleted_at IS NULL`, and `revoked_at IS NULL`. Otherwise return no permissions and `assigned: false`.
3. **Role base.** Start with `app_role.permissions`. A missing role contributes no permissions; it never means all permissions.
4. **Grants.** Union `permission_grants` into the base set.
5. **Denies.** Remove `permission_denies`. Denies always win, including when the same key is also granted.
6. **Catalog intersection.** Keep only keys that are still present in the app's declared `app_permissions`. Removed or stale keys silently disappear.
7. **Plane separation.** Organization permissions such as `apps:assign` do not become product-app permissions and are never merged into the result.

The result is sorted and deduplicated:

```ts
{
  entitled: boolean
  assigned: boolean
  role: AppRole | null
  permissions: string[]
}
```

Malformed stored arrays, missing role data, and stale keys degrade to the safe empty/subset value rather than raising an authorization-time exception.

## Guard precedence

Authorization is evaluated in this order:

1. **Transport credential tier** — route security first (`admin` or `session`).
2. **Organization membership** — session-tier reads require an active membership, unless the principal is internal.
3. **Organization permission** — session-tier writes require `apps:assign`, unless the principal is internal. `roles:manage` does not authorize app-role administration.
4. **Organization entitlement** — assigning a member to a product requires an active/trialing app entitlement.
5. **Target membership** — the target account must already be an active organization member.
6. **App assignability** — `876-enterprise` cannot receive an app role or app membership profile.
7. **App-role ownership/lifecycle** — a selected role must belong to the same app and organization and must be live.
8. **In-app authorization** — product routes use the acting member's computed effective app permissions.

No later check widens access denied by an earlier check.

## Role invariants

- A platform role template has `organization_id = NULL`.
- A role copied into an organization records its source template in `template_key`.
- System templates may change only `name`, `description`, and `position`; their `key`, `permissions`, and `is_system` fields are immutable.
- Organization copies of system roles are read-only end to end.
- An app/organization scope has exactly one default role. Selecting a new default clears the former default in the same transaction.
- Role permissions must be a subset of that app's registered permission catalog.
- A role referenced by an app assignment cannot be deleted.
- App-role deletion is soft deletion.

## Provisioning

Role templates are part of the provisioning manifest as `resourceType: 'app_role'`. The property store has no array primitive, so role permissions are serialized as a comma-separated string at the provisioning boundary and converted back to a normalized string array before validation or persistence.

When an organization gains an app entitlement, core materializes every live template for that app into organization-scoped `app_roles` rows. Materialization is idempotent: an existing `(app_id, organization_id, key)` row is never overwritten, because the organization may have customized the mutable presentation fields.

## Compatibility

The existing `/organizations/:org_id/app-assignments` endpoints remain byte-compatible in route path, operation ID, object discriminator, and pre-existing fields. `app_role` and `title` are additive nullable fields. Legacy roleless assignments remain valid data; the effective-permission resolver deliberately treats them as assigned with no permissions until a role is selected through the app-membership control surface.

The new `/organizations/:org_id/app-memberships` family is the canonical rich profile surface and uses `object: 'app_membership'`.

## How a new app adopts app access in six steps

1. **Declare modules and permission keys.** Define the app's stable module/action catalog with `defineAppPermissionCatalog` from `@876/core/access`.
2. **Register the catalog.** Seed or call the platform-admin permission sync endpoint so the declaration is persisted in core.
3. **Define role templates.** Add least-privileged default plus any platform-managed roles to the provisioning manifest; never define app roles for `876-enterprise`.
4. **Provision the app entitlement.** Entitlement creation materializes the app's role templates into the organization idempotently.
5. **Assign members.** Use the organization app-membership surface to select an organization-scoped app role and optional grants, denies, title, and attributes.
6. **Guard product operations.** Read the acting member's `/members/me` app-membership profile once per request, cache it on primitive keys, and call `hasPermission` against its effective permission set. Keep operational team/mailbox/profile rows keyed only by opaque core IDs.

## Clarifications chosen where existing code left room

- `active` and `trialing` are the entitlement states treated as entitled by app access; all other subscription states fail closed.
- Existing roleless `app_assignments` are preserved rather than rewritten by the migration. This avoids a hidden authorization grant during an additive schema change.
- Permission-catalog deletion is rejected while any live role still references the key. Catalog `sync` therefore cannot silently invalidate a role definition; stale keys can only appear from historical or out-of-band data, and the resolver still filters them defensively.
- App membership `DELETE` is a revocation plus soft-delete marker and returns an app-membership tombstone. Reassignment reactivates the existing unique row rather than inserting a duplicate.
