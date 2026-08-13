# Software Specification: Unified `$876` Facade — Namespace Invariants & Hardening

| Field            | Value                                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document ID**  | ADR-011 / SPEC-FACADE-INVARIANTS                                                                                                                                                                         |
| **Status**       | Accepted (invariants + hardening); namespace migration **Planned / phased**                                                                                                                              |
| **Audience**     | Platform engineers, product app authors, agents                                                                                                                                                          |
| **Primary code** | `packages/client`, `docs/platform-object-model.md`                                                                                                                                                       |
| **Related**      | PR #254 (unified facade), #255/#256 (missing-resource repairs), #257 (auth-tier repair), [platform-object-model](../platform-object-model.md), [sdk-conventions](../../.claude/rules/sdk-conventions.md) |

---

## 1. Executive summary

PR #254 unified every service client into one developer-facing surface,
`$876.<resource>.<verb>()`, so application authors describe business objects
rather than microservice topology. That direction is sound and is kept.

An adversarial architecture review of #254 (and its repair chain #255–#257)
found that the facade, being flat, can **hide real semantic collisions** at the
scale 876 is built for. This ADR records the invariants a unified facade must
hold, the concrete violations found, and the hardening landed now versus the
migration deferred to a dedicated change.

The governing invariant:

> **One canonical noun has one logical meaning on every app surface.** App
> context may _reduce_ the available operations or return an app-scoped
> _projection of the same entity_, but it must never switch the noun to a
> _different entity type_.

Three supporting invariants (each is elaborated in
`docs/platform-object-model.md` and enforced or recorded in
`packages/client/src/resource-manifest.ts`):

1. **Ownership, provenance, visibility, and entitlement are four separate
   axes.** Never let one field (e.g. `sourceAppId`) stand in for all four.
2. **Shared finance data is not universally-visible product data.** Billing may
   be the complete financial control plane while a product app receives only the
   projections it is entitled to.
3. **A finance workspace is infrastructure; Billing application access is an
   entitlement.** They are distinct lifecycles even when the same Billing
   service implements both.

## 2. Problem statement

| Problem                                                                                                                                              | Effect                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `$876.products` resolves to Core entitlement plans in Enterprise/Console but the Billing commercial catalog in Billing                               | Same noun, two different entities. `docs/platform-object-model.md` already declares `products` = Billing.              |
| Console `$876.subscriptions.admin` resolves to **Core** org→app subscriptions, under the noun the ontology reserves for Billing recurring agreements | Reintroduces the exact collision `$876.entitlements` was created to remove; also duplicates `$876.entitlements.admin`. |
| Resources omitted from the composed surface (#255 `auditEvents`/facade resources, #256 `oauthGrants`) were only caught by failing Cloudflare builds  | Surface completeness depended on a reviewer remembering every resource.                                                |
| Browser `create876Client({ app })` forwarded `app` into the SDK's `z.strictObject` options parser, which throws on unknown keys                      | `create876Client({ app })` failed at runtime — a latent bug behind an inert, misleading option.                        |
| `create876ServerClient` dispatch used a non-exhaustive `default` that cast to platform options                                                       | A future app id could silently fall through to the platform surface instead of failing.                                |

## 3. Decisions

### 3.1 Invariants are recorded in code, not just prose

`packages/client/src/resource-manifest.ts` is a **compile/test/documentation
invariant, not runtime routing.** It records, per canonical noun, the
authoritative service and a one-line meaning, plus a machine-readable
`KNOWN_COLLISIONS` list. `surface-contract.test.ts` asserts the manifest against
the real composed surfaces so that:

- a resource cannot be silently dropped from an app surface (the #255/#256
  failure mode), and
- the set of known collisions cannot silently _grow_.

The manifest deliberately does **not** replace the composers. Composition stays
direct and boring; the manifest is the invariant the composers are checked
against.

### 3.2 Hardening landed in this change (safe, verifiable in `packages/client`)

- **Browser `app` option** is stripped before the SDK sees it. The option
  remains on the type for parity with the server client, but is documented as
  telemetry-only and is never forwarded until it has a real consumer.
- **`create876ServerClient` dispatch is exhaustive.** Explicit `'876'` and
  `'enterprise'` cases plus an `assertNever(options: never)` default; adding a
  new app id without a composer is now a **compile error**, and a malformed
  no-`app` call throws instead of silently returning a platform client.
- **Surface-contract tests** lock per-app presence (the #255/#256 casualties)
  and absence (no cross-app leakage; browser never exposes server-only/admin
  resources).

### 3.3 `.admin` is a privilege tier, not a second resource

`.admin` exposes privileged operations on the **same** logical resource under a
stronger principal — it never creates a second entity (`users.admin.purge()` is
a privileged hard-delete on `users`, distinct from `users.delete()`'s
soft-delete). There are no "admin products" as a separate entity; there are
`products` and admin-tier operations on them. Do not model audit events (or any
resource) by swapping the whole root between privilege tiers — nest the
privileged operations under `.admin`.

### 3.4 Namespace migration — PLANNED, phased, not in this change

The `products` / `subscriptions` collisions require renaming the **Core
entitlement-plan catalog** off the Billing-reserved nouns:

- Expose the Core app-plan catalog as **`$876.entitlementPlans`** (with
  `.admin`); keep `$876.products` exclusively the Billing commercial catalog.
- Route Console's org→app subscription administration through
  **`$876.entitlements.admin`** only; remove `$876.subscriptions.admin` as an
  alias for Core subscriptions.

This is deferred because its blast radius spans multiple Next apps
(Console ~13 call sites for `$876.products.admin`, Enterprise `client.products`,
plus browser typed clients and route handlers) and needs a full multi-app
typecheck/Cloudflare-build verification and product sign-off — exactly the class
of change this repo's process wants isolated and reviewed on its own. Until it
lands, the collisions are **recorded** in `KNOWN_COLLISIONS` so the debt is
visible in code and CI, and the surface-contract test prevents the collision set
from growing.

## 4. Out of scope (tracked, not decided here)

The review raised further architecture items that require product decisions or
end-to-end verification and are intentionally **not** actioned in this hardening
change:

- **Canonical `$876.items`** + explicit item **app-visibility bindings**
  (`sourceAppId` is provenance, not visibility) before Events/Commerce exist.
- **Customer app-profile projection** so a Billing-only customer does not appear
  in Couriers without a courier profile.
- **Delegated-auth freshness** (the #257 root cause: a valid sealed session can
  carry an expired downstream bearer) — solve via server-side token
  exchange/BFF assertion rather than widening admin-client fallbacks.
- **Three Billing relationships** kept as distinct lifecycles: Efesto billing an
  org (platform tenant), the org's own finance workspace, and Billing app
  entitlement. Verify the default `876-billing` provisioning entitlement's
  intent before changing it.
- **Verify the customer-ensure outbox wiring** survives the TypeScript
  provisioning port end-to-end.
- **Typed per-app service constructors** to replace the `unknown`/`never` casts
  in `createServiceClients()`.

These remain open for follow-up ADRs/PRs.
