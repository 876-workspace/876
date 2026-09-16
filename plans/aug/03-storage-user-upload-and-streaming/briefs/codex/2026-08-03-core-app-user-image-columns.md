# Brief — Phase 7b: `apps.logo_file_id` and `users.avatar_file_id` in the core API

**Model: `gpt-5.6-sol`, medium reasoning effort** (user instruction 2026-08-03,
"use sol for the image stuff", "5.6 sol on medium").

## Why

Console needs hover-to-change image upload for **apps**, **organizations** and
**users**, backed by 876 Storage. The organization path already works end to end
across all three layers (storage route → core column → couriers UI). The app and
user paths now have their **storage routes** — `app.logo` and `user.avatar`
landed in `apps/storage-api/domains/uploads/routes.py` (PR #165, merged).

The next missing piece is the **core-API half**: apps and users can hold only a
free-text image URL today, with no canonical Storage file reference. This phase
adds that reference, exactly mirroring what organizations already have.

Full feature spec: `.claude/briefs/deferred/876-storage-image-uploads.md`.
Binding architecture rule: `.claude/rules/storage-architecture.md` — **read it
before writing code.** Also read `.claude/rules/api-backend.md` (route/schema/docs
layering) and `.claude/rules/sdk-conventions.md` (client tiers, verb vocabulary).

## Scope — files you may touch

- `apps/api/db/models/apps.py`, `apps/api/db/models/users.py`
- `apps/api/db/migrate.py`
- `apps/api/main.py` — **only** the migration wiring and the bootstrap revision
  bump described below
- `apps/api/domains/apps/{schemas.py,router.py,docs.py}`
- `apps/api/domains/users/{schemas.py,router.py,docs.py}`
- `apps/api/db/repositories/{apps.py,users.py}` if the update path needs the new
  field allow-listed
- `apps/api/tests/**`
- `packages/admin/src/types.ts` and `packages/admin/src/resources/{apps,users}.ts`
- `packages/core/src/platform/types.ts`
- `packages/admin/**` tests

Nothing else. **Not** `apps/console`, **not** `apps/couriers`, **not**
`apps/storage-api`, **not** `packages/ui`.

**Another agent is working in this repository concurrently, and the working tree
has unrelated uncommitted changes that are not yours.** Do not touch files
outside the scope above, do not run any `git` command (no commit, branch, stash,
checkout, restore, or clean), and do not "fix" unrelated things you notice.
In particular `packages/core/src/platform/types.ts` already has an uncommitted
edit near `PlatformSubscription` — leave it exactly as you find it and add your
field elsewhere in the file.

## The precedent to mirror — `organizations.logo_file_id`

Everything in this phase already exists for organizations. Read these first and
copy the shape rather than inventing one:

| Layer            | Organization precedent                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Model column     | `apps/api/db/models/orgs.py:56` — `logo_file_id: Mapped[str \| None]`, `String`, nullable         |
| Migration        | `apps/api/db/migrate.py:707` — `ensure_organizations_logo_file_id_column`                         |
| Migration wiring | `apps/api/main.py` — imported, called in `_seed_identity_tables`, `BootstrapStep` revision bump   |
| Schema           | `apps/api/domains/organizations/schemas.py:58,263` — `logo_file_id: str \| None = Field(...)`     |
| Serialization    | `apps/api/domains/organizations/router.py:70` — `logo_file_id=getattr(row, "logo_file_id", None)` |
| Update allowlist | `apps/api/domains/organizations/router.py:241` — `"logo_file_id"` in the updatable field tuple    |
| Tests            | `apps/api/tests/test_org_profile.py`, `apps/api/tests/test_org_logo_migration.py`                 |

`test_org_logo_migration.py` asserts the migration is **guarded and idempotent** —
write the equivalent for both new columns.

## The change

### 1. Columns

| Table   | New column       | Type                | Existing sibling |
| ------- | ---------------- | ------------------- | ---------------- |
| `apps`  | `logo_file_id`   | `VARCHAR`, nullable | `logo_url`       |
| `users` | `avatar_file_id` | `VARCHAR`, nullable | `avatar`         |

The existing `logo_url` / `avatar` columns **stay**. They are the rendered-URL
cache; the new `*_file_id` is the canonical identity, exactly as
`storage-architecture.md` requires ("Applications reference files by opaque
`fileId` … a rendered URL is a cache, never the source of truth"). Do not drop,
rename, or repurpose the URL columns, and do not add a DB constraint tying them
together.

### 2. Migrations

Add two guarded, idempotent functions to `apps/api/db/migrate.py` following
`ensure_organizations_logo_file_id_column` line for line:

- `ensure_apps_logo_file_id_column`
- `ensure_users_avatar_file_id_column`

Each must: return early if the table is absent, return early if the column is
already present, and use `exec_isolated(conn, "<table>.<column>", "ALTER TABLE
… ADD COLUMN … VARCHAR")`.

Wire both into `_seed_identity_tables` in `apps/api/main.py` beside the existing
`ensure_organizations_logo_file_id_column` call, and **bump the
`BootstrapStep("identity_tables", …)` revision from 2 to 3**, updating the
comment above it to say revision 3 adds `apps.logo_file_id` and
`users.avatar_file_id`. Bumping the revision is what makes the migration run on
an already-bootstrapped database — skipping it means the column silently never
appears in any existing environment.

**No cross-database foreign key.** `logo_file_id` / `avatar_file_id` are opaque
Storage IDs; the Storage service owns its own database. A FK here would violate
`platform-services.md`.

### 3. Schemas + serialization

Expose the field on every serialized app / user resource that already exposes
its URL sibling, and accept it on the corresponding admin update params. Follow
`domains/organizations/schemas.py` for the `Field(...)` description style and
update the `json_schema_extra` examples the same way that file does (it lists
`"logo_file_id": None` in its example payload).

Add the field to the update allow-list tuple in each router, mirroring
`domains/organizations/router.py:241`. Setting it to `null` must be an accepted,
meaningful update — that is how removal works (see below) — so make sure an
explicit `null` is distinguishable from "field omitted" wherever the existing
org code makes that distinction.

Route-level OpenAPI prose belongs in `docs.py`, field descriptions in
`schemas.py` — per `.claude/rules/api-backend.md`. Do not put descriptions in
`docs.py` or route summaries in `schemas.py`.

### 4. `@876/admin` + `@876/core` types

- `packages/core/src/platform/types.ts` — add `logo_file_id: string | null` to
  the platform app types that already carry `logo_url`, and
  `avatar_file_id: string | null` to the user type that carries `avatar`. Match
  the required/optional shape of the existing org `logo_file_id` entries in that
  same file (lines 63, 88, 133 show both the required and the optional-update
  form).
- `packages/admin/src/types.ts` — same additions for the admin resource types
  and the `*UpdateParams` types. Note this file has several app/user shapes
  (around lines 118, 167, 207, 312, 357, 441, 507, 518, 536, 835); add the field
  to the ones that represent an app or user **resource** or an app/user
  **update params**, and leave denormalized report/rollup shapes
  (`organization_logo_url`, `user_avatar`, `app_logo_url`) alone.
- `packages/admin/src/resources/apps.ts` (`update`, line ~85) and
  `packages/admin/src/resources/users.ts` (`update`, line ~162) need no new
  method — the field flows through the existing update params. **Do not add a
  new verb.** If you find yourself wanting `apps.setLogo()`, stop: that is not
  in the vocabulary (`.claude/rules/sdk-conventions.md`).

These are `AdminDep` endpoints, so the methods stay in `@876/admin` only.
**Do not add anything to `@876/sdk`** — that would violate the auth-tier gating
rule.

## Decided — do not revisit

- **Removal semantics (user decision, 2026-08-03): removing an image
  soft-deletes the Storage file AND nulls the reference.** For _this_ phase that
  means only one thing: `PATCH`-ing `logo_file_id`/`avatar_file_id` to `null`
  must work and must be tested. The Storage-side soft delete is issued by the
  Console route handler in phase 7c — **do not call the Storage service from
  `apps/api`**, and do not add a cascade.
- **No cropping** (user decision, 2026-08-03). Irrelevant to this phase; noted so
  you do not add image-processing fields.
- `owner_type` for `app.logo` is `platform`, already settled in phase 7a. No
  schema widening anywhere.

## Tests

- Migration guard/idempotency tests for both columns, mirroring
  `apps/api/tests/test_org_logo_migration.py`. Assert the function is a no-op
  when the table is missing, a no-op when the column already exists, and adds
  the column exactly once otherwise.
- Serialization: an app response includes `logo_file_id`, a user response
  includes `avatar_file_id`, both `None` by default.
- Update: setting each field to a file ID persists and round-trips.
- Update: setting each field explicitly to `null` clears it (the removal path).
- Update: the field is not settable through any non-`AdminDep` route that
  serializes it — assert the existing auth dependency still guards it.
- `packages/admin` — extend the existing type/contract tests so the new fields
  are covered by whatever parity test already exists there.

## Verification — run each in the FOREGROUND and quote the real output

```bash
cd apps/api && python -m pytest
cd apps/api && python -m mypy . tests
cd apps/api && python -m ruff check .
pnpm --filter @876/admin typecheck
pnpm --filter @876/admin test
pnpm --filter @876/core typecheck
```

Do not summarize as "verification passed" — paste the tail of each. Earlier runs
on this repo claimed success while typecheck was broken and 18 tests were
failing.

## Do not

- Do not commit, branch, stash, or run any `git` write command.
- Do not touch anything outside the scope list.
- Do not drop or rename `apps.logo_url` or `users.avatar`.
- Do not add a foreign key to the Storage database.
- Do not add a new SDK/admin verb; the field rides the existing `update`.
- Do not add anything to `@876/sdk`.
- Do not call the Storage service from `apps/api`.
- Do not forget the `BootstrapStep` revision bump — without it the migration
  never runs on an existing database.
- Do not implement the Console UI or route handlers — that is phase 7c.

## Report back

1. The two migration functions verbatim, plus the `main.py` wiring diff and the
   revision bump.
2. Every schema/serializer touch point, with `file:line`.
3. The exact list of `packages/admin` + `packages/core` type shapes you added the
   field to, and the ones you deliberately skipped, with reasoning.
4. Confirmation that `null` clears the reference, with the test that proves it.
5. The real tail of all six verification commands.
