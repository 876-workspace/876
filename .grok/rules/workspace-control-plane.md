# Workspace & Platform Control Planes

Read this before adding, moving, or wrapping organization provisioning, onboarding,
app assignment, module, organization-feature, platform-security, or operator
administration code.

## The three planes

876 has three deliberately separate developer surfaces. They solve different
problems and must not become aliases for one another.

| Plane                      | Root        | Purpose                                                                                   | Examples                                                                                                                          |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Resource/data plane        | `$876`      | Operate on actual platform and product resources                                          | `$876.invoices.create()`, `$876.customers.list()`, `$876.packages.create()`, `$876.files.retrieve()`                              |
| Organization control plane | `workspace` | Prepare, configure, govern, assign, connect, and repair an organization's 876 environment | `workspace.provisioning.runs.list()`, `workspace.modules.list()`, `workspace.apps.assign()`, backend `workspace.finance.ensure()` |
| 876 operator control plane | `platform`  | Configure or inspect 876-wide operator infrastructure                                     | `platform.apiKeys.create()`, `platform.authAttempts.list()`, `platform.devices.retrieve()`, `platform.appFeatures.list()`         |

The concise rule is:

> **`workspace` prepares what `$876` operates on. `platform` governs the 876
> platform itself.**

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

## `$876` stays flat for business resources

Do not move ordinary resource CRUD under `workspace` or `platform` merely because
a resource belongs to an organization or is physically stored in a shared
service.

Correct:

```ts
await $876.invoices.create(...)
await $876.customers.list(...)
await $876.payments.create(...)
await $876.packages.create(...)
await $876.files.retrieve(...)
```

Wrong:

```ts
await workspace.finance.invoices.create(...)
await workspace.customers.create(...)
await platform.users.create(...)
```

`$876` intentionally hides the physical service that owns a resource. For
example, Invoice can call `$876.invoices.create()` without knowing that the
canonical invoice lives in the shared finance data plane.

The strict public resource verb vocabulary from `sdk-conventions.md` still
applies to `$876`: `create`, `retrieve`, `list`, `search`, `update`, `delete`.

## `workspace` owns organization orchestration

Use `workspace` when the desired operation is about making an organization's
environment ready or changing how that environment is configured.

Current client-side Console control-plane families:

- `workspace.onboarding.*` — organization onboarding catalogs, answers, validation, submission.
- `workspace.apps.list()` / `.assign()` / `.unassign()` — member app assignment administration.
- `workspace.modules.*` — application modules that shape organization-available functionality.
- `workspace.features.*` — organization-level feature grants/overrides.
- `workspace.provisioning.*` — provisioning manifests, drafts, runs, notes, and reconciliation.

Current Core backend orchestration families:

- `workspace.setup()` — durable workspace bootstrap over roles, app entitlements, and registry synchronization, with the finance barrier optionally deferred.
- `workspace.apps.assign()` — member app assignment orchestration.
- `workspace.roles.link()` — membership-role wiring.
- `workspace.finance.ensure()` — the shared financial workspace readiness barrier. This is **not** an invoice/payment/customer CRUD method.

**Only add a facade method when a call site migrates onto it.** A wrapper with no
caller is a second permanent path to the same operation — the very thing the
composition rules below forbid. Org app entitlement administration, for example,
still lives at `$876.organizations.admin.subscriptions.*`; migrate those call
sites before adding a `workspace` alias for them.

Specialized verbs such as `ensure`, `assign`, `reconcile`, `archive`, `restore`,
and `publish` are allowed on the control planes because they describe workflow
intent, not generic resource CRUD. Do not leak those verbs back into `$876`
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

Do not put ordinary platform-owned resource data here just because Core owns it.
For example, users, organizations, sessions, apps, contacts, and audit-event
resource operations remain on `$876` where their canonical resource surface
already exists.

## Composition rules

- Console exports all three roots from `@/lib/876`: `$876`, `workspace`, and
  `platform`.
- Product applications continue to use their canonical `$876` resource facade.
  They only receive a workspace/platform control root when they genuinely need
  and are authorized for that control plane.
- Browser clients must never receive Console's privileged `workspace` or
  `platform` controls.
- Do not keep deprecated aliases such as `$876.provisioning` or `$876.apiKeys`
  after migrating a control family. Two permanent paths for the same operation
  defeat the boundary.
- A resource may still have an org-scoped `$876` representation while its
  administrative lifecycle lives under `workspace`. Example: session-tier
  `$876.appAssignments.list()` remains a resource read while privileged
  assignment administration lives under `workspace.apps`. Console's
  `$876.appAssignments` therefore carries **no** `.admin` projection.

## Backend implementation rule

Low-level implementation helpers may keep explicit names such as
`enqueueCustomerEnsureForOrganization`, `ensureOrgAppsFinanceReady`, or
`reconcileFinanceConnections` inside their owning subsystem. High-level
orchestration should prefer the workspace facade so call sites describe intent:

```ts
await workspace.setup(orgId, { sourceAppId, finance: 'defer' })
await workspace.finance.ensure({ organizationId: orgId })
await workspace.roles.link(membership)
await workspace.apps.assign({ organizationId: orgId, userId })
```

A facade method must not re-apply a default the helper underneath already owns
(`assignedBy ?? null`, for instance). Pass the caller's arguments through, so
each default has exactly one definition site.

The facade is not permission enforcement and is not a new bounded context. The
owning service, repository, provider, auth, idempotency, and transaction rules
remain authoritative underneath it.

## Placement checklist

Before adding a method, ask in order:

1. Is the caller operating on an actual business/platform resource? → `$876`.
2. Is the caller preparing or governing one organization's environment? → `workspace`.
3. Is the caller administering 876-wide operator infrastructure? → `platform`.
4. Is this merely an implementation detail of one of those operations? → keep it
   private in the owning service/module; do not add another facade method.

If a method seems to fit two roots, the abstraction is probably too broad. Keep
the resource operation on `$876` and move only its lifecycle/orchestration to
the appropriate control plane.
