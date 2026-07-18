# ADR-006: Separate application modules, rollout flags, and preferences

## Status

Accepted

## Context

The previous `plan_features` association used operational feature flags as the
commercial contents of a subscription plan. That made a temporary rollout or
kill-switch decision indistinguishable from an organization's durable right to
use a product capability. It also left no stable application-level concept for
capabilities such as Billing Payroll or Couriers Delivery.

The product vocabulary in other SaaS systems is not perfectly uniform. Stripe
calls monetizable abilities “features,” attaches them to products, and derives
active customer entitlements from subscriptions. Stripe recommends persisting
those entitlements internally for fast evaluation. LaunchDarkly separately
describes release, experiment, migration, operational, and entitlement flags.
Zoho Books calls areas such as projects and sales workflows “modules,” lets an
organization enable modules, and exposes module-specific preferences.

Sources:

- [Stripe Billing Entitlements](https://docs.stripe.com/billing/entitlements)
- [Stripe Billing resource model](https://docs.stripe.com/billing/billing-apis)
- [LaunchDarkly flag purposes](https://launchdarkly.com/docs/guides/flags/creating-flags)
- [LaunchDarkly flag prerequisites](https://launchdarkly.com/docs/home/flags/prereqs)
- [Zoho Books preferences and module enablement](https://www.zoho.com/in/books/help/settings/preferences.html)

## Decision

Use three explicit concepts:

1. An **application module** is a stable, sellable product capability. Modules
   belong to one product application and have immutable snake-case keys such as
   `sales`, `payroll`, or `delivery`.
2. A **plan-module grant** states which modules a subscription product includes.
   Active or trialing organization subscriptions produce effective module
   entitlements. Plans never grant raw feature flags.
3. A **feature flag** remains an operational control. A module may reference one
   same-application root flag as its rollout or kill switch. Child flags inherit
   the module's commercial access through that root, then apply their own flag
   decision. Turning a rollout flag on cannot create an entitlement.

Cut over without compatibility aliases: create `application_modules` and
`plan_modules`, seed the initial catalog and grants, and delete `plan_features`.
Startup only adds default plan grants when a registry module is first created;
afterward Console edits are authoritative and are not restored by a cold start.

Console owns module CRUD beneath each product application and plan composition
beneath each plan. The API and `@876/admin` expose the reusable typed contract;
the privileged editor remains Console-only rather than becoming a customer UI
package.

Application provisioning remains separate from module access. A module answers
“may this organization use the capability?” while a provisioning manifest
answers “which default records should a newly entitled organization receive?”
Courier receives a Delivery module now, but its provisioning catalog remains
empty until its data shape is known.

Billing receives an application default called `document_preference`, keyed by
document type. Invoice, quote, estimate, and credit-note defaults may each carry
their own customer note and terms and conditions. Subscription-generated
invoices inherit the invoice preference; subscriptions do not get a second
terms/notes source unless a later use case requires an explicit override.

## Initial catalog

| Application | Module        | Operational root flag   | Initial plan access |
| ----------- | ------------- | ----------------------- | ------------------- |
| Billing     | Sales         | `billing_sales`         | Internal            |
| Billing     | Subscriptions | `billing_subscriptions` | Internal            |
| Billing     | Purchases     | `billing_purchases`     | Internal            |
| Billing     | Banking       | `billing_banking`       | Internal            |
| Billing     | Documents     | `billing_documents`     | Internal            |
| Billing     | Payroll       | `billing_payroll`       | Internal            |
| Couriers    | Delivery      | None                    | Free, Pro           |

## Consequences

- Pricing changes no longer require changing operational flag ownership.
- A module is enabled only when the organization has an active plan grant and
  its optional rollout flag evaluates true.
- Module keys become durable application contracts and should be archived, not
  renamed or reused. Archiving revokes the module from every plan; reactivation
  requires an explicit new plan assignment.
- Registry defaults bootstrap new capabilities; Console controls subsequent
  plan composition dynamically.
- Schema-driven application defaults can grow independently of module count.
- A module with no flag is immediately available to entitled organizations. A
  linked flag adds operational safety but also creates another dependency to
  observe and audit.

## Rejected alternatives

### Keep plans attached directly to feature flags

Rejected because a rollout, experiment, or emergency flag lifecycle is not a
commercial contract. It also allows an operator to accidentally grant product
access by changing a flag.

### Treat every application domain object as a module

Rejected because invoices, credit notes, and preferences are data or settings,
not necessarily independently sellable capabilities. Modules should stay
coarse and stable; child feature flags and provisionable resource types provide
the finer structure.

### Put customer notes and terms in the shared finance defaults only

Rejected because those values describe document-specific behavior in Billing.
Shared finance owns cross-application currencies, tax, and payment semantics;
Billing owns the presentation defaults for its invoice-like documents.
