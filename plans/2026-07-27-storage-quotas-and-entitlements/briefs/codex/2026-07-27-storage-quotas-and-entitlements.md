# Brief: 876 Storage — quotas, entitlements, provisioning, and Console management

**Author:** orchestrating Claude agent (design owner)
**Executor:** Codex (`gpt-5.6-sol`)
**Date:** 2026-07-27

---

## 0. Read this section before anything else

### 0.1 Your goal

Ship **six phases / twenty-one pull requests** that turn 876 Storage from an
unmetered file service into a metered, entitled, provisioned SaaS service with
full Console management.

**Do not stop working until every PR listed in §5 is open on GitHub and green.**
"Green" means CI checks pass and the verification commands in §1.6 pass locally
for the packages the PR touches. If you are interrupted, resume at the first
incomplete PR — the PR list in §5 is your checklist and is ordered.

Do **not** merge any PR. Open them and leave them open. The orchestrating agent
reviews and merges.

### 0.2 The single most important thing

**Every design decision in this brief has already been made.** Sections §3 and
§4 are decisions, not suggestions. Do not substitute a different quota model, a
different delivery mechanism, a different table shape, or different naming
because you would have designed it differently. If a decision here turns out to
be _impossible_ (not merely inconvenient), stop that PR, write what you found
into `.claude/briefs/codex/BLOCKED-storage-quotas.md`, and move to the next
independent PR.

You **do** have liberty in: internal function decomposition, additional test
cases beyond the required ones, log/metric field names, docstring prose,
variable naming inside a function, and the precise SQL used to express a
required semantic. Use it.

### 0.3 Read these repository rules before writing code

They are binding, and reviewers check them:

- `CLAUDE.md` (root) — platform shape, boundaries, UI copy rules, no green buttons
- `.claude/rules/git.md` — Conventional Commits, atomic commits, **no AI attribution**
- `.claude/rules/api-backend.md` — FastAPI structure, `router.py` / `schemas.py` / `docs.py` split
- `.claude/rules/sdk-conventions.md` — `$876.<resource>.<verb>()`, tiering, product admin subpaths
- `.claude/rules/stripe-api-pattern.md` — `object` discriminators, `{data,error}`, list containers
- `.claude/rules/storage-architecture.md` — category/audience model, object keys, upload flow
- `.claude/rules/platform-services.md` — three-bucket placement, opaque IDs, key tiers
- `.claude/rules/app-layout.md` — Console page containers, `ResourceToolbar`, `StatusFilterHeading`
- `.claude/rules/deletions.md` — soft deletes, tombstones
- `.claude/rules/types.md`, `.claude/rules/code-style.md`, `.claude/rules/testing.md`

---

## 1. Hard rules

### 1.1 One branch and one PR per item in §5

```bash
git checkout main && git pull --ff-only
git checkout -b <branch-name-from-§5>
# ... work ...
git push -u origin <branch-name>
gh pr create --base main --title "<conventional commit title>" --body "..."
```

Never stack a PR on another PR's branch unless §5 explicitly says
`DEPENDS ON <PR>` — in which case branch from that PR's branch and note the
dependency in the PR body.

### 1.2 Absolutely no AI attribution

Do **not** write `Co-Authored-By: Codex`, `Co-Authored-By: Claude`,
`Generated with …`, `🤖`, or any similar trailer or line into any commit
message, commit body, or PR description. If you notice one on a local unpushed
commit, amend it out before pushing. This is checked mechanically.

### 1.3 Commit granularity

Per `.claude/rules/git.md`: each commit is one logical change with a message
that states **what changed and why**, not a file list. A PR with 6 files
usually means 3–6 commits, not one. Migrations, models, repositories, routes,
and tests for one feature may be grouped only when they are genuinely one
coordinated step.

Bad: `feat(storage): add quotas`
Good: `feat(storage-api): reserve declared bytes before signing an upload URL`

### 1.4 Before every commit

```bash
pnpm format          # prettier, workspace root
pnpm lint
```

Never commit a regenerated `pnpm-lock.yaml` unless you actually changed a
dependency.

### 1.5 After opening every PR

```bash
gh pr view <n> --json mergeable,mergeStateStatus
```

Poll until `mergeable` is no longer `UNKNOWN`. If `CONFLICTING`, merge `main`
in and resolve before moving on. Then check for review-bot comments:

```bash
gh pr view <n> --comments
```

If a review bot flags a real defect, fix it in a follow-up commit on the same
branch. If it is a false positive, reply on the PR explaining why and move on.

### 1.6 Verification commands

| Area               | Commands                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `apps/storage-api` | `cd apps/storage-api && python -m ruff check . && python -m mypy . tests && python -m pytest`                   |
| `apps/api`         | `cd apps/api && python -m ruff check . && python -m mypy . tests && python -m pytest`                           |
| `packages/storage` | `pnpm --filter @876/storage typecheck && pnpm --filter @876/storage test && pnpm --filter @876/storage lint`    |
| `packages/admin`   | `pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test && pnpm --filter @876/admin lint`          |
| `apps/console`     | `pnpm --filter @876/console typecheck && pnpm --filter @876/console test && pnpm --filter @876/console lint`    |
| `apps/couriers`    | `pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test && pnpm --filter @876/couriers lint` |

Do **not** run `pnpm build` unless a PR changes build behavior.

### 1.7 Databases are separate

`apps/api` and `apps/storage-api` have **different databases**. There is never
a foreign key, a join, or a shared table between them. Cross-service references
are opaque string columns only. This is `.claude/rules/platform-services.md`
and violating it is the single worst thing you can do in this work.

---

## 2. What exists today (verified — do not re-derive)

### 2.1 The Storage service — `apps/storage-api`

A FastAPI service, its own Postgres, its own Cloudflare Worker front door.
Authenticated by `x-internal-key` (`core/security.py: require_internal_key`) on
the whole `/v1` router (`api/v1.py`), plus a separate `x-scheduler-key` for the
internal maintenance router (`domains/maintenance/router.py`).

Tables today (`db/models/`):

- `storage_files` — `id`, `owner_type` (`organization|user|platform`), `owner_id`,
  `source_app_id`, `purpose`, `category`, `audience`, `provider`, `bucket`,
  `object_key`, `version_id`, `original_name`, `content_type`, `size_bytes`,
  `status` (`pending|uploaded|ready|failed|deleted`), `created_by`,
  `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `deletion_reason`,
  `purged_at`.
- `storage_upload_sessions` — `id`, `file_id` (FK), `route_key`, `status`
  (`created|completed|failed|expired`), `declared_content_type`,
  `declared_size_bytes`, `expires_at`, `completed_at`, `created_by`, timestamps.
- `storage_audit_events`.

Upload flow (`domains/uploads/router.py`):

1. `POST /v1/uploads` — `_validate_upload()` checks the route policy from
   `domains/uploads/routes.py` (`UPLOAD_ROUTES`, currently only
   `organization.primaryLogo`), then creates a `pending` file row + a `created`
   session row, then signs an R2 `PUT` with `Content-Type` and `Content-Length`
   as **signed headers** (R2 has no presigned POST, so size cannot be enforced
   at the edge — see `.claude/rules/storage-architecture.md`).
2. Browser `PUT`s bytes directly to R2.
3. `POST /v1/uploads/{session_id}/complete` — `HEAD`s the object, compares
   `content_length` / `content_type` against the session declaration via
   `_verification_rejection_reason()`, deletes the object and fails the file on
   mismatch, otherwise marks the session `completed` and the file `ready`.

Reclamation (`domains/maintenance/reclamation.py`, `POST /internal/storage-sweep`,
`scripts/cleanup_storage.py`) deletes R2 objects for soft-deleted files
(`FileRepository.list_reclaimable`) and abandoned pending/failed files
(`FileRepository.list_abandoned`).

Migrations are Alembic under `apps/storage-api/migrations/versions/`, named
`YYYYMMDDNNNN_description.py`, chained by `down_revision`. Latest is
`202607270002_namespace_storage_tables.py`.

**There is no quota, usage, plan, or limit concept anywhere in this service
today.** Everything in §4 is new.

### 2.2 The identity core — `apps/api`

Owns the commercial catalog, and it is Stripe-shaped:

- `core/platform_apps.py` — `PLATFORM_APPS: list[PlatformApp]`, the canonical
  first-party app registry (`876-consumer`, `876-enterprise`, `console`,
  `876-couriers`, `876-billing`). `app_kind` ∈ `internal|platform|product|external`.
- `core/products.py` — `PLATFORM_PRODUCTS: list[PlatformProduct]`, plans and
  their prices, seeded by `main.py:_seed_platform_products`.
- `core/modules.py` — `PLATFORM_MODULES`, boolean capability entitlements
  (`ApplicationModule` / `PlanModule` in `db/models/modules.py`), seeded by
  `services/plan_seeds.py:seed_platform_plan_modules`.
- `db/models/subscriptions.py` — `Subscription` (org → app), with
  `SubscriptionItem` → `Price` → `Product`.
- `services/provisioning.py:provision_organization()` — called on org creation.
  Today it seeds default org roles and **hardcodes one entitlement**: a
  subscription to `876-enterprise`.
- `main.py:get_bootstrap_steps()` — an ordered, revisioned list of
  `BootstrapStep`s run at startup. `services/plan_seeds.py:backfill_billing_plan_assignments`
  is the existing precedent for a **retroactive backfill step**.
- `db/models/billing_customer_sync.py:BillingCustomerOutbox` +
  `services/billing_customer_sync.py` + `services/billing_customer_dispatch.py`
  — the existing precedent for **durable cross-service delivery**: a table of
  pending events, deduplicated by `payload_hash`, claimed with
  `FOR UPDATE SKIP LOCKED`, delivered by an asyncio worker started in
  `main.py:lifespan`.
- `db/models/provisioning.py` + `services/provisioning_catalog.py` +
  `services/provisioning_seeds.py` — the declarative provisioning manifest
  engine, with `target_type` ∈ `organization|finance|application`. The
  `organization`/`global` manifest exists and is currently empty.

### 2.3 Clients

- `packages/storage` (`@876/storage`) — server-only client, `create876StorageClient`,
  composed in `src/client.ts` from `src/resources/{uploads,files}.ts` over
  `src/runtime.ts` + `src/request.ts`. Zod schemas per category in `src/types/`.
  `package.json` currently exports only `"."`.
- `packages/admin` (`@876/admin`) — internal-key tier client for core,
  `src/resources/*.ts` factories composed in `src/client.ts`.
- `apps/couriers/src/lib/storage.ts` — `$storage` singleton.
- `apps/couriers/src/app/api/manage/settings/orglogo/{route.ts,complete/route.ts}`
  — the only production upload path today.

---

## 3. The design — quota and attribution model (DECIDED)

### 3.1 Vocabulary — use these exact words in code, docs, and UI

| Term              | Meaning                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Storage plan**  | A `Product` on the `876-storage` app carrying numeric entitlement values.                                         |
| **Quota subject** | The entity a limit applies to: an organization, or a user.                                                        |
| **Quota**         | The enforced limit for one subject (`limit_bytes`).                                                               |
| **Usage**         | `bytes_used` (verified `ready` files) + `bytes_reserved` (open upload sessions).                                  |
| **Owner**         | The quota-bearing entity of a file (`storage_files.owner_type` / `owner_id`). **Usage counts against the owner.** |
| **Uploader**      | The user who performed the upload (`storage_files.created_by`). **Recorded for visibility only — never billed.**  |
| **Pool**          | An organization's `limit_bytes`; every file in the org draws from it.                                             |
| **Member cap**    | An optional per-user `limit_bytes` _within_ an org. Never replaces the pool.                                      |

Never write "storage visibility", never call a member cap a "pool", and never
present "uploaded by" figures as if they were a quota.

### 3.2 Owner vs uploader — the question this answers

An organization logo is `owner_type='organization'`, `owner_id=<org>`, and
`created_by=<the user who uploaded it>`. So:

- The bytes count against the **organization pool**.
- Console can still show **who** uploaded it.
- They do **not** count against that user's member cap.

A user's own file is `owner_type='user'`, `owner_id=<user>`, and — when
uploaded inside an org context — `quota_org_id=<org>`. Those bytes count
against **both** the member cap and the org pool.

This is the Google Workspace / Dropbox Business model: storage is pooled at the
organization, with optional per-user caps carved out of the pool.

### 3.3 Admission rule

An upload is admitted only if **every applicable subject has headroom.**

```
subjects(file) =
    [(owner_type, owner_id)]
  + [('organization', quota_org_id)]  if quota_org_id is set and owner_type != 'organization'

admitted  ⟺  ∀ s ∈ subjects:  usage(s).bytes_used + usage(s).bytes_reserved + declared_size
                               ≤ quota(s).limit_bytes        (null limit_bytes = unlimited)
```

Both models the platform needs are expressible with the same two dials:

- **Pooled only (the default):** org `limit_bytes = 5 GiB`, no member caps set.
- **Per-user quotas:** the same org pool, plus `default_user_limit_bytes` on
  the org, which materializes a member cap for each user subject.

### 3.4 Reservation protocol — how an over-limit upload is prevented

This is the heart of the work. Get it exactly right.

**On `POST /v1/uploads`, inside one transaction, before signing anything:**

1. Resolve the applicable subjects (§3.3).
2. For each, ensure a `storage_usage` row exists:
   `INSERT … ON CONFLICT DO NOTHING`, then
   `SELECT … FOR UPDATE`, **ordered by `(subject_type, subject_id)`** so
   concurrent multi-subject admissions cannot deadlock.
3. Resolve each subject's quota (§3.6 covers a missing quota row).
4. Enforce `min(route.max_size_bytes, quota.max_file_bytes)` as the per-file
   ceiling; over it → `413 storage/file-too-large`.
5. If any subject fails the admission inequality → **create no file row, no
   session row, and no signed URL** → `409 storage/quota-exceeded`.
6. Otherwise `bytes_reserved += declared_size` for every subject, then create
   the file + session rows and sign the URL.

The `FOR UPDATE` in step 2 is what makes this correct: two concurrent 3 GiB
admissions against a 5 GiB pool serialize, and the second is rejected. **A
check that reads the counter without locking it is wrong and will be rejected
in review.**

**On `POST /v1/uploads/{id}/complete`, after HEAD verification succeeds:**

```
bytes_reserved -= session.declared_size_bytes
bytes_used     += head.content_length      # the VERIFIED size, not the declared one
files_count    += 1
session.reservation_released_at = now
```

Use the verified length even though verification already requires it to equal
the declared size — so the invariant survives any future relaxation of that
check.

**On every terminal failure** (`object missing`, `verification failed`,
`expired`, provider error at completion):

```
bytes_reserved -= session.declared_size_bytes
session.reservation_released_at = now
```

**Exactly-once release.** `storage_upload_sessions.reservation_released_at` is
the guard. Every release path must, in the same transaction:

```sql
UPDATE storage_upload_sessions
   SET reservation_released_at = :now
 WHERE id = :id AND reservation_released_at IS NULL
```

and only decrement when that `UPDATE` affected a row. A double release silently
grants free storage and is the worst bug available in this design — test it
explicitly.

**On expiry.** The maintenance sweep releases reservations for sessions where
`expires_at < now`, `status IN ('created','failed','expired')`, and
`reservation_released_at IS NULL`. This must run even if the file row was
already reclaimed.

**On delete.** A soft delete releases the quota immediately:
`bytes_used -= size_bytes`, `files_count -= 1`, and sets
`storage_files.quota_released_at`. Guard it the same way — only decrement when
`quota_released_at` was `NULL`. Rationale: a user who deletes a file expects
the space back; the bytes are reclaimed asynchronously by the existing sweep.
Document this in the rule file update (PR 6.2). A hard delete does the same.

**Never let a counter go negative.** Clamp at zero in SQL
(`GREATEST(bytes_used - :n, 0)`) and log `storage.usage.underflow` at warning
level when the clamp engages — an underflow means a release path ran twice and
you want to see it, not hide it.

### 3.5 Drift repair

Counters are a cache. Add:

- `POST /v1/admin/usage/recompute` (internal key) — body
  `{subject_type, subject_id}` or `{all: true, limit: N}`.
- A sweep entry that recomputes the N least-recently-recomputed subjects.

Recompute semantics:

```sql
bytes_used   = COALESCE(SUM(size_bytes) FILTER (WHERE status='ready' AND deleted_at IS NULL), 0)
files_count  = COUNT(*)   FILTER (WHERE status='ready' AND deleted_at IS NULL)
bytes_reserved = COALESCE(SUM(declared_size_bytes) FILTER (
                   open session, reservation_released_at IS NULL, expires_at >= now), 0)
```

over all files whose subject matches. Log the before/after delta as
`storage.usage.drift_repaired` with `delta_bytes`; a non-zero delta in
production is a bug worth finding.

### 3.6 A missing quota row — fail to default, not open, not closed

If Storage has no quota row for a subject (entitlement never delivered, or the
outbox is lagging), **create one with `source='default'` and
`limit_bytes = settings.default_org_limit_bytes`** (env
`STORAGE_DEFAULT_ORG_LIMIT_BYTES`, default `5368709120` = 5 GiB), then enforce
normally. Log `storage.quota.missing_entitlement` at **warning** with the
subject.

Rationale: failing closed breaks a paying customer's logo upload because of an
infrastructure hiccup; failing open makes quotas unenforceable by simply not
provisioning. Failing to the platform default does neither, and the warning
makes the gap visible.

For `owner_type='platform'`, `limit_bytes` is `NULL` (unlimited) — the platform
does not bill itself.

### 3.7 Error contract

New code `storage/quota-exceeded`, HTTP **409**.

The client-safe error body stays `{code, message}` per
`.claude/rules/stripe-api-pattern.md` — **do not** add `httpStatus` or a nested
detail object to the error. Instead, **put the real numbers in the message**,
generated server-side:

> `This upload needs 12 MB but only 3.1 MB of the organization's 5 GB storage remains.`

Format bytes with a shared helper. Use SI units with one decimal
(`1.5 GB`, `3.1 MB`) in user-facing prose; use exact byte integers in API
fields and logs. Never mix.

Structured usage for progress bars comes from a **separate read endpoint**
(§4.4 `GET /v1/quotas/{subject_type}/{subject_id}`), not from the error.

Also add `storage/quota-not-found` (404) for admin reads of an unknown subject.

---

## 4. The design — schemas and endpoints (DECIDED)

### 4.1 New tables in `apps/storage-api`

```python
# db/models/quotas.py
class StorageQuota(Base):
    __tablename__ = "storage_quotas"
    __table_args__ = (
        UniqueConstraint("subject_type", "subject_id", name="uq_storage_quotas_subject"),
        Index("ix_storage_quotas_parent_org", "parent_org_id"),
    )
    id: str                      # squota_…
    subject_type: str            # 'organization' | 'user'
    subject_id: str              # opaque core id, no FK
    parent_org_id: str | None    # user subjects: the org whose pool they also draw from
    limit_bytes: int | None      # NULL = unlimited
    max_file_bytes: int | None   # plan per-file ceiling; effective = min(route, this)
    default_user_limit_bytes: int | None   # organization rows only
    source: str                  # 'plan' | 'override' | 'default'
    plan_product_id: str | None  # opaque core product id, display only
    plan_slug: str | None
    plan_name: str | None
    status: str                  # 'active' | 'suspended'
    entitlement_version: int     # monotonic; a lower version is IGNORED
    created_at: int
    updated_at: int


# db/models/usage.py
class StorageUsage(Base):
    __tablename__ = "storage_usage"
    subject_type: str            # composite PK with subject_id
    subject_id: str
    bytes_used: int              # NOT NULL DEFAULT 0
    bytes_reserved: int          # NOT NULL DEFAULT 0
    files_count: int             # NOT NULL DEFAULT 0
    recomputed_at: int | None
    updated_at: int
```

Column additions:

- `storage_files.quota_org_id: str | None` — the org pool this file draws from.
  Equals `owner_id` when `owner_type='organization'`; the acting org when a
  user-owned file is uploaded in an org context; `NULL` otherwise.
- `storage_files.quota_released_at: int | None`
- `storage_upload_sessions.reservation_released_at: int | None`

Add `Index("ix_storage_files_quota_org", "quota_org_id")` and
`Index("ix_storage_files_created_by", "created_by")` — the Console per-member
breakdown (§4.5) aggregates on both and will table-scan without them.

Backfill in the migration: `UPDATE storage_files SET quota_org_id = owner_id
WHERE owner_type = 'organization'`, then a one-shot population of
`storage_usage` from existing `ready` files. Existing rows must not start at
zero — an org with 400 MB already stored must show 400 MB the moment this
deploys.

Storage `status='suspended'` on a quota means **admit nothing**: reject with
`403 storage/quota-suspended`. Reads and deletes still work.

`UploadCreate` (`domains/uploads/schemas.py`) gains an optional
`quota_org_id: str | None`. Validate it with the same `OPAQUE_ID_PATTERN` as
the other opaque ids. For `owner_type='organization'` the server ignores any
supplied value and uses `owner_id` — a client must never be able to point an
org-owned file at a different org's pool.

### 4.2 New tables in `apps/api`

```python
# db/models/plan_entitlements.py
class PlanEntitlement(Base):
    """A typed numeric/boolean entitlement value carried by a plan."""
    __tablename__ = "plan_entitlements"
    __table_args__ = (UniqueConstraint("product_id", "key"),)
    id: str                      # planEntitlement_…
    product_id: str              # FK products.id ON DELETE CASCADE
    key: str                     # e.g. 'storage.included_bytes'
    value_type: str              # 'integer' | 'boolean' | 'string'
    integer_value: int | None    # BigInteger
    boolean_value: bool | None
    string_value: str | None
    created_at: int
    updated_at: int
```

Exactly one typed column may be non-null, matching `value_type` — enforce with
a `CheckConstraint`, modelled on
`db/models/provisioning.py:ProvisioningProperty`'s
`provisioning_properties_typed_value_check`.

```python
# db/models/storage_settings.py
class OrganizationStorageSettings(Base):
    """Console-set overrides that win over the org's plan entitlements."""
    __tablename__ = "organization_storage_settings"
    organization_id: str                      # PK, FK organizations.id CASCADE
    limit_bytes_override: int | None
    max_file_bytes_override: int | None
    default_user_limit_bytes_override: int | None
    status: str                               # 'active' | 'suspended'
    note: str | None                          # why the override exists
    updated_by: str | None                    # console user id
    created_at: int
    updated_at: int


class UserStorageSettings(Base):
    """A per-member cap inside one organization."""
    __tablename__ = "user_storage_settings"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)
    id: str                                   # userStorageSettings_…
    organization_id: str
    user_id: str
    limit_bytes_override: int | None
    updated_by: str | None
    created_at: int
    updated_at: int
```

**Overrides live in core, never in Storage.** Storage is a pure follower with a
single writer, so a re-push can never clobber an override. Console writes
overrides through `@876/admin` → core; core recomputes the effective
entitlement and pushes it to Storage.

```python
# db/models/storage_entitlement_sync.py
class StorageEntitlementOutbox(Base):
    """Durable quota snapshots awaiting delivery to 876 Storage."""
    __tablename__ = "storage_entitlement_outbox"
    # Model on BillingCustomerOutbox: same status machine
    # ('pending'|'processing'|'delivered'|'failed'), attempt_count,
    # available_at, locked_at, delivered_at, last_error, payload_hash,
    # and the ix_..._delivery / ix_..._subject indexes.
    id: str
    event_type: str              # 'storage.quota.ensure'
    subject_type: str            # 'organization' | 'user'
    subject_id: str
    parent_org_id: str | None
    limit_bytes: int | None
    max_file_bytes: int | None
    default_user_limit_bytes: int | None
    plan_product_id: str | None
    plan_slug: str | None
    plan_name: str | None
    status_value: str            # 'active' | 'suspended'  (column name avoids clashing with row status)
    entitlement_version: int
    payload_hash: str | None
    occurred_at: int
    status: str
    attempt_count: int
    available_at: int
    locked_at: int | None
    delivered_at: int | None
    last_error: str | None
    created_at: int
    updated_at: int
```

### 4.3 The effective-entitlement resolver (core)

`apps/api/services/storage_entitlements.py`:

```python
async def resolve_org_storage_entitlement(db, org_id: str) -> StorageEntitlement:
    """Effective storage entitlement for an org: overrides win over plan values.

    Precedence, highest first:
      1. organization_storage_settings.*_override
      2. plan_entitlements on the org's active 876-storage subscription's product
      3. the platform default (core.storage.DEFAULT_ORG_LIMIT_BYTES)
    """
```

`entitlement_version` is `now_unix_seconds()` at enqueue time. Storage compares
it against the stored row and **ignores a strictly lower version**, so
out-of-order delivery cannot regress a limit.

Enqueue a `storage.quota.ensure` whenever any of these happen:

- an organization is provisioned (`services/provisioning.py`)
- an org's `876-storage` subscription is created, has its price changed, is
  canceled, or is reactivated
- `plan_entitlements` for a storage plan are edited in Console — fan out to
  **every org subscribed to that plan**
- an org or user storage override is written or cleared
- the retroactive backfill runs (PR 2.6)

Deduplicate by `payload_hash` exactly like
`services/billing_customer_sync.py` does: an enqueue whose hash matches the
most recent event for the subject is skipped, and an undelivered row is
refreshed in place rather than appended. Without this, every reconcile appends
a duplicate per subject — this bug already happened once with the billing
outbox; do not repeat it.

### 4.4 New Storage endpoints

All under the internal-key `/v1` router unless stated.

| Method | Path                                     | Purpose                                                                                                                                                           |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/v1/quotas/{subject_type}/{subject_id}` | Quota + usage for one subject. For product apps to render a usage bar.                                                                                            |
| `POST` | `/v1/admin/quotas/ensure`                | Idempotent upsert from the core outbox. Ignores a lower `entitlement_version`.                                                                                    |
| `GET`  | `/v1/admin/quotas`                       | List quotas, paginated, filterable by `subject_type` / `status` / usage band.                                                                                     |
| `GET`  | `/v1/admin/usage`                        | List subjects by usage: `ListObject[StorageUsageSummary]`, cursor pagination, `sort=used_desc\|used_asc\|percent_desc`, `status=all\|ok\|near_limit\|over_limit`. |
| `GET`  | `/v1/admin/usage/{org_id}/members`       | Per-member breakdown for one org (§4.5).                                                                                                                          |
| `POST` | `/v1/admin/usage/recompute`              | Drift repair (§3.5).                                                                                                                                              |
| `GET`  | `/v1/admin/files`                        | Admin file list: filter by `owner_type`, `owner_id`, `created_by`, `source_app_id`, `purpose`, `category`, `status`, `include_deleted`. Cursor paginated.         |

`near_limit` means `≥ 80%` and `< 100%` of `limit_bytes`; `over_limit` means
`≥ 100%`. Put those thresholds in one named constant, not scattered literals.

Response shapes follow `.claude/rules/stripe-api-pattern.md`: every resource
carries an `object` discriminator (`"storage_quota"`, `"storage_usage"`,
`"storage_member_usage"`), lists are
`{object: "list", data, has_more, url, total_count}`.

Route docs go in `domains/<domain>/docs.py`, schemas in `schemas.py`, wiring in
`router.py` — never docs prose inside `router.py`.

### 4.5 The per-member breakdown — two different numbers, clearly labelled

`GET /v1/admin/usage/{org_id}/members` returns, per user id:

| Field            | Definition                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `owned_bytes`    | `SUM(size_bytes)` where `owner_type='user' AND owner_id=<user> AND quota_org_id=<org>` — **counts against their cap**  |
| `owned_files`    | count of the same set                                                                                                  |
| `uploaded_bytes` | `SUM(size_bytes)` where `created_by=<user> AND quota_org_id=<org>` — **attribution only, may include org-owned files** |
| `uploaded_files` | count of the same set                                                                                                  |
| `limit_bytes`    | the member cap, or `null` when uncapped                                                                                |

Storage returns **user ids only**. Console resolves names through `$876`. Do
not add a name column to any Storage table.

The Console table must label these columns **"Owned"** and **"Uploaded"** with
a one-line hint that only "Owned" counts against a quota. Getting this wrong
makes the whole feature misleading.

### 4.6 New core endpoints

| Method   | Path                                                     | Auth       | Purpose                                                  |
| -------- | -------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `GET`    | `/organizations/{id}/storage-settings`                   | `AdminDep` | Effective entitlement + raw overrides.                   |
| `PUT`    | `/organizations/{id}/storage-settings`                   | `AdminDep` | Write overrides; enqueues an ensure event.               |
| `DELETE` | `/organizations/{id}/storage-settings`                   | `AdminDep` | Clear overrides back to plan values; enqueues.           |
| `GET`    | `/organizations/{id}/members/{user_id}/storage-settings` | `AdminDep` | A member cap.                                            |
| `PUT`    | `/organizations/{id}/members/{user_id}/storage-settings` | `AdminDep` | Set a member cap; enqueues a user-subject ensure.        |
| `DELETE` | `/organizations/{id}/members/{user_id}/storage-settings` | `AdminDep` | Clear it.                                                |
| `GET`    | `/products/{id}/entitlements`                            | `AdminDep` | Plan entitlement values.                                 |
| `PUT`    | `/products/{id}/entitlements`                            | `AdminDep` | Replace them; fans out ensure events to subscribed orgs. |

### 4.7 The `876-storage` app and its plan

Add to `core/platform_apps.py`:

```python
@dataclass(frozen=True)
class PlatformApp:
    ...
    auto_provision: bool = False   # NEW: every org is subscribed at signup


STORAGE_APP_SLUG = "876-storage"

PlatformApp(
    "876 Storage",
    STORAGE_APP_SLUG,
    "product",
    None,                 # headless: no portal, no sign-in surface
    "storage",
    "none",
    (),
    auto_provision=True,
)
```

Also set `auto_provision=True` on `876-enterprise`, because
`provision_organization()` already subscribes every org to it — that hardcoded
branch becomes the first user of the generic loop (PR 2.3).

`876-storage` is a `product` app (it is sold with plans) with `homepage_url=None`
(it is headless). **Do not invent a new `app_kind`** — that enum is load-bearing
across Console filters and validation, and headlessness is a property of
surfacing, not of kind.

Add to `core/products.py`:

```python
PlatformProduct(
    slug="876-storage-included",
    name="Included",
    app_slug="876-storage",
    prices=[PlatformPrice(unit_amount=0, currency="jmd", billing_interval="month", name="Included")],
),
```

The plan is called **`Included`**. It is not called "Free", "Starter", "Basic",
or "Default" — every organization is on it by construction, so the name states
what it is rather than implying a tier ladder. Console renders it as
`Plan: Included`.

Its entitlement values, in a new `core/plan_entitlements.py` registry seeded
alongside the products:

| key                                | value                 | meaning                                                           |
| ---------------------------------- | --------------------- | ----------------------------------------------------------------- |
| `storage.included_bytes`           | `5368709120` (5 GiB)  | the org pool                                                      |
| `storage.max_file_bytes`           | `104857600` (100 MiB) | per-file ceiling; route ceilings still apply and the smaller wins |
| `storage.default_user_limit_bytes` | _(absent)_            | no member cap by default                                          |

Keep the keys namespaced (`storage.*`) so other apps can add their own numeric
entitlements to the same table without collision.

---

## 5. The PRs — build them in this order

Each entry gives the branch name, the scope, and the required tests. Titles
shown are the PR titles; individual commits inside are yours to split sensibly
per §1.3.

---

### PHASE 1 — Storage service: quota core

Self-contained inside `apps/storage-api`. No other service changes.

#### PR 1.1 — `feat/storage-quota-schema`

**Title:** `feat(storage-api): add quota and usage tables with a backfilled counter`

- `db/models/quotas.py`, `db/models/usage.py` per §4.1; register in
  `db/models/__init__.py`.
- Column additions to `storage_files` and `storage_upload_sessions` per §4.1,
  plus the two new indexes.
- One Alembic migration `202607280001_create_storage_quota_tables.py` with a
  working `downgrade()`. It must:
  - create both tables and add all four columns,
  - backfill `quota_org_id = owner_id` for organization-owned files,
  - populate `storage_usage` from existing `ready`, non-deleted files.
- `db/repositories/quotas.py` — `get`, `get_many`, `ensure_default`,
  `upsert_from_entitlement` (version-guarded), `list` with filters.
- `db/repositories/usage.py` — `lock_for_update(subjects)`, `reserve`,
  `commit_reservation`, `release_reservation`, `release_usage`, `recompute`,
  `list_summaries`, `member_breakdown`.
- `core/config.py`: `default_org_limit_bytes` (`STORAGE_DEFAULT_ORG_LIMIT_BYTES`,
  default `5368709120`), `near_limit_percent` (default `80`).

**Tests (`tests/test_quota_repositories.py`):** row creation and uniqueness;
version-guarded upsert ignoring a lower `entitlement_version` and applying an
equal-or-higher one; `ensure_default` idempotence; reserve/commit/release
arithmetic; the zero clamp on underflow; `recompute` producing the right totals
from a mixed fixture of ready / pending / failed / soft-deleted files;
`member_breakdown` distinguishing owned from uploaded. Migration upgrade +
downgrade round-trip against the test database.

#### PR 1.2 — `feat/storage-quota-enforcement` — DEPENDS ON 1.1

**Title:** `feat(storage-api): reject an upload that would exceed a storage quota`

- `domains/uploads/router.py`: implement §3.4 steps 1–6 in `create_upload`,
  before any provider call.
- `domains/uploads/schemas.py`: `quota_org_id` on `UploadCreate`, ignored for
  organization owners.
- `core/errors.py` / docs: `storage/quota-exceeded` (409),
  `storage/quota-suspended` (403).
- A `core/bytes.py` helper formatting byte counts for the message in §3.7.
- `complete_upload`: convert the reservation on success, release it on every
  failure branch, guarded by `reservation_released_at`.
- Observability: `storage.quota_rejected` (warning, with subject, limit, used,
  requested), `storage.quota.missing_entitlement` (warning),
  `storage.usage.underflow` (warning). Follow `core/observability.py`'s existing
  `log_storage_event` shape.

**Tests (`tests/test_quota_enforcement.py`) — all required:**

1. An upload that fits is admitted and reserves exactly `size_bytes`.
2. An upload that exactly reaches the limit is admitted (boundary: `≤`, not `<`).
3. An upload one byte over is rejected with `409 storage/quota-exceeded`.
4. A rejected upload creates **no** file row, **no** session row, and calls the
   provider **zero** times. Assert the provider mock's call count is 0.
5. The rejection message names the requested, remaining, and total bytes.
6. Two concurrent admissions that individually fit but jointly exceed: exactly
   one is admitted. Drive this through two real concurrent sessions/transactions
   so the `FOR UPDATE` is genuinely exercised — a sequential test does not prove
   anything here.
7. A user-owned file with `quota_org_id` set is checked against **both** the
   member cap and the org pool; rejection by either is a rejection.
8. A user-owned file whose member cap fits but whose org pool does not is rejected.
9. An organization-owned upload does **not** consume the uploader's member cap.
10. A supplied `quota_org_id` is ignored when `owner_type='organization'`.
11. `limit_bytes = NULL` admits an arbitrarily large (route-legal) upload.
12. `status='suspended'` rejects with `403 storage/quota-suspended`.
13. Missing quota row → row created with `source='default'`, enforcement
    proceeds at the configured default, warning logged.
14. Per-file ceiling is `min(route.max_size_bytes, quota.max_file_bytes)` — a
    file over the plan ceiling but under the route ceiling is rejected 413, and
    vice versa.
15. Completion moves bytes from reserved to used using the **verified** length.
16. Every completion failure path releases the reservation: object missing,
    size mismatch, content-type mismatch, expired session, provider error.
17. Completing an already-completed session (idempotent replay) does **not**
    double-count.
18. Calling a release path twice decrements exactly once
    (`reservation_released_at` guard).
19. After a rejected upload, a subsequent smaller upload that fits is admitted —
    the failed attempt left no reservation behind.

#### PR 1.3 — `feat/storage-quota-reclamation` — DEPENDS ON 1.2

**Title:** `feat(storage-api): release reserved and used bytes when files expire or are deleted`

- Expired-session release in `domains/maintenance/reclamation.py` and the
  `/internal/storage-sweep` response counters.
- `DELETE /v1/files/{id}` decrements `bytes_used` / `files_count`, guarded by
  `quota_released_at`, for both soft and hard deletion modes.
- Recompute pass in the sweep for the least-recently-recomputed subjects.
- `scripts/cleanup_storage.py` reports released bytes in its dry run.

**Tests:** expired session releases exactly once and is not released again on a
second sweep; a completed session is never released by the sweep; soft delete
decrements and a second delete does not; hard delete decrements; drift repair
corrects an artificially corrupted counter and logs the delta; recompute is a
no-op when the counter is already correct.

#### PR 1.4 — `feat/storage-quota-admin-api` — DEPENDS ON 1.3

**Title:** `feat(storage-api): expose quota, usage, and file administration endpoints`

- `domains/quotas/{router,schemas,docs}.py` and
  `domains/usage/{router,schemas,docs}.py` per §4.4–§4.5; extend
  `domains/files/router.py` with the admin list.
- Wire into `api/v1.py`.

**Tests:** the auth matrix (no key / wrong key / scheduler key on an internal
route → 401) extending `tests/test_auth_matrix.py`; `ensure` idempotence and
version guarding through the HTTP layer; usage list pagination, sorting, and
each status band including the exact 80% and 100% boundaries; member breakdown
separating owned from uploaded; file list filters including `include_deleted`;
`tests/test_openapi_security.py` and `test_architecture_invariants.py` still
pass with the new routes.

---

### PHASE 2 — Core: 876 Storage as a provisioned platform service

#### PR 2.1 — `feat/api-plan-entitlements`

**Title:** `feat(api): give plans typed numeric entitlement values`

- `db/models/plan_entitlements.py` per §4.2, with the typed-value check
  constraint; register in `db/models/__init__.py`.
- `db/repositories/plan_entitlements.py`.
- `core/plan_entitlements.py` — the canonical registry, mirroring the shape of
  `core/products.py`.
- Seeding in `services/plan_seeds.py`, plus a `BootstrapStep`.
- `domains/products/` routes from §4.6 with `docs.py` entries.
- `packages/admin`: `$876.products.entitlements.{list,replace}()` in
  `src/resources/products.ts`.

**Tests:** the check constraint rejects a mismatched typed value and a
multiply-populated row; unique `(product_id, key)`; seeds are idempotent across
two runs; seeds never overwrite an administrator's edit (follow the
`seed_platform_plan_modules` precedent — bootstrap data is created once, then
Console owns it); route auth; `@876/admin` method contract tests.

#### PR 2.2 — `feat/api-storage-platform-app` — DEPENDS ON 2.1

**Title:** `feat(api): register 876 Storage as a headless auto-provisioned platform app`

- `auto_provision` on `PlatformApp`; `876-storage` entry; `STORAGE_APP_SLUG`.
- `876-storage-included` in `core/products.py` and its entitlement values in
  `core/plan_entitlements.py`.
- Bump the affected `BootstrapStep` revisions so existing environments re-run
  the seeds.

**Tests:** the app and product seed idempotently; `get_platform_app` resolves
the slug; the seeded plan carries exactly the three entitlement keys with the
documented values; `feature_prefix_for_app_slug('876-storage') == 'storage'`.

#### PR 2.3 — `refactor/api-centralized-auto-provisioning` — DEPENDS ON 2.2

**Title:** `refactor(api): provision every auto-provisioned app from one loop`

Replace the hardcoded Enterprise block in
`services/provisioning.py:provision_organization()` with a loop over
`[app for app in PLATFORM_APPS if app.auto_provision]`, subscribing the org to
each on that app's default price. This is the centralization the platform
needs: adding a future globally-included service becomes one flag, not another
hardcoded branch.

Keep the existing behavior exactly: idempotent, a missing app row logs an error
and does **not** fail signup, and `enqueue_customer_ensure_for_organization`
still runs.

**Tests:** a new org gets subscriptions to both Enterprise and Storage; calling
`provision_organization` twice creates no duplicates; a missing app row logs and
continues without raising; the app with no default price still gets a
subscription with no price item (matching today's `PriceRepository.get_default_for_app`
returning `None` path).

#### PR 2.4 — `feat/api-org-storage-settings` — DEPENDS ON 2.2

**Title:** `feat(api): let Console override an organization's storage limits`

- `db/models/storage_settings.py` per §4.2 + migration/bootstrap step.
- `services/storage_entitlements.py:resolve_org_storage_entitlement` and
  `resolve_user_storage_entitlement` per §4.3.
- `domains/organizations/` routes from §4.6, `AdminDep`, with `docs.py`.
- `packages/admin`: `$876.orgs.storageSettings.{retrieve,update,delete}()` and
  `$876.orgs.members.storageSettings.*`. Follow the
  `<resource>.<verb>()` vocabulary — **never** `getStorageSettings` or
  `findByOrg` (`.claude/rules/sdk-conventions.md` bans those prefixes).

**Tests:** each precedence rung of the resolver in isolation and in
combination; clearing an override falls back to the plan value, not to zero;
suspending an org resolves to `status='suspended'`; a member cap larger than the
org pool is accepted and stored but the admission rule still enforces the pool
(add a unit test asserting the resolver does not silently clamp — clamping is
the enforcement layer's job, and doing it in two places is how the two drift);
route auth; `@876/admin` contract tests.

#### PR 2.5 — `feat/api-storage-entitlement-outbox` — DEPENDS ON 2.4

**Title:** `feat(api): deliver storage entitlements to the Storage service durably`

- `db/models/storage_entitlement_sync.py` per §4.2 + migration/bootstrap step.
- `services/storage_entitlement_sync.py` — payload builder, hash-deduplicated
  `enqueue_storage_quota_ensure(...)`, and the fan-out helpers.
- `services/storage_entitlement_dispatch.py` — the worker, modelled line for
  line on `services/billing_customer_dispatch.py`: claim with
  `FOR UPDATE SKIP LOCKED`, stale-lock recovery after 5 minutes, exponential
  backoff on failure, `configured=False` when settings are absent.
- `core/config.py`: `storage_url` (`STORAGE_URL`), `storage_internal_key`
  (`STORAGE_INTERNAL_KEY`).
- Start the worker in `main.py:lifespan` next to the existing two, guarded on
  both settings being present, and cancelled cleanly on shutdown.
- `scripts/reconcile_storage_entitlements.py` — dry-run by default, `--apply`
  to enqueue; must not create duplicates when run repeatedly.
- Enqueue at every trigger listed in §4.3.

**Tests:** payload hashing is stable across equal snapshots and differs on any
changed field; re-enqueueing an unchanged snapshot adds no row; re-enqueueing a
changed snapshot while one is still undelivered **updates in place** rather than
appending; the dispatcher marks delivered on 2xx, retries with backoff on 5xx,
and records `last_error`; a stale `processing` lock is reclaimed; the worker is
a no-op with a `configured=False` summary when `STORAGE_URL` is unset; the
reconcile script is idempotent across two runs.

#### PR 2.6 — `feat/api-storage-retroactive-provisioning` — DEPENDS ON 2.5, 2.3

**Title:** `feat(api): provision every existing organization onto the storage plan`

A `BootstrapStep("storage_provisioning_backfill", 1, backfill_storage_provisioning)`
placed **after** `platform_products` and `platform_plan_modules` in
`get_bootstrap_steps()`. For every existing organization:

1. Ensure a `876-storage` subscription on the `Included` plan's default price
   (skip orgs that already have one, whatever plan it is on).
2. Enqueue a `storage.quota.ensure`.

This runs regardless of which other apps the org is entitled to — storage is
included globally. Model it on
`services/plan_seeds.py:backfill_billing_plan_assignments`, including its
tolerance for a missing app/product row (log an error, return; never raise and
break startup).

**Tests:** an org with no storage subscription gets one; an org that already has
one is untouched; an org already on a different storage plan is not moved; the
step is idempotent across two runs and enqueues no duplicate events on the
second; a missing `876-storage` product logs and returns without raising.

---

### PHASE 3 — Client packages

#### PR 3.1 — `feat/storage-admin-client` — DEPENDS ON 1.4

**Title:** `feat(storage): add the server-only Storage admin client subpath`

Per `.claude/rules/sdk-conventions.md`, the product admin surface is a
**subpath, not a consumer export**:

- `packages/storage/package.json` gains an `"./admin"` export.
- `packages/storage/src/admin/{client,index}.ts` exporting
  `create876StorageAdminClient`, composed from
  `src/admin/resources/{quotas,usage,files}.ts` over the existing runtime.
- Zod schemas in `src/types/{quotas,usage}.ts`.
- Verbs: `quotas.retrieve`, `quotas.list`, `usage.list`, `usage.listMembers`,
  `usage.recompute`, `files.list`. **No** `getX`/`findX`/`fetchX`.
- JSDoc in the established house style — see `src/resources/uploads.ts`, which
  is the reference for tone, `@example` blocks, and the "errors are values"
  note.

**Tests:** mirror the existing `packages/storage/src/*.test.ts` suites —
request shape per method, schema rejection of a malformed response, error
propagation as values, and an `index.exports.test.ts`-style assertion that the
admin surface is exactly the intended set of methods and that no admin resource
leaks into the default export.

#### PR 3.2 — `feat/storage-quota-read-surface` — DEPENDS ON 3.1

**Title:** `feat(storage): expose an organization's remaining storage to product apps`

- `$storage.quotas.retrieve(subjectType, subjectId)` on the **default** client
  (it is internal-key tier already, and product apps legitimately need to render
  remaining space).
- Couriers: a route handler `GET /api/manage/settings/storage-usage` behind
  `getManageContext`, and the org-profile page showing
  "1.2 GB of 5 GB used" beneath the logo uploader.

**Tests:** client contract tests; the Couriers route handler authorizes before
calling and returns 401/403 correctly; the component renders the figure and
degrades silently when the read fails (a failed usage read must never block the
uploader).

---

### PHASE 4 — Console

Follow `.claude/rules/app-layout.md` exactly: `Page` container with
`px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `ResourceToolbar` on list pages,
`StatusFilterHeading` for status filters with the value threaded into the
**server-side list call** (never client-side filtering), `PageBreadcrumb` on
sub-routes, bare-verb button labels, no green buttons, and **no explanatory
paragraph under a heading** (root `CLAUDE.md` "UI Copy").

Console reads usage from `@876/storage/admin` (`$storage` in
`apps/console/src/lib/storage.ts`) and reads/writes overrides through `$876`
(`@876/admin`). Mutations go through Console route handlers that call
`requireConsolePermission` first — no server actions.

#### PR 4.1 — `feat/console-storage-overview` — DEPENDS ON 3.1

**Title:** `feat(console): add a platform storage overview`

`/storage` — total stored bytes, file count, count of orgs near and over limit,
and the top consumers. Sidebar entry with a real `href`.

#### PR 4.2 — `feat/console-storage-organizations` — DEPENDS ON 4.1

**Title:** `feat(console): list and inspect per-organization storage usage`

`/storage/organizations` (list, `StatusFilterHeading` with
`all | ok | near_limit | over_limit`, cursor pagination) and
`/storage/organizations/[orgId]` (usage bar, plan, per-member breakdown with
the **Owned / Uploaded** columns from §4.5, recent files). Resolve org and user
names through `$876`; batch those lookups — one call per row is a review
rejection.

#### PR 4.3 — `feat/console-storage-overrides` — DEPENDS ON 4.2, 2.4

**Title:** `feat(console): let admins override an organization's storage limits`

Override form on the org detail page (limit, per-file ceiling, default member
cap, suspend, note), a per-member cap control, and a Recompute action. Route
handlers under `apps/console/src/app/api/storage/…`, permission-gated, calling
`$876` for overrides and `$storage` for recompute. Byte inputs accept
human units (`5 GB`) and store exact integers — write the parser as a tested
pure helper, not inline in the component.

#### PR 4.4 — `feat/console-org-storage-tab` — DEPENDS ON 4.3

**Title:** `feat(console): surface storage on the organization detail page`

`/orgs/[slug]/storage`, reusing the Phase 4.2/4.3 components rather than
duplicating them. Add it to the org layout's tabs.

#### PR 4.5 — `feat/console-plan-entitlements-editor` — DEPENDS ON 2.1

**Title:** `feat(console): edit numeric plan entitlements`

Entitlement editing on `/apps/[slug]/plans/[planId]`, driven by the entitlement
key registry so a new key needs no Console change. Saving fans out ensure
events (core side, PR 2.5) — surface a note that the change applies to every
subscribed organization.

**Console tests:** every route handler's auth path (unauthenticated,
insufficient permission, success), the byte parser/formatter helpers
exhaustively (including `0`, exact powers, fractional units, invalid input, and
the security corpus from `.claude/rules/testing.md`), status-filter resolution
including an unknown value falling back to `all`, and that the filter value
reaches the list call rather than filtering rows in the page.

---

### PHASE 5 — Couriers

#### PR 5.1 — `feat/couriers-storage-quota-errors` — DEPENDS ON 1.2

**Title:** `feat(couriers): explain a rejected upload when storage is full`

- `storage/quota-exceeded` (409) and `storage/quota-suspended` (403) in
  `apps/couriers/src/lib/errors/storage.ts`.
- The organization-logo uploader surfaces the server's message verbatim — it
  already carries the real numbers (§3.7), so do **not** replace it with a
  generic string.

Note: this branch touches
`apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/organization-logo-upload.tsx`,
which was rebuilt in PR #71. Branch from an up-to-date `main` and preserve that
component's structure: the `putDirectToStorage` transport seam, the progress
ring, the drag state, and the existing test mocks.

**Tests:** each new code maps to the right status and message; the uploader
renders a quota rejection distinctly from a validation rejection.

---

### PHASE 6 — Documentation

#### PR 6.1 — `docs/storage-quota-operations`

**Title:** `docs(storage): document quota operations, drift repair, and provisioning`

`docs/` runbook: what the counters mean, how to read a quota rejection in logs,
how to recompute drift, how to grant an override, how to reconcile entitlements,
and the environment variables added (`STORAGE_DEFAULT_ORG_LIMIT_BYTES`,
`STORAGE_URL`, `STORAGE_INTERNAL_KEY` on the API side). Update
`docs/cloudflare.md`'s production key inventory and
`scripts/check-worker-secrets.mjs`'s manifest with any new required secret.

#### PR 6.2 — `docs/storage-architecture-quota-model`

**Title:** `docs(rules): document the storage quota and attribution model`

Extend `.claude/rules/storage-architecture.md` with a "Quotas and attribution"
section covering §3 of this brief: owner vs uploader, pooled-with-optional-caps,
the reservation protocol, fail-to-default, and the delete-releases-quota
decision. **Mirror the edit into `.agents/rules/` and `.grok/rules/`** — the
root `CLAUDE.md` requires all three trees to stay in sync.

---

## 6. Cross-cutting requirements

### 6.1 Testing standards

`.claude/rules/testing.md` is binding, and its Prime Directive applies: every
test must be able to fail. Specifically for this work:

- Assert **exact** byte figures, never `toBeGreaterThan`.
- Assert **exact** call counts on provider mocks, especially the zero-call
  assertion on a rejected upload.
- Assert both `data` and `error` on every `{data, error}` result.
- Test the boundaries explicitly: exactly at the limit, one byte over, one byte
  under, zero bytes, and the 80%/100% band edges.
- For the concurrency test, use genuinely concurrent transactions. A test that
  calls the admission path twice in sequence proves nothing about the lock.

### 6.2 Observability

Every rejection, default-quota creation, drift repair, underflow clamp, and
outbox delivery failure emits a structured event through the service's existing
logger (`core/observability.py` in Storage, `core/logging.py` in the API). A
quota rejection that is invisible in logs is an unsupportable feature.

### 6.3 Security invariants — non-negotiable

- A client never chooses `limit_bytes`, `quota_org_id` for an org-owned file,
  `source`, `entitlement_version`, `category`, `audience`, or an object key.
- Quota endpoints are internal-key only. Nothing quota-related is reachable from
  a browser except through an app's own authorizing route handler.
- `STORAGE_INTERNAL_KEY` and `API_INTERNAL_KEY` never reach client bundles. Any
  new module touching them starts with `import 'server-only'`.
- Storage never queries the identity database, and the identity API never
  queries the Storage database.

### 6.4 Where you may exercise judgement

Add tests beyond the required list wherever you see a branch that could silently
break. Decompose functions as you see fit. Choose log field names. Improve a
docstring you find inaccurate. If you spot a real defect **outside** this work
while passing through, do not fix it inline — open a separate small PR with its
own branch and say so in the body, per §1.1.

---

## 7. Definition of done

- All 21 PRs from §5 are open against `main`, each on its own branch, none
  merged.
- Every PR's checks are green and `mergeable` is not `CONFLICTING`.
- No commit or PR body anywhere contains AI attribution.
- `apps/storage-api` and `apps/api`: `ruff`, `mypy`, and `pytest` all pass.
- `@876/storage`, `@876/admin`, `@876/console`, `@876/couriers`: `typecheck`,
  `test`, and `lint` all pass.
- Every "Tests (required)" item in §5 exists as a real, failing-if-broken test.
- This brief is committed (it is part of PR 1.1).
