# 013 — Console Access Control and the Platform RBAC Pattern

**Status:** Accepted

**Date:** 2026-08-29

## Context

Console is an operator-tier internal application. It already had persisted Console grants and roles plus route guards, but its navigation was not permission-filtered and its role editor maintained a separate permission vocabulary. That made permission drift possible and exposed navigation for capabilities an operator could not use.

The platform also needs a reusable access-control shape for CRM, Couriers, Billing, Invoice, and future product apps without pretending every app stores roles in the same place.

## Decision

876 standardizes the **policy representation and resolution**, while the access tier determines role storage.

All apps use the canonical `AppPermissionCatalog`, `resolveEffectivePermissions`, request-scoped `AccessContext`, declarative navigation registry, and the same three enforcement layers. Operator-tier Console keeps its roles and grants in Console's own database. Org-tier products keep organization-scoped app roles and assignments in the core app-access plane.

## Why Console is not organization-gated

A row in `console_members` is the grant to use Console. Efesto organization membership does not grant Console and is not a prerequisite for every Console operator.

That separation is intentional. External auditors, regulators, security reviewers, or contracted operators may need narrow and time-boxed Console access without becoming members of Efesto's enterprise workspace. Making organization membership the grant would widen access to unrelated organization capabilities and couple two lifecycles that must be revoked independently.

Conversely, Console is the most privileged surface and should not depend on an ordinary organization-membership record to create privilege. Organization membership may only participate as a subtractive verification for a grant that already exists.

## Affiliation model

A Console grant has one of three affiliations:

- `staff` — an Efesto employee. A configured staff-organization membership is verified as active at guard time.
- `contractor` — an ongoing non-employee engagement. Expiry and justification are required.
- `external` — an auditor, regulator, law-enforcement liaison, partner, or third-party reviewer. Expiry and justification are required.

Affiliation is an attribute of the Console grant, never the authorization gate by itself. The Console role still determines permissions.

`Position` and `Role` remain separate concepts. Position describes what the person does; Role is the authorization fact. Non-staff position may come from the grant's free-text `title`. Staff position should resolve from the employee profile when a batch-capable facade operation exists; it must not be invented or fetched N+1.

## Why employment verification fails open on infrastructure failure

The Console grant already establishes access. Staff employment verification can only subtract access; it cannot create or widen a grant. Therefore an explicit missing/inactive membership denies access, while a thrown or provider/infrastructure failure preserves the otherwise-valid grant for that request and is reported to observability.

This is not a general authorization fail-open policy. If a verification can add or widen privilege, it fails closed. Permission resolution and absence of the Console grant also fail closed.

## Permission, feature, and experiment

Permissions answer whether a subject may perform a capability. Feature flags answer whether 876 has rolled that capability out to the subject. When both exist, access is `permission AND feature`.

Experiments choose a variant of an already-available capability. They never decide whether the capability exists or whether the subject is authorized. For that reason `AccessContext` exposes experiment variants separately and `can()` never considers them.

## Three enforcement layers

Every gated capability is represented at three layers:

1. navigation visibility through `NavEntry.requires`;
2. a server route/page/layout guard using the same permission;
3. API authorization before a mutation reaches the owning service.

Navigation is UX only. The route and API checks are security boundaries. A registry-to-route binding test keeps the nav permission and destination guard from drifting apart.

## Navigation and RSC

Navigation definitions are plain data. Icon keys are strings and client components resolve them after the server has filtered the registry. This keeps the RSC payload serializable and avoids shipping privileged-but-hidden registry entries to a browser that should never receive them.

## Adopting this in a new app

1. **Declare the catalog.** Add the app's permission catalog to `packages/core/src/access/catalogs.ts` and register it under the real app slug. Persisted permission strings are stable identifiers.
2. **Choose the access tier.** Operator-tier role storage belongs to the operator surface; org-tier roles/assignments live in the platform app-access plane. Do not confuse storage location with catalog format.
3. **Build the request-scoped `AccessContext`.** Resolve the subject, intersect stored grants with the catalog, evaluate feature flags once, and keep experiment variants in their own slot.
4. **Declare navigation.** Use `defineNavigation` with plain string icon keys and `requires` clauses. Resolve it server-side before passing it into client shell components.
5. **Add the binding test.** Walk every permission-gated navigation entry and assert that its destination page or nearest gating layout checks the identical permission key.
6. **Add guard coverage.** Walk mutating route handlers and fail the suite when a POST/PATCH/PUT/DELETE handler lacks the app's authoritative permission guard, except for a small explicitly-commented allow-list.

## Consequences

Adding a new app becomes primarily declarative: catalog, role-storage tier, access-context composition, and navigation registry. Shared policy primitives stop each product from inventing a new authorization vocabulary or resolver.

Console can support external operators without manufacturing enterprise membership, while employee offboarding can still remove access on the next request through the subtractive staff check.

The pattern also makes permission/feature/experiment boundaries testable, which prevents a rollout or presentation system from silently becoming an authorization mechanism.
