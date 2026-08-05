# Brief — Phases 2, 3 and 4: admin surface, Vault/identifications/PIN, risk scoring

**Tool:** Codex (`gpt-5.6-sol`, `model_reasoning_effort=medium`)
**Repo:** `/workspaces/876`, branch `feat/auth-device-telemetry` (already checked out)
**Author:** Opus 5 (primary agent)
**Companion spec:** `.claude/briefs/codex/2026-08-04-auth-device-telemetry-and-vault.md`
(the "master brief" — it holds the full specification for every phase below)

---

## 0. Read this first

This is a **single, very large, one-shot run**. You will not be prompted again,
and there is no second run available. Everything from Phase 2 through Phase 4
of the master brief is yours.

**The master brief is the specification.** Open it now and read §2.1 through
§4.3 in full. This file does not restate those specs — it records what has
actually landed since the master brief was written, the ordering to follow, the
traps that will cost you a rerun, and the verification gates.

### Working rules

- **Work phase by phase, in order.** After each phase: run that phase's
  verification commands **in the foreground**, fix what you broke, print
  `PHASE N COMPLETE` with a file list, then continue.
- **If you approach your budget limit, stop at a phase boundary in a green
  state.** A finished Phase 2 plus an untouched Phase 3 is a good outcome; a
  half-written Phase 3 that fails typecheck is not. Say clearly in your report
  where you stopped.
- **Do not commit anything.** Leave all work in the working tree — the
  orchestrating agent stages and commits. Do not create branches, do not amend,
  do not stash.
- **Do not revert or "clean up" anything already on the branch.** If something
  already there looks wrong to you, say so in your report and leave it.
- `python` is **not** on PATH. Use `.venv/bin/python` from `apps/api`.

### Rules you must read before writing code

- `CLAUDE.md` (repo root) — platform shape, boundaries, no server actions, no
  `proxy.ts`/`middleware.ts`, loading-state/Suspense rules, UI copy rules
  (no explanatory `<p>` under headings), no green buttons.
- `.claude/rules/api-backend.md` — FastAPI domain layout (`router.py` /
  `schemas.py` / `docs.py`), `AppHTTPException(http_status_code=...)`,
  `ListObject[T]`, auth deps.
- `.claude/rules/sdk-conventions.md` — `$876.<resource>.<verb>()`, the auth-tier
  gating rule, `retrieveBy<Key>` naming, banned `get*`/`find*`/`upsert`.
- `.claude/rules/app-layout.md` — page containers, `ResourceToolbar`,
  `StatusFilterHeading`, detail toolbars, table cell hierarchy, bare-verb button
  labels, `FormRow`, the single `876-page-title` heading size.
- `.claude/rules/app-structure.md` — `_components/` / `features/` placement, no
  barrels, no app-name prefixes on files or exported symbols.
- `.claude/rules/types.md`, `.claude/rules/code-style.md`,
  `.claude/rules/deletions.md`, `.claude/rules/storage-architecture.md`,
  `.claude/rules/testing.md`.

---

## 1. What already landed (Phase 1 is complete, committed and green)

Phase 1 is **done** — 11 commits on this branch, `630 passed` on the API suite,
every package typechecking. Do not redo any of it. Read the files rather than
assuming the master brief's prose matches the code; where they differ, **the
code is the truth**.

### API

- `apps/api/db/models/devices.py` — `UserDevice`, `AuthAttempt`. Read the exact
  column names from this file before writing a single serializer.
- `apps/api/db/models/auth.py` — `Session` gained `device_id`,
  `ip_country_code`, `ip_region`, `ip_city`, `ip_asn`, `ip_as_organization`,
  `last_seen_at`, `revoked_at`, `revoked_by`.
- `apps/api/db/migrate.py` — `ensure_session_telemetry_columns`, wired into
  `main.py`. **Follow this exact pattern for every new column you add to an
  existing table.** `Base.metadata.create_all` creates new tables but never
  alters an existing one, so a new column without a migration function means the
  ORM INSERTs a column the live table does not have — and for `sessions` that
  means every login fails. This is the single most dangerous mistake available
  to you in this run.
- `apps/api/db/repositories/user_devices.py` — `record_seen`, `retrieve`,
  `list_for_user`, `list_by_fingerprint`, `list(...)` (filters `user_id`,
  `fingerprint`, `device_type`, `trusted`, `blocked`; cursor pagination on
  `last_seen_at`), `update(...)` (label / trusted / blocked + `actor_id`).
- `apps/api/db/repositories/auth_attempts.py` — `create`, `retrieve`,
  `list(...)` (filters `user_id`, `identifier`, `event`, `outcome`,
  `ip_address`, `ip_country_code`, `device_fingerprint`, `app_id`,
  `created_after`, `created_before`; cursor pagination on `created_at`, newest
  first), `count_recent_failures(identifier=, ip_address=, since=)`.
- `apps/api/db/repositories/sessions.py` — plus `list(...)` (filters `user_id`,
  `device_id`, `active`), `revoke(session_id, revoked_by)` (**soft**: sets
  `revoked_at`/`revoked_by`, clamps `expires_at`), `touch_last_seen`.
- `apps/api/services/auth_telemetry.py` — `AuthTelemetryService.record(...)`,
  fully failure-isolated, returns `AuthAttemptRecord(id, device_id, context)`.
  Phase 4 extends this file.
- `apps/api/core/request_context.py` — `resolve_request_context(request)`
  returning a context with `.ip`, `.user_agent`, `.geo.*`, `.device_signal`,
  `.request_id`, `.trusted`.
- `apps/api/core/user_agent.py` — `parse_user_agent`, `refine_with_client_hints`.
- `apps/api/domains/auth/router.py` — every auth entry point now records an
  attempt (`_record_auth_failure` is the shared helper; note its `outcome` and
  `user_id` params — it records successes and `pending` too, despite the name).
- `apps/api/domains/auth/session_state.py` — `establish_session(..., event=...)`
  is the single mint point; it records the success attempt and stamps the same
  IP/geo/device onto the session row.
- `apps/api/core/id.py` — prefixes registered: `authAttempt` → `atmp`,
  `device` → `dev`. **Add any new prefix here** (Phase 3 needs `pin`).

**The repositories already carry every filter the Phase 2 endpoints need.** If
you find a genuine gap, extend the repository — never filter in a router, and
never load rows into Python to filter or count them.

### Packages

- `@876/core/request-context` — `extractRequestContext`,
  `requestContextHeaders`, `REQUEST_CONTEXT_HEADERS` (+ 30 unit tests).
- `@876/device` — the browser fingerprint collector.
- `@876/sdk` — attaches `x-876-device` on auth mutations behind a 400 ms timeout.
- All four apps' `/api/auth/[...path]` bridges forward the `x-876-*` headers.

### Not started — all yours

Master brief §2.1 (API endpoints), §2.2 (`@876/admin`), §2.3 (Console UI),
§3.1–§3.4 (Vault, identifications, PIN), §4.1–§4.2 (PostHog, risk scoring).

---

## 2. Phase 2 — admin surface

Implement master brief §2.1, §2.2, §2.3 in that order (API → client → UI; the UI
cannot be written against a client that does not exist yet).

### Traps that will cost you a rerun

1. **Route ordering.** `GET /auth-attempts/summary` **must** be declared before
   `GET /auth-attempts/{attempt_id}`, or FastAPI matches `summary` as an
   `attempt_id` and the summary endpoint becomes permanently unreachable. Add a
   test that calls `/auth-attempts/summary` and asserts the aggregate shape, so a
   later reordering cannot silently break it. The same applies to any other
   literal-vs-parameter collision you introduce.
2. **Every one of these endpoints is `AdminDep`.** None of it is self-scoped, so
   **nothing** here may appear in `@876/sdk` — the auth-tier gating rule in
   `.claude/rules/sdk-conventions.md` forbids it. `@876/admin` only.
3. **Aggregate in SQL.** `/auth-attempts/summary` does `GROUP BY` + `ORDER BY
count DESC LIMIT 10` in the repository. `auth_attempts` grows without bound;
   a Python-side count over the window will fall over in production.
4. **Never serialize `UserDevice.signal["components"]`** — that is the raw
   fingerprinting substrate. The admin surface shows the *derived* identity. Add
   a test asserting `components` never appears in any device response.
5. **Never return a full `x-forwarded-for` chain.** IPs *are* returned to
   Console — that is the point of a fraud surface — but only because every route
   is `AdminDep`.
6. **Revoke is soft** (`.claude/rules/deletions.md`): tombstone
   `{ "object": "session", "id": ..., "deleted": true }`, `revoked_at` /
   `revoked_by` set, and the row stays retrievable while dropping out of
   `active=true` listings.
7. **Check whether a sessions router already exists** before creating
   `domains/sessions/`. Extend rather than add a second one.

### Console UI — the rules most often broken

- **Chrome is never a skeleton.** `ResourceToolbar`, `PageBreadcrumb` and a
  table's `<thead>` render immediately, on hard load and client navigation.
  Only the fetching component sits inside `<Suspense>`, and its fallback is
  `DataTableSkeleton` with that table's real columns from a
  `*-skeleton-columns.ts` sibling — never a bare `<Skeleton className="h-96">`.
- **`await searchParams`/`params` at the top of the page component** and pass
  plain values down. Never wrap a toolbar in `<Suspense>` because it awaits a
  promise that carries no I/O.
- **Thread the status filter into the query.** `?status=` resolves server-side
  and goes into `$876.<resource>.list({ status })`. Filtering returned rows in
  the page component silently breaks pagination.
- `StatusFilterHeading` comes from `@876/ui/status-filter-heading` — import it,
  do not copy it. Its `options` must stay plain `{value,label}[]`.
- No Add button on `/sessions` (sessions are not created by hand). Bare-verb
  labels everywhere: `Edit`, `Export`, `Revoke`, `Delete`.
- Mutations go through a thin route handler under `apps/console/src/app/api/...`
  that calls `requireConsolePermission(...)` first and then `$876` — no server
  actions, no business logic in the handler — invoked from `client`
  (`@/lib/client`).
- A risk badge ≥60 is **warning-styled, never green**, and never a blocking
  affordance.
- Add **Security** to the Console sidebar nav config with children Sign-ins,
  Devices, Sessions. The parent carries a real `href` (`/security`), never `'#'`.

### Phase 2 verification (foreground)

```bash
cd /workspaces/876/apps/api
.venv/bin/python -m ruff check .
.venv/bin/python -m mypy --explicit-package-bases api core db domains providers schemas services utils main.py
.venv/bin/python -m pytest
cd /workspaces/876
pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
```

---

## 3. Phase 3 — Vault, identifications, PIN

This is the security-sensitive phase. **The design in master brief §3.1–§3.4 is
fixed. Transcribe it. Do not substitute your own crypto choices**, your own
KDF parameters, your own AAD scheme, or your own storage format. It will be
reviewed line by line.

Points where a plausible-looking deviation would be a real defect:

- **`context` is authenticated associated data and is mandatory**, always
  `{"user_id": …, "type": …}`. It is what makes a row copied onto another
  user's record fail to decrypt. An implementation that accepts an empty
  context, or that ignores it on decrypt, is broken even though every test that
  only round-trips would pass.
- **If `SECURE_FIELD_KEY` is unset and Vault is disabled, `seal` must raise.**
  Never silently store plaintext, never fall back to a derived or constant key.
- **Ciphertext keeps its provider prefix** (`wv1:` / `la1:`) so a future
  migration can tell the formats apart.
- **Stop writing the plaintext `value` column for new rows**; reads are masked
  from `value_last4`, falling back to `mask_identification_value(row.value)`
  only while legacy rows exist. Duplicate detection moves to `value_hash`
  (HMAC-SHA256 under `IDENTIFICATION_HASH_PEPPER`) so it never needs to decrypt.
- **Never log, trace, or serialize a raw identification value** anywhere except
  the disclosure response. Add the test that asserts the list/retrieve
  serializers cannot emit an unmasked value.
- **Keep every existing disclosure check** — active org→app subscription plus
  the type's `disclosure_app_slugs` allowlist — and keep writing the audit
  event, now with `device_fingerprint` / `ip_address` from the request context.
- **PIN hashing is `hashlib.scrypt`** with exactly `n=2**15, r=8, p=1`, 16-byte
  random salt, 32-byte output, stored as `scrypt$<n>$<r>$<p>$<b64 salt>$<b64
hash>`, verified with `hmac.compare_digest`. `GET /users/{user_id}/pin`
  returns status only and **never** the hash.
- Add `pin_verify` to the `auth_attempts` event vocabulary; every set / clear /
  failed verify writes both an `audit_events` row and an `auth_attempts` row.
- New column on an existing table ⇒ new `ensure_*` function in `db/migrate.py`
  wired into `main.py`. See §1 above.
- New id prefix (`pin`) ⇒ register it in `core/id.py`.

If you cannot reach the WorkOS Vault docs, implement against the endpoint shapes
named in the master brief, mark the assumption with a clear comment **and** call
it out in your final report. Do not quietly guess.

### Phase 3 verification

Same commands as Phase 2.

---

## 4. Phase 4 — analytics emission and risk scoring

Implement master brief §4.1 and §4.2.

- **`assess_risk` is pure, deterministic and synchronous.** No I/O inside it —
  the caller gathers the inputs. Implement the weights table exactly as written
  and unit-test each rule in isolation plus the clamp at 100.
- **Enforcement stays off.** `AUTH_RISK_BLOCK_THRESHOLD` defaults to `0`,
  meaning nothing is ever blocked. Implement the check as a single guarded
  branch, and add the test proving a score of 100 with the default threshold
  still authenticates successfully. This test is the one that lets us ship
  scoring without risking a lockout incident.
- **PostHog emission never sends the raw IP, the email/identifier, or the raw
  device components.** Send `ip_hash` (first 16 hex chars of
  `sha256(pepper + ip)`). Set `$geoip_disable: true`. Fire-and-forget, fully
  exception-isolated like the rest of the telemetry service — an analytics
  outage must never fail a login.

### Phase 4 verification

Same commands as Phase 3.

---

## 5. Final report

End your run with:

1. A phase-by-phase list of files added and modified.
2. The exact verification commands you ran and their real results. **Paste
   failures verbatim. Do not claim green if it is not green** — the orchestrator
   re-runs every command, so an inaccurate claim only wastes the run.
3. Every assumption you had to make — especially the WorkOS Vault endpoint
   shapes, the `ua-parser` import surface, and anything about `db/migrate.py`.
4. Anything you deliberately did not do, and why.
5. Any place where this brief conflicted with a repo rule — name the rule, say
   which you followed, and why.
