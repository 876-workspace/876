# Brief: CRM requests inside 876 Invoice and 876 Billing

Branch: `feat/crm-requests-in-finance-apps`. Do not create, rename, merge, or
rebase a branch. Do not commit — the orchestrator stages and commits. Do not
open a pull request.

## Rules to read before writing code

`.claude/rules/ai-code-quality.md`, `naming.md`, `types.md`, `code-style.md`,
`testing.md`, `error-handling.md`, `express-api.md`, `sdk-conventions.md`,
`access-tiers.md`, `access-control.md`, `shared-product-ui.md`,
`app-structure.md`, `app-layout.md`, `app-api-routing.md`, `data-loading.md`,
`finance-app-parity.md`, `billing-data-plane.md`.

## Goal

An organization using 876 Invoice or 876 Billing raises and works **CRM requests
for its own customers** without leaving the finance app, and can tie a request
to the financial record it is about. The request is written into **that
organization's own CRM tenant** — one record, whichever app opened it.

## Do not conflate the two planes

- `@876/crm/support` (`create876CrmSupportClient`) is **org → 876**. It lands in
  Efesto's CRM tenant and Console shows it at `/orgs/[slug]/support`. Invoice and
  Billing already ship it as the support widget. **Leave it completely alone.**
- This work is **org → its own customer**, through `@876/crm/service`, landing in
  the org's own CRM tenant.

Never route one through the other, and never reuse `CRM_SUPPORT_SERVICE_KEY` for
the new path.

## Facts already verified — build on these, do not re-derive

- `apps/crm-api` `CustomerProfile` is unique on `(tenantId, billingCustomerId)`;
  `customers.service.list` calls the Billing registry then `repository.ensureMany`,
  so a profile exists for every registry customer.
- A CRM `Request.customerId` is the **CustomerProfile id**, not the billing
  customer id. Finance apps hold the billing id (`cust_…`).
- `customers.list` currently filters only by `customerOrganizationId` /
  `customerUserId`. There is **no** way to resolve one profile by billing id.
- `crm.requests.list(orgId, { customerId })` and `.create(orgId, input)` exist.
- `CreateRequestInput` requires `customerId`, `subject`, `createdBy`.
- Console already renders `/workspace/[orgSlug]/crm/requests` (list, record,
  new) and cross-org `platform` `/v1/requests`.
- `apps/crm` `_components/customer-requests-tab.tsx` is a hardcoded stub with an
  empty array. `apps/invoice` and `apps/billing`
  `customers/[customerId]/requests/page.tsx` are hardcoded `state: 'empty'`
  placeholders. All three are to be replaced by one shared panel.
- Permission catalogs for `876-billing` and `876-invoice` are in
  `packages/core/src/access/catalogs.ts`; neither declares a `requests` module.

If any of these turns out to be false, **stop that phase and report it** with the
contradicting file and line. Do not invent around a wrong premise.

## Authentication — reuse CRM's existing per-app service pattern, do not widen the internal key

`apps/crm-api/src/http/support-service-auth.ts` already implements the correct
shape: `requireSupportService` reads a **JSON map of `appSlug -> key`** from
`CRM_SUPPORT_SERVICE_KEYS` and authenticates the calling app by
`x-876-service-app` + `x-876-service-key`.

Do **not** give Invoice or Billing `CRM_INTERNAL_KEY`. `access-tiers.md` forbids
one universal internal key that lets every product reach every other product.

Add `apps/crm-api/src/http/service-auth.ts` with `requireServiceApp`, modelled
directly on `requireSupportService` but reading a **separate** map from
`CRM_SERVICE_KEYS`, so a support credential can never reach org-scoped data and
vice versa. Reuse `parseSupportServiceKeys` and `secretsMatch` — do not write a
second parser or a second comparison.

Apply it to the org-scoped customers and requests routes as an **alternative**
to `requireInternal`: accept an internal key (the CRM app, Console) **or** a
valid service app key. Write one small composed guard rather than duplicating
either. Put the authenticated `appSlug` on `res.locals` and derive the request's
`sourceApp` from it — never from the request body.

### Source-app attribution — resolved (this supersedes the earlier wording)

You were right to stop: `requireInternal` carries no caller identity, so
`sourceApp` cannot be derived for CRM or Console on that path. The decision:

**Every first-party caller gets its own entry in `CRM_SERVICE_KEYS`** — `876-crm`,
`876-console`, `876-invoice`, `876-billing` — and each of those four apps sends
`x-876-service-app` + `x-876-service-key` on its org-scoped CRM calls. Migrate
`apps/crm/src/lib/services/crm.ts` and `apps/console/src/lib/services/crm.ts`
onto that credential. `packages/crm/src/request.ts` already has `serviceRequest`;
use it rather than writing a second transport.

`CRM_INTERNAL_KEY` remains accepted on those routes for operational access, but
a request authenticated that way records **`sourceApp = null`**. Null is the
honest value for "trusted caller, unknown app" — never guess a slug, and never
read one from the body.

App-side variables, already decided; use exactly these names:

| Variable           | Where                          | Value                                |
| ------------------ | ------------------------------ | ------------------------------------ |
| `CRM_SERVICE_KEYS` | `876-crm-api`                  | JSON map keyed by all four app slugs |
| `CRM_SERVICE_APP`  | invoice, billing, crm, console | the app slug                         |
| `CRM_SERVICE_KEY`  | invoice, billing, crm, console | that app's key                       |
| `CRM_API_URL`      | invoice, billing               | already set                          |

**The orchestrator mints these and sets them on Vercel.** Declare them in each
app's `.env.example`, `wrangler.jsonc` `secrets.required`, and
`scripts/cloudflare-release-contract.mjs`, and fail loudly when one is missing —
but do not invent values and do not touch any `.env` file.

Minimum 10 additional `it()` cases for the guard: wrong app slug, wrong key,
missing map, malformed JSON map, support key rejected on an org route, internal
key still accepted, `sourceApp` derived from the credential and not the body.

## Phase A — `apps/crm-api`

1. Add the service-app guard described above.
2. Add a `billingCustomerId` filter to the customers list: repository query,
   service `ListCustomersFilter`, controller, Zod query schema, OpenAPI. When it
   is supplied, resolve through the registry for that one id and `ensure` the
   profile, so a finance app gets a usable profile in one call. Keep the
   existing filters working.
3. Additive, nullable migration on `Request` — hand-write the SQL to
   `apps/crm-api/prisma/migrations/<timestamp>_request_related_resource/migration.sql`.
   Do not run `prisma migrate` or any generator.
   - `related_resource_type text NULL`
   - `related_resource_id text NULL`
   - `related_resource_snapshot jsonb NULL`
   - `source_app text NULL`
   - `CREATE INDEX ... ON requests (tenant_id, related_resource_type, related_resource_id)`
     Update `prisma/schema/request.prisma` with matching `@map`ped camelCase fields.
4. Accept and persist those fields on create; expose them on the serializer;
   allow `relatedResourceType` + `relatedResourceId` as list filters so an
   invoice page can ask "requests about this invoice".
5. `relatedResourceType` is a **kebab-case symbolic value**, one of exactly
   `invoice`, `payment`, `quote`, `credit-note`. Reject anything else at the Zod
   boundary. The snapshot is a small display object (number, amount as a string
   or integer minor units, currency, status) — **never** a JS `number` for money,
   and never re-derived at read time.
6. `sourceApp` records which app opened the request (`876-invoice`,
   `876-billing`, `876-crm`, `876-console`). It is set from the validated caller,
   never from a client-supplied body field.

Minimum 24 `it()` cases for this phase: filter behaviour, tenant isolation,
rejected related-resource values, snapshot round-trip, index-backed list filter,
serializer shape, and negative space on each.

## Phase B — `packages/crm`

Add the filter and the related-resource/source fields to the typed contracts,
resources, and Zod schemas. **No new caller-authority entrypoint** — this routes
through the existing `service` client. Do not add a method to a compatibility
shim. Minimum 14 `it()` cases.

## Phase C — `packages/crm-ui`

Three presentation-only components, each its own subpath export, each with its
own empty / loading / error `state` prop as a discriminated union, each taking
href builders and callbacks as props:

- `customer-requests-panel` — the list of requests for one customer.
- `request-composer` — subject, description, priority, optional category, and an
  optional pre-filled related resource shown as a read-only chip.
- `related-requests-panel` — "requests about this invoice/payment", for a
  finance document page.

These must not import a session helper, a service client, `@876/crm/service`, or
`fetch`. They must not hard-code a route. Follow `shared-product-ui.md`.
Check `packages/crm-ui/vitest.config.ts` for the test environment before writing
component tests. Minimum 20 `it()` cases.

## Phase D — `apps/invoice` and `apps/billing`

Mirror each other exactly; the two apps differ only where the product genuinely
differs.

1. `src/lib/services/crm.ts` — a lazily initialized, server-only `service`
   client, in the shape of `apps/crm/src/lib/services/crm.ts`. New env vars
   declared in the app's `.env.example` and `wrangler.jsonc` `secrets.required`,
   and added to `scripts/cloudflare-release-contract.mjs`. Do **not** default a
   base URL to localhost in new code.
2. Route handlers under the product's own vocabulary — `/api/requests`,
   `/api/requests/[requestId]`, `/api/customers/[customerId]/requests`. Thin,
   pure transport: authorize, parse, call one CRM operation, return the envelope.
   No business logic. No server actions.
3. Replace the placeholder `customers/[customerId]/requests/page.tsx` with the
   shared panel, loading real data behind a Suspense boundary whose fallback
   carries the real chrome (`data-loading.md`). The toolbar and tab strip render
   immediately.
4. Add "New request" to the invoice and payment record pages, pre-filling the
   related resource, and render `related-requests-panel` on those records.
5. Add a `requests` module with `view` and `create` actions to **both**
   `876-invoice` and `876-billing` in `packages/core/src/access/catalogs.ts`.
   **Every permission you declare must be granted by a named role** — a
   permission nothing grants is indistinguishable from one that does not exist.
   Guard each route handler and each page on the same key its navigation entry
   requires, and add the binding test.
6. An org with no CRM tenant (`crm/tenant-not-found`) renders an honest empty
   state with an activation path for an admin. Never a crash, never `/no-access`,
   never an empty list presented as "no requests".

Minimum 30 `it()` cases across the two apps.

## Phase E — `apps/crm` and `apps/console`

- Replace `apps/crm/src/app/(app)/customers/_components/customer-requests-tab.tsx`
  with the shared `customer-requests-panel`, fed by real data. Delete the stub
  array — do not leave both.
- Render `sourceApp` and the related resource on Console's request record and in
  its request list, so an operator can see that a request came from Invoice and
  what it is about. Console authorizes with `requireConsolePermission` and writes
  its audit event before the operator client is touched.

Minimum 12 `it()` cases.

## Hard prohibitions

- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- No `proxy.ts` or `middleware.ts`.
- No server actions.
- No raw `fetch` to a service from a Next.js app.
- No second implementation of a capability the CRM service already owns.
- No money or rate carried as a JS `number`.
- No weakening of a production signature to make a test easier.
- Do not run `prisma migrate`, `prisma generate`, or any database command.
- Do not write a run log or any `.log` file anywhere in the repository.
- Do not add AI attribution anywhere.

## Report

Write `plans/2026-09-12-crm-requests-in-finance-apps/reports/codex/2026-09-12-crm-requests-in-finance-apps.md`
with: a per-phase status table carrying the **counted** number of `it()` cases
added; every file changed and why; the migration SQL in full; decisions the brief
did not settle; **everything you could not verify**; gaps you deliberately left;
and the risks a reviewer should check first. A truthful "not executed" beats a
confident claim.
