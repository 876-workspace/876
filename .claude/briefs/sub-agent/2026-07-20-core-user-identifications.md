# Brief: Core API `user_identifications` (sensitive identifiers, entitlement-gated)

## Context & why

Per `.claude/rules/customer-architecture.md` (read it first — it is the design
authority for this task): sensitive verified identifiers (Jamaican TRN first;
passport / driver's license later) are **identity data** owned by the core API
on the account, never by an app datastore. Orgs may see the full value only when
they hold an active subscription to an app that declares it needs that
identification type (e.g. TRN → couriers, for JCA customs clearance). Everything
else sees masked values. Every full disclosure is audit-logged.

Also read `.claude/rules/api-backend.md`, `.claude/rules/stripe-api-pattern.md`,
`.claude/rules/deletions.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/naming.md` before writing code, and study the existing
`domains/users/` + `domains/organizations/` router/schemas/docs/repository
patterns closely — match them exactly.

## Scope (file boundaries — do not touch anything else)

- `apps/api/**` (model, repository, router, schemas, docs, allowlist module,
  migration wiring, seeds if applicable, tests)
- `packages/admin/**` (new nested resource methods + types + tests)
- `packages/core/src/platform/**` (platform-client methods + types)
- `apps/docs/openapi.json` via `pnpm sync:openapi`

Do NOT touch `apps/billing`, `apps/couriers`, `packages/sdk`, or any
`.claude/rules` file. Do NOT commit — the orchestrator commits.

## Data model

New model `UserIdentification`, table `user_identifications` (place it with the
user models — follow how `db/models/users.py` structures `UserProfile`; check
how new tables get created in `apps/api/db/migrate.py` and wire the table the
same way existing recent tables are):

- `id` — string PK, generated with the API's standard id helper, prefix
  `uident` (follow existing prefix conventions, e.g. how other ids are minted).
- `user_id` — FK `users.id`, CASCADE, NOT NULL, indexed.
- `type` — string, NOT NULL. Allowed values come from the registry module (see
  below); enforce via CHECK constraint or service-level validation matching
  how the codebase handles enums (inspect `subscriptions.py` / `onboarding.py`
  for the house style — they use CHECK constraints).
- `value` — string, NOT NULL. Stored normalized (see per-type normalization).
- `country_code` — string(2), nullable.
- `verified` — bool, default false; `verified_at` (unix seconds, nullable);
  `verified_by` (nullable opaque actor id).
- Soft-delete trio per deletions.md: `deleted_at`, `deleted_by`,
  `deletion_reason`.
- `created_at`, `updated_at` — unix seconds, house pattern.
- Unique `(user_id, type)`. Non-deleted reads filter `deleted_at IS NULL`.

## Type registry + entitlement allowlist

New module `apps/api/core/identifications.py`:

```python
IDENTIFICATION_TYPES: dict[str, IdentificationTypeConfig] = {
    "trn": IdentificationTypeConfig(
        label="Taxpayer Registration Number",
        country_code="JM",
        pattern=r"^\d{9}$",           # normalized: digits only
        disclosure_app_slugs=frozenset({"876-couriers"}),
    ),
    "passport": IdentificationTypeConfig(
        label="Passport Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{6,12}$",  # normalized: uppercased, alnum
        disclosure_app_slugs=frozenset({"876-couriers"}),
    ),
    "drivers_license": IdentificationTypeConfig(
        label="Driver's License Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{5,20}$",
        disclosure_app_slugs=frozenset({"876-couriers"}),
    ),
}
```

Use a small dataclass/TypedDict per house style. Normalization: strip
whitespace and dashes; TRN keeps digits only; passport/license uppercase.
Masking helper `mask_identification_value(value)`: all but the last 3 chars
replaced with `•` (if len <= 3, mask everything). The masked form appears in
every list/retrieve response; the raw value ONLY in the disclosure response.

## Endpoints (domains/users/, all AdminDep, house router/docs/schemas split)

1. `GET /users/{user_id}/identifications` — list (non-deleted). Response items:
   `object: "user_identification"`, `id`, `user_id`, `type`, `label`,
   `country_code`, `value_masked`, `verified`, `verified_at`, `created_at`,
   `updated_at`. **No raw `value` field.**
2. `POST /users/{user_id}/identifications` — body `{type, value,
country_code?}`. 404 unknown user; 422 unknown type / value failing the
   type pattern after normalization; 409 when a non-deleted row of that type
   exists. Returns the masked shape.
3. `PATCH /users/{user_id}/identifications/{type}` — body `{value,
country_code?}`. Replaces the value, resets `verified` to false /
   `verified_at`/`verified_by` to null. 404 if absent.
4. `DELETE /users/{user_id}/identifications/{type}` — repository-owned delete
   policy per deletions.md (`DELETION_MODE`), tombstone response
   `{object: "user_identification", id, deleted: true}`.
5. `POST /users/{user_id}/identifications/{type}/disclose` — body
   `{organization_id, app_slug, reason?}`. POST (not GET) because it has an
   audit side effect. Enforcement, in order:
   - identification exists (404),
   - `app_slug` ∈ `disclosure_app_slugs` for the type (403,
     client-safe message, no leak of the value),
   - the org has a subscription to that app with status `active` (403) —
     reuse the existing subscriptions repository/query used by
     `/organizations/{org_id}/apps/by-slug/{app_slug}`,
   - write an audit event using the existing `audit_events` domain pattern
     (study how other domains record events; include org id, app slug, type,
     user id, reason — never the value),
   - return `{object: "user_identification_disclosure", type, value,
country_code, verified, disclosed_at}`.
6. Optional but included: `POST /users/{user_id}/identifications/{type}/verify`
   — body `{verified_by}` sets verified true + timestamps. AdminDep.

All expected failures via `AppHTTPException(http_status_code=...)`; no raw
values in any error message or log line.

## Client surface

- `@876/admin` (`packages/admin/src/resources/users.ts`): nest under the users
  resource following the `orgs.subscriptions` nesting precedent —
  `$876.users.identifications.{list, create, update, delete, disclose,
verify}` with typed params/results in the admin package's house type
  location. `delete` is the verb name (per sdk-conventions; `del` is the
  legacy SDK spelling — match whatever `packages/admin` currently uses for
  deletes, verify first).
- Platform client (`packages/core/src/platform/index.ts`):
  `platform.users.identifications.{list, create, update, delete, disclose}`
  mirroring its existing users namespace style.
- **Nothing in `@876/sdk`** — these are AdminDep endpoints (gating rule).

## Tests & verification (all must pass; fix what you break)

- API: pytest tests following `apps/api/tests` house style — cover: list masks
  values; create validation (unknown type, bad TRN, duplicate 409);
  patch resets verification; delete tombstone; disclose happy path returns raw
  value + writes audit event; disclose 403 on non-allowlisted app; disclose
  403 on missing/inactive subscription; 404s. Assert masked values never
  contain the raw middle digits.
- `cd apps/api && python -m pytest && python -m mypy . tests && python -m ruff check .`
- `pnpm --filter @876/admin test` and `pnpm --filter @876/admin typecheck` (or
  the package's actual script names — check package.json), same for
  `@876/core`.
- `pnpm sync:openapi` and include the regenerated `apps/docs/openapi.json`.

## Return shape

Report: files created/changed (paths), the exact route table, decisions taken
where the brief left latitude (with rationale), full verification command
outputs (pass/fail counts), and anything intentionally left out.
