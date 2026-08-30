# Workspace & Platform Control Planes

Read this before adding, moving, or wrapping organization provisioning, onboarding,
app assignment, module, organization-feature, platform-security, or operator
administration code.

## The three planes

876 has three deliberately separate developer surfaces. They solve different
problems and must not become aliases for one another.

| Plane                      | Root                               | Purpose                                                                                   | Examples                                                                                                                  |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Account and product data   | `$876` plus explicit product roots | Account/identity through `$876`; product resources through their owning bounded root      | `$876.users.me.retrieve()`, `crm.requests.list()`, `billing.invoices.create()`, `storage.files.retrieve()`                |
| Organization control plane | `workspace`                        | Prepare, configure, govern, assign, connect, and repair an organization's 876 environment | `workspace.provisioning.runs.list()`, `workspace.modules.list()`, `workspace.appAssignments.create()`                     |
| 876 operator control plane | `platform`                         | Configure or inspect 876-wide operator infrastructure                                     | `platform.apiKeys.create()`, `platform.authAttempts.list()`, `platform.devices.retrieve()`, `platform.appFeatures.list()` |

The concise rule is:

> **`workspace` governs an organization's 876 environment. `platform` governs
> 876 itself. Account and product clients operate on their own resources.**

## 876 Workspace mental model

An organization has one 876 Workspace. Product apps are enabled inside that
workspace and share platform capabilities according to their entitlements and
connections.

```text
876 Workspace
└── Organization
    ├── members / roles
    ├── enabled apps
    ├── modules / org-controlled configuration
    ├── shared customer relationship registry
    ├── finance capability
    └── product apps
        ├── 876 Billing
        ├── 876 Invoice
        ├── 876 Couriers
        └── 876 CRM
```

The workspace concept does **not** imply one database. Existing bounded-context
rules remain: Core, Finance/Billing, Couriers, CRM, Storage, Widgets, and future
services keep their own ownership boundaries and reference one another by opaque
IDs.

## Account and product resources stay in their bounded clients

Do not move ordinary resource CRUD under `workspace` or `platform` merely
because a resource belongs to an organization. `$876` is the 876 Account root,
not the general resource/data plane. Product resources live under explicit
product roots.

Correct:

```ts
await $876.users.me.retrieve(...)
await crm.requests.list(...)
await billing.invoices.create(...)
await couriers.packages.create(...)
await storage.files.retrieve(...)
```

Wrong:

```ts
await $876.crm.requests.list(...)
await workspace.finance.invoices.create(...)
await platform.requests.list(...)
```

The package/root name makes ownership visible without exposing deployment
topology to the browser. `workspace` and `platform` are projections of the same
Core API; product roots remain independently owned bounded contexts.

The strict public resource verb vocabulary from `sdk-conventions.md` still
applies to all roots: `create`, `retrieve`, `list`, `search`, `update`,
`delete`.

## `workspace` owns organization orchestration

Use `workspace` when the desired operation is about making an organization's
environment ready or changing how that environment is configured.

The operator projection currently exposes:

- organization records and directory resources: `organizations`,
  `memberships`, `locations`, `contacts`, `departments`, `employees`, `members`,
  and `invites`;
- organization access and assignment resources: `permissions`, `roles`,
  `appAssignments`, `appPermissions`, `appRoles`, `orgAppRoles`, and
  `appMemberships`;
- organization configuration resources: `apps` (including `features` and
  `entitlements`), `features`, `organizationFeatures`, `onboarding`,
  `provisioning`, `modules`, `addresses`, and `billingAccounts`.

The session projection is deliberately narrower and exposes only the
organization resources supported for a signed-in member. Select the projection
through `@876/workspace/session` or `@876/workspace/operator`; do not place
authority under a resource-level `.admin` segment.

**Only add a control-plane method when a call site migrates onto it.** A wrapper
with no caller is a second permanent path to the same operation. Do not also
expose the family through Account, Platform, or a product client.

Specialized verbs such as `ensure`, `assign`, `reconcile`, `archive`, `restore`,
and `publish` are allowed on the control planes because they describe workflow
intent, not generic resource CRUD. Do not leak them into Account or product
resource modules.

## `platform` owns 876-operator controls

Use `platform` for controls whose subject is the 876 platform itself rather than
a customer's organization workspace.

Current Console families:

- `platform.apiKeys.*`
- `platform.authAttempts.*`
- `platform.devices.*`
- `platform.appFeatures.*`
- `platform.reservedUsernames.*`

Do not put organization-workspace operations here merely because Core owns
them. Memberships, roles, members, assignments, entitlements, and provisioning
belong to `workspace`; cross-organization user and organization administration,
API keys, auth attempts, devices, and other genuinely platform-wide operations
belong to `platform`. Account-owned current-user operations stay on `$876`.

## Composition rules

- Console defines eight explicit operator roots under `src/lib/services/`:
  `billing`, `couriers`, `crm`, `platform`, `storage`, `widgets`, `work`, and
  `workspace`. It does not compose an Account or ecosystem facade.
- Product applications import only the Account, Workspace, Platform, and
  product roots they genuinely need, at the caller-specific entrypoint.
- Browser clients must never receive Console's privileged `workspace` or
  `platform` controls.
- Do not keep deprecated Account aliases for Workspace or Platform families.
  Two permanent paths for the same operation defeat the boundary.
- A product resource may still have an organization-scoped representation while
  its administrative lifecycle lives under `workspace`; that does not make the
  resource part of Workspace.

## Backend implementation rule

Low-level implementation helpers may keep explicit names such as
`enqueueCustomerEnsureForOrganization`, `ensureOrgAppsFinanceReady`, or
`reconcileFinanceConnections` inside their owning subsystem. Public
organization operations should use the Workspace client so call sites describe
intent:

```ts
await workspace.appAssignments.create(orgId, params)
await workspace.provisioning.runs.list({ organizationId: orgId })
await workspace.roles.update(orgId, roleId, params)
```

A control-plane method must not re-apply a default the helper underneath already owns
(`assignedBy ?? null`, for instance). Pass the caller's arguments through, so
each default has exactly one definition site.

The client is not permission enforcement and is not a new backend bounded context. The
owning service, repository, provider, auth, idempotency, and transaction rules
remain authoritative underneath it.

## Placement checklist

Before adding a method, ask in order:

1. Is this an Account/current-user concern? → `$876`.
2. Is this an ordinary product resource? → that product's explicit root.
3. Is the caller preparing or governing one organization's environment? → `workspace`.
4. Is the caller administering 876-wide operator infrastructure? → `platform`.
5. Is this merely an implementation detail of one of those operations? → keep it
   private in the owning service/module; do not add another client method.

If a method seems to fit two roots, the abstraction is probably too broad. Keep
the resource operation on its Account or product root and move only its
lifecycle/orchestration to the appropriate control plane.

## Do not

- Do not put product resources under `$876`, `workspace`, or `platform`.
- Do not add a replacement aggregator for the explicit roots.
- Do not use an `operator` entrypoint for a signed-in organization's session.
- Do not create duplicate control-plane aliases in another client.
