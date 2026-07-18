# Standard SaaS Onboarding (SSO)

SSO is the catalog-driven, three-phase onboarding every 876 product app uses to
collect organization facts and activate an app workspace. It is distinct from
tenant provisioning (system-owned day-zero defaults; see
[tenant-provisioning.md](tenant-provisioning.md)), commercial entitlement
(plans/subscriptions), and feature delivery (PostHog flags).

Couriers is the reference implementation. Console still uses the heavier
`organization/global` catalog for administrative KYB; that path is product-gated
and is **not** part of the customer wizard.

## Purpose and shape

Customers see one wizard with a plain progress stepper:

| Phase | Customer copy       | Internal target(s)                             |
| ----- | ------------------- | ---------------------------------------------- |
| 1     | About your business | `organization` / `core`                        |
| 2     | Set up \<Product\>  | `application` / app slug (e.g. `876-couriers`) |
| 3     | Invite your team    | org invite tokens (skippable)                  |

The ecosystem-vs-app split is modeled only by onboarding **targets**. Copy never
says "organization session" or "application session"; the stepper is product
language only.

Answers stay in the identity API. App-local materialization (tenant row, mailbox
prefix, etc.) runs in the product app after sessions submit, keyed by opaque
organization id.

## Onboarding entry & organization creation

Couriers has two organization-entry paths:

- Business form sign-up at `/register` uses `@876/ui/auth` in single-form
  business mode. Registration creates the organization and active owner
  membership before the user reaches onboarding, so Phase 1 starts with the
  organization already resolved.
- Social sign-in users can arrive with no organization. When the signed-in user
  has zero memberships, Phase 1 shows a **Company name** field and calls
  `POST /api/manage/onboarding/organization`. The handler calls
  `platform.orgs.create`, which uses `POST /organizations/bootstrap`, then saves
  the Phase 1 organization answers.

Organization creation has a double-org guard: the handler first loads all of
the user's memberships without a status filter and refuses creation when any
membership exists in any status. A missing manage context is not proof that the
user needs an organization because pending memberships and platform lookup
errors can also produce that state.

## Engine (identity API)

### Models

`apps/api/db/models/onboarding.py`:

| Model               | Table                 | Role                                                                 |
| ------------------- | --------------------- | -------------------------------------------------------------------- |
| `OnboardingSession` | `onboarding_sessions` | One durable answer set per org + target + country + catalog revision |
| `OnboardingAnswer`  | `onboarding_answers`  | Catalog-keyed JSON values (`session_id`, `field_key`, unique pair)   |

Session fields that matter at the contract edge:

| Field              | Notes                                                           |
| ------------------ | --------------------------------------------------------------- |
| `target_type`      | `organization` \| `application`                                 |
| `target_key`       | `global` / `core` for org targets; app **slug** for application |
| `country_code`     | ISO-2 (wizard path uses `JM`)                                   |
| `schema_version`   | Fixed at `1`                                                    |
| `catalog_revision` | Content version (independent of schema version)                 |
| `status`           | Lifecycle below                                                 |

### Status lifecycle

```
draft ──submit──→ submitted
  │                   │
  │  (edit answers)   │  (edit answers after submit)
  └───────────────────┴──→ needs_update ──submit──→ submitted
```

`completed` exists on the model for later orchestration states; the customer
wizard path only needs draft → submitted, with `needs_update` when a previously
submitted session's answers are replaced
(`apps/api/db/repositories/onboarding.py`).

### Catalog definitions

Code-owned catalogs live in `apps/api/services/onboarding_catalog.py`. The DB
stores validated answers only; it is not introspected to invent forms.

| Target         | Key      | Contents                                                                           | Wizard?                      |
| -------------- | -------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `organization` | `global` | Heavy JM KYB (legal identity, registrations, office, directors, locations, survey) | No — Console / product-gated |
| `organization` | `core`   | Light: `business_category` (select, required) + `employee_count_range`             | Phase 1                      |
| `application`  | app slug | Per-app sections from `APPLICATION_CATALOGS`                                       | Phase 2                      |

`APPLICATION_CATALOGS` is a registry keyed by app slug. Today:

| App slug       | Section key | Fields                                                                                       |
| -------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `876-couriers` | `workspace` | `platform_name` (required string), `mailbox_prefix` (optional, pattern `^[A-Za-z0-9]{1,6}$`) |

### HTTP surface

All routes are under `/onboarding` in
`apps/api/domains/onboarding/router.py`. Every handler takes `AdminDep` (plus
the top-level API key on the protected router).

| Method | Path                                                                   | Purpose                                               |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `GET`  | `/onboarding/catalog/{target_type}/{target_key}`                       | Retrieve catalog (`country_code` query, default `JM`) |
| `GET`  | `/onboarding/organizations/{org_id}/{target_type}/{target_key}`        | Retrieve or create session                            |
| `PUT`  | `/onboarding/organizations/{org_id}/{target_type}/{target_key}`        | Replace answers atomically                            |
| `POST` | `/onboarding/catalog/{target_type}/{target_key}/validate`              | Validate without saving                               |
| `POST` | `/onboarding/organizations/{org_id}/{target_type}/{target_key}/submit` | Validate stored answers and mark submitted            |

`_require_targets` resolves:

- organization targets: only `global` and `core`;
- application targets: `target_key` must match an existing `App.slug`.

Submit validates the **stored** answer set against the session's catalog
revision. Save-before-submit is required (`onboarding/session-not-found` if
nothing has been saved).

## Client tiers

| Consumer     | Package / client                                 | Credential                     | Surface                                                                                                 |
| ------------ | ------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Console      | `@876/admin` → `$876.onboarding.*`               | `x-internal-key` + app key     | Full onboarding resource (`packages/admin/src/resources/onboarding.ts`); used for `organization/global` |
| Product apps | `@876/core/platform` → `create876PlatformClient` | `x-internal-key` + app API key | Narrow bootstrap only (`packages/core/src/platform/index.ts`)                                           |

Platform client onboarding methods:

```txt
platform.onboarding.retrieveCatalog(targetType, targetKey, countryCode?)
platform.onboarding.retrieve(orgId, targetType, targetKey, countryCode?)
platform.onboarding.replaceAnswers(orgId, targetType, targetKey, { countryCode, answers })
platform.onboarding.validate(targetType, targetKey, { countryCode, answers })
platform.onboarding.submit(orgId, targetType, targetKey, countryCode?)
```

Related bootstrap used by the invite step:

```txt
platform.orgs.invites.create(orgId, { email, role?, sourceAppSlug? })
platform.orgs.invites.list(...)
```

The platform client is **server-only** (`import 'server-only'`). Product apps call
it only from route handlers (or RSC) **after** session authorization. Couriers
wraps it in `apps/couriers/src/lib/876/platform-client.ts`.

`@876/sdk` does not expose onboarding. Browser code never holds the internal key.

## Shared wizard UI

`@876/ui/onboarding` (`packages/ui/src/onboarding/`) is presentation-only — the
same contract as `@876/ui/auth`. Host apps own state, transport, and copy.

| Export               | File               | Role                                       |
| -------------------- | ------------------ | ------------------------------------------ |
| `OnboardingStepper`  | `stepper.tsx`      | Numbered progress nav (`steps`, `current`) |
| `CatalogSectionForm` | `catalog-form.tsx` | Generic renderer of one catalog section    |
| Types                | `types.ts`         | snake_case shapes mirroring API JSON       |

`CatalogSectionForm` supports:

| `field_type`                                                       | Control          |
| ------------------------------------------------------------------ | ---------------- |
| `select`                                                           | Native select    |
| `multiselect`                                                      | Checkbox group   |
| `boolean`                                                          | Checkbox         |
| `date` / `integer` / `text` / `string` / `email` / `phone` / `url` | Input / textarea |

It honors `required`, `required_when`, and `pattern`. Unsupported types
(including `collection`) render nothing — heavy KYB collections are Console
territory, not the product wizard.

## Couriers reference implementation

Constants: `apps/couriers/src/lib/onboarding.ts`

```ts
export const ONBOARDING_COUNTRY = 'JM'
export const ORGANIZATION_TARGET_KEY = 'core'
```

App slug: `876-couriers` (`apps/couriers/src/lib/couriers-app`).

### Server page

`apps/couriers/src/app/app/onboarding/page.tsx`:

1. Require a signed session and redirect if already active with a tenant.
2. Resolve manage context. Existing-org users load both catalogs and sessions in
   parallel. No-context users must have zero all-status memberships, then load
   only the two catalogs because no organization sessions exist yet.
3. Render client `onboarding-wizard.tsx` with the resolved entry mode, catalogs,
   and initial answers.

Stepper labels in the Couriers wizard: **Your business** → **Set up Couriers** →
**Invite your team** (phase headings use "About your business" / workspace setup
copy).

### Route handlers

Under `apps/couriers/src/app/api/manage/onboarding/`. Each handler authorizes
the signed session or manage context (no members; blocked access rejected where
relevant) and calls the platform client or `service` — no business logic beyond
orchestration.

| Route                   | Method | Role                                                                                                                  |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `organization/route.ts` | `POST` | Create org for a no-org (social) user + save phase-1 answers; guarded against double-org                              |
| `answers/route.ts`      | `PUT`  | Saves one phase: body `{ target: 'organization' \| 'application', answers }`; maps target to `core` or `876-couriers` |
| `complete/route.ts`     | `POST` | **Orchestrator** — see ordering below                                                                                 |
| `invites/route.ts`      | `POST` | Batch org invites (`sourceAppSlug: '876-couriers'`), 1–10 emails                                                      |

### Complete orchestrator (ordering contract)

`complete` is the sole Couriers-subscription provisioner and the only step that
mutates entitlement and app-local data. The auth completion route does not
provision Couriers. Order must not change; every step is retry-safe:

1. **Submit** `organization` / `core` — fails 422 if phase 1 incomplete.
2. **Retrieve** application session answers; require non-empty `platform_name`.
3. **Submit** `application` / `876-couriers` — fails 422 if phase 2 incomplete.
4. **`platform.orgs.subscriptions.provision`** for `876-couriers` — activates org
   app entitlement (idempotent provision).
5. **`service.tenants.create`** when no tenant exists — slug from platform name;
   existing tenant is reused; slug conflicts surface as **409**.
6. **Optional** `service.tenants.update({ mailboxPrefix })` when prefix present —
   best-effort (return value not treated as fatal to the completion payload).

Success body: `{ object: 'onboarding_completion', tenant_id, access_status: 'active' }`.

Retries after a partial success must re-enter at the top: re-submit is safe,
provision is safe, tenant create is skipped when `ctx.tenant` already exists.

## Adding SSO to a new product app

1. **Register the app catalog** in `APPLICATION_CATALOGS` inside
   `apps/api/services/onboarding_catalog.py` (keyed by the platform app slug).
   Keep phase 2 to a small workspace section (2–3 fields).
2. **Reuse** `@876/ui/onboarding` (`OnboardingStepper`, `CatalogSectionForm`) in
   the product app. Do not fork field rendering.
3. **Add three thin route handlers** (answers / complete / invites) that
   authorize the session and call the platform client. In `complete`, keep the
   same order: submit org/core → submit application → provision subscription →
   **app-local materialization** (tenant, workspace, etc.).
4. **Data placement:** answers remain in the identity API; app-local tables stay
   in the product datastore, referenced by **opaque org id** only (no cross-DB
   FKs).

Console continues to use `$876.onboarding.*` against `organization/global` for
heavy KYB; product wizards use `organization/core` only.

## Design principles

- **≤3 phases** visible to the customer; internal multi-target work is invisible.
- **2–3 fields per step** on the light path; catalog can grow for Console KYB
  without bloating the product wizard.
- **Heavy KYB deferred** — `organization/global` is product-gated and out of the
  standard wizard.
- **Invite last and skippable** — workspace is already live after phase 2
  completes; invites never block activation.
- **Catalog-driven forms** — code owns field definitions; sessions store answers
  only; UI packages render, they do not own transport or lifecycle.
- **Idempotent completion** — re-running `complete` must not double-create
  tenants or leave the org half-activated.
