# Brief: Map the core API's customer/directory/billing landscape

## Why

We are designing the platform-standard customer architecture: org-owned customers
(usable without an 876 account), optionally linked to 876 consumer accounts, with
per-app customer profiles (e.g. courier mailbox numbers) and entitlement-gated
sensitive PII (e.g. Jamaican TRN). Before deciding what to build, we need an exact
map of what the core FastAPI (`apps/api`) already owns.

## Questions to answer (with file:line citations for every claim)

1. **`apps/api/domains/directory/`** — what resources does it own (customers?
   vendors? contacts? locations?), what are the DB models (names + all columns from
   `apps/api/db/models.py` or wherever they live), what routes exist in
   `router.py`, what auth dependency each route uses (AdminDep / api-key / session),
   and what the serialized shapes look like (`schemas.py`).
2. **`apps/api/domains/billing/`** — what it owns, its models, routes, auth tiers.
   How does it relate to the standalone billing app (`apps/billing`)?
3. **`apps/api/domains/users/`** — the consumer user model: exact columns. Is there
   anywhere sensitive per-user PII (TRN, national IDs) could live today? Any
   per-app or per-org profile concept on users?
4. **Org→app entitlement** — the `organization_app_access` table and endpoints
   (per `.claude/rules/platform-services.md` it lives under
   `domains/organizations/`). Exact model columns, endpoints, how apps check it.
5. **`domains/provisioning/` and `domains/onboarding/`** — what they do, briefly.
6. **Client surface**: in `packages/admin/src/resources/` and
   `packages/sdk/src/resources/`, which customer/vendor/directory/billing resources
   are exposed, with exact method names and signatures? Also check
   `packages/core/src/platform` (the `Platform876Client` used by apps) — what
   resources/verbs does it expose?
7. Is there **any existing customer↔user linkage** in core (a `user_id` on a
   customer/directory row, a `customer_profiles` concept, etc.)? Explicitly say
   "not found" if absent.

## Scope

In: `apps/api` (domains, db/models.py, db/repositories), `packages/admin`,
`packages/sdk`, `packages/core`. Out: Next.js app UIs, tests (skim only if needed
to confirm behavior).

## Return shape

Organized findings per question, exact model/field lists, exact route tables
(method, path, auth dep), exact client method signatures, all with file:line.
Search exhaustively; read full files where they are load-bearing. Call out
anything that contradicts `.claude/rules/platform-services.md`.
