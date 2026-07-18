# ADR-008: Standardize provisioning ownership, Console navigation, and package boundaries

- Status: Accepted
- Date: 2026-07-15
- Extends: ADR-003 through ADR-007

## Context

The platform now has three setup concerns that are related but not interchangeable:

- onboarding collects facts supplied by an organization;
- entitlement activation grants durable access to product modules;
- provisioning materializes platform-owned defaults in shared and app-owned data
  planes.

Treating all three as feature flags, database-derived forms, or one generic settings
page would obscure ownership. It would also make Console dependent on live product
databases and allow storage changes to alter administrative forms accidentally.

The operational model must support arbitrary default row counts, immutable published
revisions, later applications, app-owned storage, tenant overrides, retries, and
reconciliation. The UI must make the shared financial plane visibly organization-wide
while retaining application-specific configuration under each product.

## Decision

### Vocabulary and lifecycle

Use the following terms consistently:

| Concept              | Answers                                          | Owner                                              | Change behavior                                |
| -------------------- | ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| Onboarding answer    | What is true about this organization?            | Organization, collected through a reviewed catalog | Draft, validate, submit, remediate             |
| Module entitlement   | What durable product capability may it use?      | Plan composition and active subscription           | Recomputed when commercial access changes      |
| Feature flag         | Should code execute for this context now?        | Product operations                                 | Rollout, experiment, migration, or kill switch |
| Preference           | How should this tenant's product behave?         | Tenant, within an app or the shared finance plane  | Editable after setup                           |
| Provisioning default | Which missing initial records should be created? | Published platform manifest                        | Prospective plus explicit reconciliation       |
| Provisioning run     | What recipe was attempted and what happened?     | Platform control plane                             | Immutable revision snapshot with retry state   |

A module may be protected by a rollout flag, but a flag never grants the module.
A preference may be initialized from a default, but later tenant edits remain the
authority. Onboarding answers are input facts and are never presented as defaults.

### Console information architecture

Console is the master administrative surface, with ownership reflected in navigation:

1. **Organizations → Onboarding** manages the global legal and operating questionnaire.
2. **Organizations → Provisioning defaults → Shared defaults** manages the shared
   financial manifest. Each resource is an accordion containing a table, Add action,
   and catalog-shaped editor. Row counts are constrained only where the resource is a
   genuine singleton.
3. **Organizations → Provisioning defaults → Run history** provides filters, exact
   manifest revisions, step status, reconciliation, and failed-run retry across apps.
4. **Applications → _app_ → Provisioning** manages only that application's manifest
   and links to filtered run history and the shared defaults.
5. **Applications → _app_ → Modules** and plan composition manage entitlements, not
   provisioning recipes.

Customer-facing applications may offer their own preference editors, but they do not
receive Console's privileged publish and reconciliation UI. No provisioning UI is
added to the consumer or Enterprise account applications until a product requirement
exists.

### Contracts and packages

- `@876/core` owns portable manifest version 1 contracts, catalog primitives, and the
  narrow platform client used by app materializers.
- `@876/admin` owns typed privileged CRUD, publication, run inspection, retry, and
  reconciliation methods used by Console server components.
- Console owns the schema-driven administrative renderer and its internal route
  handlers. It knows reviewed catalog shapes, never raw database schemas.
- Each SaaS app owns its manifest adapter, database migration, idempotent materializer,
  and customer preference UI.
- `@876/ui` continues to provide presentation primitives. Domain administration is
  moved there only if two real non-Console consumers need the same unprivileged UI.

The protocol has one supported `manifest_version`: `1`. Catalog and recipe evolution
uses independent monotonically increasing revisions, not parallel protocol versions.
There is no version-4 compatibility path.

### Desired-state execution

Publishing records desired state; it does not perform cross-database writes. A durable
run snapshots the exact published revisions, and each app moves its actual state toward
that snapshot. Reconciliation repeats the comparison safely. This follows the common
controller model in which a control loop observes desired and actual state and requests
the changes needed to converge them ([Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)).

Cross-service delivery uses the transactional outbox, which avoids a database/event
dual write but has at-least-once delivery and therefore requires idempotent consumers
([AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)).
Stable run/event identifiers make retries safe in the same way an idempotency key
prevents repeated create/update side effects ([Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)).

## Application preferences

Invoice, quote, estimate, and credit-note preferences are intentionally independent.
Each may have distinct customer notes and terms and conditions. A subscription produces
invoices, so its generated documents use the invoice preference; a duplicate
subscription notes/terms setting would introduce two competing authorities.

Courier has a Delivery module and an empty application manifest. This is deliberate:
the platform can publish Courier defaults later without inventing a data shape before
the product owns one.

## Onboarding data stewardship

The Jamaica catalog remains separate from provisioning and covers company identity,
registered office, directors, shareholders/beneficial owners, TRN/TCC/GCT, NIS, NHT,
HEART/NSTA, and repeatable locations. These fields reflect the Companies Office's
published company and Business Registration Form requirements
([COJ services](https://www.orcjamaica.com/Services.aspx)) and its current forms catalog
([COJ forms](https://www.orcjamaica.com/Forms.aspx)). Government forms remain the source
of truth; catalog revisions must be reviewed when those requirements change.

Sensitive identity data and documents require encrypted storage, explicit retention
and deletion rules, access audit logs, and field-level authorization before document
upload is introduced. Console's knowledge of a field shape does not imply broad access
to its value.

## Trade-offs

- A code-owned catalog creates a coordinated Console/API/app release when a new resource
  shape is introduced, but supplies reviewable labels, constraints, references,
  sensitivity, and materialization semantics that database inference cannot provide.
- A Console-only renderer leaves some product settings UI duplication, but avoids
  coupling customer bundles and authorization models to an internal admin workflow.
- Flexible manifests make adding rows and applications routine; genuinely new resource
  types still require code and an app materializer. This is a safety boundary, not an
  omission.
- `create_missing` preserves tenant overrides, but a changed platform default does not
  forcibly update existing organizations. A future mandatory policy migration needs a
  separate, explicitly destructive operation and audit trail.
- At-least-once execution is resilient but shifts responsibility to deterministic keys,
  deduplication, observable runs, and retry-safe transactions in every app.
- Exact step status currently follows one atomic app materialization result. Apps with
  long-running independent steps may add progress callbacks without changing manifest
  version 1.
- Country onboarding catalogs are accurate only as of their source review. Jurisdiction
  expansion and regulatory changes require legal/operations review and a new catalog
  revision.

## Rejected alternatives

### Infer Console forms from database tables

Rejected because persistence schemas expose internal fields and cannot express who owns
a value, whether it is sensitive, whether reconciliation may overwrite it, or how
cross-record references should be validated.

### Put shared finance provisioning under Billing

Rejected because the financial plane is organization-wide and can be used by multiple
products without a standalone Billing entitlement.

### Ship one shared domain UI for Console and every app

Rejected because only the contracts and presentation primitives are genuinely shared.
Console publishes platform defaults; product apps edit tenant preferences. Combining the
two would blur permissions and release ownership.

### Represent modules as feature flags

Rejected because commercial entitlements are durable product contracts, while feature
flags are operational controls whose lifecycle includes temporary rollouts and
emergency shutdowns.
