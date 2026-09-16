# Brief — 876 Storage hardening (Phase 4)

**Tool:** `codex exec`, model `gpt-5.6-sol`, `model_reasoning_effort=high`.
**Branch:** `feat/876-storage-hardening` (already checked out — do **not** switch
branches, do **not** commit, do **not** push. The orchestrator commits.)

## Goal

876 Storage works and is tested, but it is not yet **operable**: when an upload
fails in production, nothing tells you why, nothing records who did it, and the
reclamation script never runs because nothing schedules it. Close those three
gaps so the service can be run and diagnosed, not just executed.

Phases 1–3 are merged to `main`. This is hardening only — **do not add features,
do not change the HTTP contract, and do not touch the Couriers UI.**

## Read first

1. `.claude/rules/storage-architecture.md` — the design, especially the
   prohibitions. **Never log a signed URL, credential, object key, or bucket.**
2. `.claude/rules/api-backend.md` — route/schema/docs structure, `AppHTTPException`.
3. `.claude/rules/deletions.md` — tombstones; `purged_at` already marks reclaimed rows.
4. `docs/storage.md` — the runbook you will be making true.
5. `apps/api/core/logging.py` and any `audit_events` handling in `apps/api` —
   match the platform's existing shapes rather than inventing new ones.

## Current state (verified — do not re-derive)

- `apps/storage-api/core/logging.py` exists but **has no call sites at all** in
  `domains/` or `providers/`.
- There is **no audit trail** of any kind in the service.
- `scripts/cleanup_storage.py` exists (dry-run by default, `--apply` to delete,
  sets `purged_at`) but **nothing schedules it** — `wrangler.jsonc` has no
  `triggers.crons` and `worker/index.ts` has no `scheduled` handler.
- Upload session statuses in use: `created`, `completed`, `expired`, `failed`.

## What to build

### 1. Structured logging with operational context

Add logging at the points an operator actually needs: upload session created,
completion verified, completion rejected (with the reason), object reclaimed,
and every provider error.

Each line carries: request id, source app id, actor id, owner id, file id,
upload session id, route key, and error code where relevant.

**Never log:** signed URLs (upload or read), R2 credentials, the object key, the
bucket name, or the original filename. Those are either secrets or
fingerprintable storage layout. If a message would be useless without one, log
the file id instead — it resolves to everything else through the database.

Prefer the request-id propagation the platform already uses; do not invent a
second correlation mechanism.

### 2. Audit events for mutations

Record an append-only audit row for each state-changing operation: upload
session created, file became ready, file failed verification, file soft-deleted,
file purged.

Store actor, source app, owner, file id, action, outcome, and timestamp (Unix
seconds). Follow `apps/api`'s `audit_events` shape where it fits; if this service
needs its own table, add it with an Alembic migration that follows the existing
guarded pattern in `migrations/versions/`.

Audit writes must **not** be able to fail a user-facing request — a failed audit
write is logged, not raised.

### 3. Actually schedule the cleanup

`scripts/cleanup_storage.py` is dead code until something runs it. Wire it up:

- Add a `scheduled` handler to `apps/storage-api/worker/index.ts` and a
  `triggers.crons` entry to `wrangler.jsonc`, following how
  `apps/billing-api` does its sweep (it routes `/_cron/...` to a scheduler
  container instance).
- Expose the sweep as an internal endpoint guarded by its **own** key — reuse
  the pattern billing-api uses for `x-scheduler-key`, not the service key. A
  scheduler credential must not be able to perform ordinary storage operations.
- Daily is the right cadence; reclamation is not urgent and R2 deletes cost
  nothing to defer.
- The endpoint must be safe to run concurrently with itself (a slow sweep
  overlapping the next tick must not double-delete or crash).

### 4. Metrics counters

Emit counters for: uploads created, completions verified, completions rejected
by reason, provider errors by operation, objects reclaimed, and bytes uploaded.
If the service has no metrics sink yet, structured log lines with a stable event
name are acceptable — do **not** add a new observability dependency.

## Tests

Extend `apps/storage-api/tests/`. Cover at minimum:

- a signed URL, credential, bucket, and object key never appear in emitted log
  output (assert against captured logs — this is the important one);
- an audit row is written for create, ready, failed, delete, and purge;
- a failing audit write does not fail the request;
- the sweep endpoint rejects a missing/incorrect scheduler key, and rejects the
  ordinary service key;
- the sweep is idempotent across two consecutive runs.

Follow `.claude/rules/testing.md`: exact assertions, complete shapes, and
negative-space checks (assert the provider was _not_ called when it shouldn't be).

## Verification (run these, report real output)

```bash
cd apps/storage-api
.venv/bin/python -m ruff check .
.venv/bin/python -m mypy .
.venv/bin/python -m pytest
```

All three must pass. The suite is currently **392 passing** — it should only grow.

## Constraints

- Do not change the HTTP contract in
  `.claude/briefs/sub-agent/2026-07-25-storage-api-contract.md`.
- Do not touch `apps/couriers`, `packages/storage`, or `apps/api`.
- Do not add Drive/explorer features, folders, tags, sharing, OCR, multipart,
  quotas, or malware scanning.
- Do not add a new third-party observability dependency.
- Do not commit, push, or switch branches.

## Report back

Files changed; the exact log fields and audit columns; the scheduler credential
and cron cadence; commands run with real output; anything you interpreted;
anything unfinished. Report failures honestly.
