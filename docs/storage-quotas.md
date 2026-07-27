# Storage Quotas — Operations Runbook

Companion to `.claude/rules/storage-architecture.md` and the design spec at
`.claude/briefs/codex/2026-07-27-storage-quotas-and-entitlements.md` §§3–4.

---

## Counters

Every quota subject (`organization` or `user`) has one `storage_usage` row.

| Column           | Counts                                                                | When it moves                                               |
| ---------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `bytes_used`     | `SUM(size_bytes)` of `ready`, non-deleted files owned by this subject | +N on verified completion; −N on soft or hard delete        |
| `bytes_reserved` | `SUM(declared_size_bytes)` of open upload sessions not yet released   | +N when a signed URL is issued; −N on completion or failure |
| `files_count`    | Count of `ready`, non-deleted files owned by this subject             | +1 on verified completion; −1 on soft or hard delete        |

**Why the reservation exists.** R2 does not support presigned POST policies, so
size cannot be enforced at the edge. Instead, the declared size is locked into
the counter at URL-signing time (inside a `SELECT … FOR UPDATE` transaction).
Two concurrent 3 GiB admissions against a 5 GiB pool serialize; the second is
rejected before any bytes are written. Without the reservation, both would
appear to fit and the pool would overflow.

Effective usage at any moment is `bytes_used + bytes_reserved`. The admission
check enforces this sum, not `bytes_used` alone.

---

## Owner vs uploader

| Column                | Meaning                                      | Counts against quota? |
| --------------------- | -------------------------------------------- | --------------------- |
| `owner_type/owner_id` | The quota-bearing entity                     | **Yes**               |
| `created_by`          | The user who performed the upload (uploader) | No — visibility only  |

**Worked example — organization logo.**

An org logo has `owner_type='organization'`, `owner_id=<org>`, and
`created_by=<the user who clicked Upload>`. Consequences:

- Every byte counts against the **organization pool**, not the uploader's member
  cap.
- Console can still show who uploaded it (`created_by`).
- The uploader's individual usage figure is unaffected.

This is intentional. An org-owned file is the org's storage, regardless of
which member uploaded it. Never display `created_by` figures as quota
consumption — they are attribution only.

**User-owned file inside an org context.**

A user's own file has `owner_type='user'`, `owner_id=<user>`, and
`quota_org_id=<org>`. Its bytes count against **both** the member cap (if set)
and the org pool. The smaller of the two limits wins at admission time.

---

## Pooled storage and member caps

Both platform models use the same two dials on `storage_quotas`:

| Model           | `limit_bytes` on org quota | `default_user_limit_bytes` on org quota |
| --------------- | -------------------------- | --------------------------------------- |
| Pooled only     | e.g. `5368709120` (5 GiB)  | `NULL` — no per-user cap                |
| Per-user quotas | org pool limit             | per-user cap; materializes a member cap |

A member cap is an **additional constraint carved out of the pool**, not a
replacement for it. An org-owned file (logo, invoice PDF) always draws from the
pool and never from a member cap, even when member caps are active.

`limit_bytes = NULL` on any subject means unlimited for that subject.

---

## Reading quota events in logs

All events flow through `core/observability.py:log_storage_event` in
`apps/storage-api`.

### `storage.quota_rejected`

Level: **warning**

An upload was denied because a subject had insufficient headroom.

| Field       | Value                                           |
| ----------- | ----------------------------------------------- |
| `subject`   | `{type, id}` of the failing subject             |
| `limit`     | `limit_bytes` of that subject's quota           |
| `used`      | `bytes_used + bytes_reserved` at rejection time |
| `requested` | `declared_size_bytes` from the upload request   |

**Action.** Usually self-explanatory: the org or user is over quota. If the
limit looks wrong, check the quota row (`GET /v1/quotas/{type}/{id}`) and
compare against what core delivered — `source` and `entitlement_version` on the
row tell you which event set it. If `source='default'` and you expected a plan
value, the outbox has not delivered yet (see below).

### `storage.quota.missing_entitlement`

Level: **warning**

Storage had no quota row for a subject. It created one with `source='default'`
and `limit_bytes = STORAGE_DEFAULT_ORG_LIMIT_BYTES`, then enforced normally.

| Field     | Value                       |
| --------- | --------------------------- |
| `subject` | `{type, id}` of the subject |

**Action.** A missing quota row means the `storage_entitlement_outbox` in
`apps/api` has not delivered the org's entitlement yet, or the org was
provisioned before the outbox existed. Run the reconcile script (see below) to
enqueue a delivery. A single occurrence at org creation during a brief startup
lag is expected; repeated occurrences on the same subject are a delivery
failure.

### `storage.usage.underflow`

Level: **warning**

A counter decrement would have gone negative. The value was clamped to zero
(`GREATEST(bytes_used - :n, 0)` in SQL).

**Action.** An underflow means a release path ran more than once for the same
session or file. The `reservation_released_at` / `quota_released_at` guard
should prevent this; an underflow in production indicates the guard was
bypassed. Investigate the session or file ID in the log, check the
`reservation_released_at` column, and run `recompute` to restore the counter to
ground truth.

### `storage.usage.drift_repaired`

Level: **info** (non-zero `delta_bytes` is escalated to **warning**)

`POST /v1/admin/usage/recompute` completed. Emitted whether or not a
correction was made.

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| `subject`     | `{type, id}`                                       |
| `delta_bytes` | Signed difference between old and new `bytes_used` |

**Action.** A non-zero delta in production is a bug. It means at least one
release path did not run, ran twice, or ran with the wrong value. File an
incident, capture the `delta_bytes`, and investigate recent sessions and deletes
for that subject.

---

## Counter drift — when to suspect it and how to repair

Counters are a cache. They can drift if:

- A process crashed between writing a file status and updating the counter.
- A release path was invoked with an `UPDATE … WHERE reservation_released_at IS
NULL` that silently matched zero rows (i.e., the guard worked, but the caller
  did not check the row count and a prior run already released).
- A migration backfill ran on stale data.

**Signals of drift.**

- `storage.usage.underflow` events in logs.
- `bytes_used + bytes_reserved` on the `storage_usage` row diverges from what
  `GET /v1/quotas/{type}/{id}` shows for `used_bytes` vs a manual `SELECT
SUM(size_bytes)` over `storage_files`.
- Admission rejections on an org that the admin asserts has plenty of space.

**Repair.**

```bash
# Recompute one subject
curl -X POST https://<storage-internal>/v1/admin/usage/recompute \
  -H "x-internal-key: $STORAGE_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"subject_type": "organization", "subject_id": "org_abc123"}'

# Recompute the N least-recently-recomputed subjects (used by the sweep)
curl -X POST https://<storage-internal>/v1/admin/usage/recompute \
  -H "x-internal-key: $STORAGE_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"all": true, "limit": 50}'
```

Recompute is a full recalculation from `storage_files` and open
`storage_upload_sessions`. It is safe to run at any time — it takes a row-level
lock on the subject and produces the correct value regardless of current counter
state. The `storage.usage.drift_repaired` event records the before/after delta.

The maintenance sweep runs a batch recompute automatically on the N
least-recently-recomputed subjects. If you suspect widespread drift, trigger it
via `POST /internal/storage-sweep` (scheduler-key auth) or run the full
recompute against `{"all": true}`.

---

## Granting an organization an override

Overrides live in `apps/api` (`organization_storage_settings` table), **never**
in the Storage service. Storage is a pure follower with a single writer (the
outbox worker). Console writes overrides through `@876/admin` → core; core
recomputes the effective entitlement and pushes it to Storage via the outbox.
A direct write to the `storage_quotas` table in the Storage database would be
clobbered on the next delivery.

**Via Console.** `/storage/organizations/[orgId]` → override form. Fields:
`limit_bytes`, `max_file_bytes`, `default_user_limit_bytes`, `status`, `note`.

**Via the admin API directly.**

```bash
curl -X PUT https://<api-internal>/organizations/<org_id>/storage-settings \
  -H "x-internal-key: $API_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "limit_bytes_override": 10737418240,
    "max_file_bytes_override": null,
    "default_user_limit_bytes_override": null,
    "status": "active",
    "note": "doubled for migration window"
  }'
```

Saving the override enqueues a `storage.quota.ensure` event on the outbox.
Delivery is asynchronous (the asyncio worker in `apps/api`). The Storage quota
row reflects the new limit once the worker delivers the event. Check delivery
by polling `GET /v1/quotas/organization/<org_id>` on the Storage service until
`source='override'` (or `source='plan'` if clearing to plan values) and
`entitlement_version` advances.

**Precedence (highest first):**

1. `organization_storage_settings.*_override` — Console-set override.
2. `plan_entitlements` on the org's active `876-storage` subscription.
3. Platform default (`STORAGE_DEFAULT_ORG_LIMIT_BYTES`).

Clearing an override (`DELETE /organizations/<id>/storage-settings`) falls back
to the plan value, not to zero or to the platform default.

**Suspending an org.** Set `status='suspended'` in the override. All new
uploads are rejected with `403 storage/quota-suspended`. Reads and deletes
still work — only admission is blocked.

---

## How entitlements reach Storage

```
apps/api                               apps/storage-api
────────                               ────────────────
org provisioned / plan changed /       POST /v1/admin/quotas/ensure
override written                  ───► (idempotent upsert, version-guarded)
       │
       ▼
storage_entitlement_outbox
(pending → processing → delivered)
       │
       ▼
storage_entitlement_dispatch worker
(asyncio, started in main.py:lifespan,
 guarded on STORAGE_URL + STORAGE_INTERNAL_KEY)
```

**The outbox** (`storage_entitlement_outbox` in `apps/api`) is modelled on
`BillingCustomerOutbox`. Each row carries a `payload_hash`; an enqueue whose
hash matches the most recent event for the subject is skipped, and an
undelivered row is refreshed in place rather than appended. The worker claims
rows with `FOR UPDATE SKIP LOCKED`, retries with exponential backoff on 5xx,
and marks `delivered` on 2xx. A stale `processing` lock (> 5 minutes) is
reclaimed automatically.

**The reconcile script.** `scripts/reconcile_storage_entitlements.py` audits
every organization and enqueues a `storage.quota.ensure` for any whose
delivered quota row is absent or stale. Dry-run by default; pass `--apply` to
enqueue.

```bash
# Dry run — shows what would be enqueued
python scripts/reconcile_storage_entitlements.py

# Enqueue missing/stale deliveries
python scripts/reconcile_storage_entitlements.py --apply
```

Safe to run repeatedly; deduplication prevents duplicate rows.

**If the worker is not running** (check `STORAGE_URL` and
`STORAGE_INTERNAL_KEY` are set in `apps/api`'s environment), the outbox will
accumulate rows but nothing is delivered. The worker logs `configured=False` at
startup and is a no-op. Set both variables and restart the process.

---

## Environment variables

### `apps/storage-api`

| Variable                          | Default              | Meaning                                                                |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `STORAGE_DEFAULT_ORG_LIMIT_BYTES` | `5368709120` (5 GiB) | Quota assigned when Storage has no row for a subject. Never zero.      |
| `STORAGE_NEAR_LIMIT_PERCENT`      | `80`                 | Threshold above which a subject is `near_limit` in usage list queries. |

### `apps/api` (identity core)

| Variable               | Meaning                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `STORAGE_URL`          | Internal base URL of `apps/storage-api`. Required for outbox delivery.      |
| `STORAGE_INTERNAL_KEY` | Value sent as `x-internal-key` when calling `POST /v1/admin/quotas/ensure`. |

Both must be set for the entitlement worker to start. The worker logs
`configured=False` and becomes a no-op when either is absent — no crash, but
no delivery.
