# App Access Rules

Read this before adding or changing product-app permissions, app roles, organization app membership, app-assignment profiles, product member search, or product-app authorization guards.

## Fixed model

876 has one account identity. Core owns the account, organization membership, organization role, app entitlement, app permission catalog, app role, app assignment/profile, and effective app permissions.

```text
users
└── memberships
    ├── organization_roles      governs 876 Enterprise
    ├── position
    ├── employee_profiles
    └── app_assignments         one profile per organization member + app
        ├── app_roles
        ├── permission_grants / permission_denies
        └── app-scoped attributes and lifecycle
```

Product apps keep only operational records keyed by opaque core IDs. They do not duplicate identity or authorization truth.

## Vocabulary

- **App permission**: one `<module>.<action>` capability declared by a product and registered in core (`app_permissions`).
- **App role**: a named permission bundle for one app (`app_roles`).
- **Role template**: an app role whose `organization_id` is null; provisioning copies it into an organization.
- **App membership profile**: the extended `app_assignments` row for one member and app.
- **Effective permissions**: role permissions plus grants, minus denies, intersected with the live app catalog.
- **Entitlement**: the organization's upstream subscription allowing the app to be opened.
- **Position**: the membership's free-text job position.

Never call an app role a feature. Never call an app permission a feature flag. Never call an entitlement a role.

## Ownership and planes

- Core identity API owns app access data and effective-permission resolution.
- The app declares its permission catalog; core persists it.
- `workspace.apps` owns privileged organization governance for app permission catalogs, role templates, org app roles, and app memberships.
- A session-tier self read may remain `workspace.appMemberships.me.retrieve()`.
- 876 Enterprise itself is not app-role gated. Its existing organization-role permission plane governs the Enterprise surface.
- Organization permissions and app permissions are separate planes. `apps:assign` never grants an in-app permission.

## Effective permissions

Resolve in this order and fail closed:

1. active/trialing entitlement;
2. active, live, non-revoked assignment;
3. role permissions or `[]` if no role;
4. union grants;
5. remove denies (denies win);
6. intersect with the app's registered permission keys;
7. sort and deduplicate.

Resolution must never throw because of malformed or stale stored permission data.

## Authorization

- Platform permission catalogs and role templates use the admin security tier.
- Organization app-access reads require active org membership, or an internal principal.
- Organization app-access writes require `apps:assign`, or an internal principal.
- `roles:manage` is not sufficient for app-role writes.
- `/members/me` always resolves the acting user from the authenticated principal and never accepts `user_id`.
- A product app guard reads effective permissions for the acting member and checks a concrete app permission key.

## System-role rules

- System role permission sets, keys, and `is_system` are immutable through every API path.
- A platform system template may update only `name`, `description`, or `position`.
- An organization copy of a system role is fully read-only.
- Role permissions must be a subset of the app catalog.
- Exactly one default role exists per app/scope; changing the default clears the old one atomically.
- A referenced role cannot be deleted.

## Member discovery and invites

- Product apps and Enterprise search existing users only inside the organization membership roster.
- Console is the deliberate platform-admin exception and may use global user search.
- Product invites may carry an app and app role. Acceptance creates/reuses account → organization membership → app assignment idempotently.
- Existing organization members receive only the missing app assignment and are never given a downgraded organization role.
- Validate the organization's app entitlement when the invite is created, not only when it is accepted.

## Do not

- Do not add a product-local `users` table.
- Do not make a product-local role or permission table the source of authorization truth.
- Do not create app roles for `876-enterprise`.
- Do not replace or rename `app_assignments`; extend it additively.
- Do not rename existing database tables, columns, routes, operation IDs, environment variables, or error codes.
- Do not merge organization-role permissions into app permissions.
- Do not treat a missing app role as full access.
- Do not let a removed catalog key survive in effective permissions.
- Do not delete a role that is in use.
- Do not allow organization copies of system roles to be edited.
- Do not filter the global user directory in a product UI to simulate org-scoped search; query the organization member endpoint.
- Do not add a Next.js `proxy.ts` or `middleware.ts` for this feature.
- Do not add Server Actions; browser mutations use thin authorized route handlers and typed clients.
- Do not put admin-tier endpoints into `@876/account`; they belong in `@876/platform` and the appropriate control-plane composer.
- Do not expose Console's privileged workspace controls to browser/consumer surfaces.
- Do not introduce `eslint-disable` comments or `as any` casts to satisfy a gate.
- Do not run database migrations against a live database while implementing schema changes; write additive migration SQL for CI/deployment.

See `docs/architecture/012-app-access-profiles.md` for the complete design and adoption sequence.
