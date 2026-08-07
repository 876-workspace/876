# FastAPI → Express migration — state, decisions, and the remaining plan

**Read this first in any session that continues the migration.** It is the
handoff: where the work stands, every decision that would otherwise be
re-derived, the recipe for migrating one module, and how the rest should be
split and delegated.

Companion rules: `.claude/rules/express-api.md` (the contract),
`.claude/rules/cli.md` (delegation routing), `.claude/rules/testing.md`.

---

## 0. Picking this up cold

```bash
cd /workspaces/876/apps/api
git switch feat/api-express-foundation
pnpm node:typecheck && pnpm node:lint && pnpm node:test && pnpm node:boundaries
```

Expect **1,435 passing in 49 files, 0 boundary errors, 0 typecheck errors**.

**The migration is complete.** All 22 modules are ported and mounted, the
FastAPI tree is deleted, and `pnpm dev/build/test/lint/typecheck` in this package
mean the Express service. The route surface was verified by diffing the
generated `/openapi.json` against every FastAPI router at the last commit that
had both: **344 operations on each side, zero missing and zero extra.**

What is **not** done, and cannot be done from a dev container:

1. **No app has been smoke-tested against the new service.** `@876/sdk`,
   `@876/admin`, and the four Next.js apps talk to this API and none of them has
   been exercised against it. Do this before any deploy.
2. **The two migrations beyond the baseline have not been applied anywhere.**
   CI now applies them (that step did not exist before — see the `ci(api)`
   commit), but no environment has run it yet.
3. **Nobody has measured the two services against each other.** §7 explains why
   the performance claim is not automatic.
4. **Two runbooks lost their script** when the Python tree was deleted:
   `scripts/reconcile_workos.py` (`docs/workos-sync.md`) and
   `scripts/prune_billing_customer_outbox.py`
   (`.claude/rules/customer-architecture.md`). Both are recoverable at `9c4c30b`
   and need a Node equivalent.

Three things that will otherwise cost you an hour each:

1. **Run every verification command in the foreground.** Backgrounding one is
   how a session ends up narrating a pass that never happened.
2. **The delegate tools cannot run any command in this container.** They write
   blind. You own every check.
3. **Put `Mocked<T>` from `@/test/mocked` in every brief.** One mistyped mock
   helper produced 232 of the 240 typecheck errors in the last delegate batch.

---

## 1. Where things stand

**Branch:** `feat/api-express-foundation` (treat as the feature integration
branch — phase branches PR into it, and only the finished thing goes to `main`,
per `.claude/rules/git.md`).

Green as of the last run:

```bash
cd apps/api
pnpm node:typecheck     # tsc --noEmit
pnpm node:lint          # eslint src
pnpm node:test          # 1,435 passing, 49 files
pnpm node:boundaries    # 0 errors (warnings are docs.ts files without routes yet)
npx prettier --check "src/**/*.ts"
```

**Run every one of these in the foreground.** Backgrounding a verification
command is how a session ends up narrating a pass that never happened
(`.claude/rules/cli.md`).

### Landed

| Area                | State                                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain           | Express 5, TS ESM strict, Vitest + supertest, tsup, dependency-cruiser, pino                                                                                                                                                                                                                      |
| Prisma              | Multi-file schema baselined against the live DB; `scripts/guard-migrate.mjs` refuses `migrate dev` when another service's tables are present                                                                                                                                                      |
| Platform core       | `config/` (zod, parsed once at boot), `platform/logger.ts` (pino + AsyncLocalStorage request context), `http/envelope.ts` (`{data,error}`, list object, cursor pagination), `http/errors.ts`, `http/openapi/registry.ts`, `http/api-router.ts`                                                    |
| Auth                | `http/auth/` — `requireApiKey`, `requireSession`, `requireAdmin`, consumer/enterprise realm guards; `platform/jwt.ts` (RS256 sign/verify/JWKS)                                                                                                                                                    |
| Crypto              | `platform/secure-field.ts` — envelope encryption, verified against a Python-sealed fixture                                                                                                                                                                                                        |
| Docs                | All 20 `domains/*/docs.py` translated to `src/modules/*/*.docs.ts` (759 constants)                                                                                                                                                                                                                |
| Platform primitives | **Batch A complete** — `phone`, `pin` (scrypt, cross-checked against a Python-generated hash), `rate-limit`, `risk`, `user-agent`, `permissions`, `deletion`, `session` (cross-checked both directions), `secure-field`; `AppHttpError` moved to `platform/errors.ts` so leaf layers can raise it |
| Providers           | `providers/auth.ts` and `providers/communications.ts` (the neutral contracts), `providers/twilio/**`, `providers/posthog/**`, `providers/workos/**` (client, errors, JWKS, auth adapter)                                                                                                          |
| Services            | **All 10** in `src/services/` — `identity-sync`, `provisioning`, `identification-secrets`, `features`, `provisioning-catalog`, `organization-bootstrap`, `finance-provisioning`, `billing-customer-sync`, `auth-telemetry`, `auth`                                                                |
| Workers             | `src/workers/` — `billing-customer-dispatch`, `finance-provisioning-dispatch`. Exported but **not wired into the boot path**.                                                                                                                                                                     |
| Test helpers        | `src/test/mocked.ts` — `Mocked<T>`, the only correct way to type a mocked repository or provider in this repo                                                                                                                                                                                     |

### Modules migrated (22 of 22)

`health`, `geo`, `audit-events`, `sessions`, `auth-attempts`, `devices`,
`addresses`, `modules`, `directory` (all 50 routes), `onboarding`, `products`,
`communications`, `mobile-numbers`, `twilio-webhooks`, `oauth`, `apps` (all 13
CRUD routes plus the credential lookup), `memberships`, `billing` (17 routes,
not the 4 an earlier draft of this document claimed), `provisioning`,
`features`, and `organizations` (all 28 routes across its three routers).

…plus `users` (64 routes, split across seven resource groups) and `auth` (22
routes over the already-ported `services/auth.ts`).

Verified by diffing the generated `/openapi.json` against every FastAPI router:
**344 operations on each side, 0 missing and 0 extra.**

`src/modules/geo/**` is the worked example — copy its shape exactly.
`src/modules/directory/**` is the example for a **large** module: three resource
groups sharing one prefix, split as `<group>.{schemas,serializers,repository,
service,controller,routes}.ts` with `directory.{schemas,serializers,repository,
service}.ts` holding what all three share. Ten resources in one flat file set
would have been unreadable; a `schemas/` subdirectory with barrels was tried and
removed, because a barrel hides which module a route actually depends on.

---

## 2. How the last batch was verified

Batch A's platform primitives and vendor adapters are committed. Every port was
checked against its Python source before it was committed, not after — the
methods are worth reusing, because two of them found real divergences:

- **`user-agent.ts`** carries its own regex table (there is no maintained
  JavaScript binding to uap-core). It was verified by running **both**
  implementations over the same 15 user agents and diffing all 8 stored fields —
  **120 comparisons, 0 differences.** Reproduce it by dumping
  `parse_user_agent` from the venv and `parseUserAgent` from a throwaway Vitest
  file, then diffing the JSON.
- **`twilio/signatures.ts`** implements Twilio's HMAC-SHA1 scheme directly. All
  four test vectors were **regenerated with the real Twilio Python SDK's**
  `RequestValidator.compute_signature` and matched, and the live validator
  accepts each one.
- **`pin.ts`** verifies against a hash generated by `core.pin.hash_pin`, so the
  two services can read each other's stored PINs.
- **`risk.ts`** needed a fix found by reading: `Number(' ')` is `0` in
  JavaScript where Python's `float(' ')` raises, so a whitespace-only coordinate
  would have been read as the equator instead of "unknown".
- **`session.ts`** was verified in **both** directions — the suite unseals a
  cookie sealed by `core.session.seal_session`, and a cookie sealed by the port
  was confirmed to unseal in Python. The wire format is a contract with
  `@876/core`'s `verifySession876`, which every app reads, so a divergence would
  surface at cutover as every user being logged out.
- **`onboarding`** carries a 549-line field catalog. Both implementations were
  dumped and diffed: **70 fields across 3 targets, 0 differences**, and **267
  validation issues across 25 answer sets, 0 differences**. The second diff is
  what earns confidence in the validator, whose rules port almost-right very
  easily.
- **`products`** was verified the same way as `directory` — **10 operations, 0
  differences** against the FastAPI router. Its port also tightened three
  request fields the Pydantic model typed as nullable (`slug`, `name`,
  `active`) but whose columns are NOT NULL: sending null to any of them reaches
  either `.strip()` or the constraint and raises, so the Zod schemas reject it
  as a 422 instead of reproducing a 500.
- **`oauth`** — 11 operations, 0 differences. Porting it found a defect in the
  shared response envelope: the message was read from the error value itself, so
  an RFC 6749 body (`{ error, error_description }`) came out with the code
  repeated as the message and the description dropped. The FastAPI envelope
  reads the message from the _whole_ payload in that case. Fixed in
  `http/middleware/envelope.ts`; every OAuth grant failure was about to lose its
  explanation. Worth noting for the cutover: `/token` is **not** exempt from the
  envelope in either service, so its bodies are wrapped. That deviates from
  RFC 6749 and is the contract existing clients are coded against — do not
  "fix" it without versioning the change.
- **`twilio-webhooks`** — 5 operations, 0 differences. Two corrections to
  earlier drafts of this document came out of it. First, these routes do **not**
  need mounting before `express.json()`: Twilio's scheme signs the URL plus the
  sorted form parameters, not the raw bytes, so parsing first is harmless. That
  constraint belongs to Stripe-style HMAC-over-raw-body webhooks, not this one.
  Second, its request body must stay a **permissive record** — Twilio signs
  every field it sends, including ones the service has never seen, so a strict
  schema that strips unknown fields would change the string being verified and
  reject every legitimate callback the moment Twilio adds a parameter.
- **`communications` and `mobile-numbers`** were verified together the same way
  — **15 operations, 0 differences**. Porting `communications` also surfaced a
  live-schema defect: `communication_messages` has no `idempotency_scope`
  column, although the SQLAlchemy model has always declared one plus a
  `(scope, key)` unique constraint. The FastAPI service builds its schema from
  `ensure_*` functions replayed at boot, and those only create an absent table —
  they never alter an existing one — so every send path raises today. This is
  the same defect the preceding migration fixed for `communication_calls`, which
  was missing entirely. Migration `20260807000001` adds the column, backfills it
  by the same `app → org → user → 'platform'` precedence the service computes,
  and adds the unique index. The pre-existing `(app_id, idempotency_key)` index
  is left in place: it is redundant when `app_id` is set and constrains nothing
  when it is null, since Postgres treats each NULL as distinct.
- **`directory`** was verified by generating `/openapi.json` from the built app
  and diffing it against the FastAPI router operation by operation: **50
  operations, 0 differences** in method, path, or `operationId`. Do this for
  every module from here on — it is a few lines of script, and it catches the
  one defect a passing test suite cannot, which is a route that was written and
  never mounted. Extract the Python side with a regex over
  `@router.<verb>(\n  "<path>" … async def <name>(`, and remember the OpenAPI
  document uses `{param}`, not Express's `:param`.

The lesson to carry forward: a round-trip test proves a port is
self-consistent, not that it agrees with the service it replaces. Anything
carrying a hash, a signature, or a vendor's regex corpus needs a
cross-implementation fixture.

---

## 3. Decisions that must not be re-litigated

These were each paid for with a bug or a measurement.

1. **Guards attach per route, never `router.use`.** Express middleware runs
   _before_ routing, so a guard mounted on a router answers every unknown path
   with 401 instead of 404. FastAPI's router-level dependency runs _after_ the
   path matches. `createGuardResolver` in `http/routes.ts` reproduces that
   ordering. The health suite caught this.

2. **`security` on a route spec is one declaration.** It drives both the OpenAPI
   security block and the middleware chain, via the `GuardResolver`. Before this,
   a route could advertise `admin` and enforce `apiKey` with nothing to catch it.

3. **A prefixed router registers the prefixed path with Express**, not just in
   the document. `createApiRouter` originally documented `/geo/currencies` while
   serving `/currencies`; health had no prefix so it never showed.

4. **The principal lives in a `WeakMap`, not on `req`.** A `declare module`
   augmentation would make `req.principal` writable from anywhere in the
   service — precisely the field only a guard may write. It also avoids a
   `@types/express-serve-static-core` dependency whose install rewrote 140 lines
   of `pnpm-lock.yaml` with peer-resolution churn.

5. **Tiers stack, they do not replace.** `session` = apiKey + session;
   `admin` = apiKey + admin. This mirrors `api/v1.py`, where the protected
   router carries `require_api_key` and `AdminDep` sits on top.

6. **Only `token_use === 'access'` authorizes a user.** An id token or a
   client-credentials token presented as a session is rejected.

7. **An unset `API_INTERNAL_KEY` rejects every admin caller.** Empty never means
   allow. The internal key is compared as two SHA-256 digests through
   `timingSafeEqual`, so neither value nor length leaks.

8. **Sub-resource routes are declared before `/:id`**, or Express matches the
   literal segment (`summary`, `entitlements`, `attempts`) as an id.

9. **Cross-module data goes through the owning module's service**, and comes
   back _unwrapped_ (`{data, hasMore}`), so the calling module owns its own list
   URL. See `devices.service.ts` reading attempt history from `auth-attempts`.

10. **Prisma `BigInt` must be converted in the serializer.** Every timestamp
    column is `BigInt`; one reaching `JSON.stringify` throws at runtime. Use
    `fromDbUnixSeconds`.

11. **A stale or unknown cursor returns an empty page, never an error.**

12. **Wire fields stay `snake_case`; TypeScript is `camelCase`.** The serializer
    is the only place the two meet. A Prisma field name must never reach a
    client.

13. **Never commit lockfile churn.** A `pnpm install` here re-resolves optional
    peers and rewrites ~140 unrelated lines. Revert it unless dependencies
    genuinely changed (`.claude/rules/git.md`).

14. **`apps/api/.prettierignore` exists** because the root one is not found when
    prettier runs from the package directory, which is how the scripts run it.

---

## 4. The recipe for migrating one module

Reference: `src/modules/geo/**` (simplest), `src/modules/devices/**` (a module
with sub-resources and a cross-module read).

1. **Read the source**: `domains/<name>/router.py`, `schemas.py`, and every
   `db/repositories/*.py` it touches. Check how it is mounted in `api/v1.py` —
   that determines the auth tier.
2. **`<module>.schemas.ts`** — Zod for every request and response. Wire fields
   `snake_case`; request bodies `z.strictObject` where Pydantic had
   `extra="forbid"`; reuse `paginationQuerySchema` for lists.
3. **`<module>.serializers.ts`** — the row type plus `serializeX`. Stamp the
   `object` discriminator, convert `BigInt`, and degrade a malformed `Json`
   column to a safe default rather than breaking the response.
4. **`<module>.repository.ts`** — the only file allowed to import `@/db/client`.
   `select` only what the response serializes.
5. **`<module>.service.ts`** — business rules, throwing `AppHttpError` with the
   **exact** `code` string the Python used. Clients branch on these.
6. **`<module>.controller.ts`** — read validated input, call one service
   function, pick a status code. Nothing else.
7. **`<module>.routes.ts`** — `createApiRouter({ tag, prefix, security,
resolveGuards })`, one `api.<verb>({...})` per route, importing prose from the
   existing `<module>.docs.ts`. Preserve `operationId` as
   `<tag-slug>-<python_function_name>`.
8. **`index.ts`** — the router factory plus anything another module needs.
9. **`__tests__/<module>.test.ts`** — Prisma mocked via `vi.hoisted` +
   `vi.mock('@/db/client', …)`, then `const { createApp } = await
import('@/app')`. Per route: happy path with a **full body assertion**, one
   validation failure, one authorization failure asserting the exact code.
10. **Mount it in `src/http/routes.ts`** — the one shared file. Forgetting this
    shows up as every test 404ing.

---

## 5. Remaining work

### Batch A — platform primitives and vendor adapters (complete)

| Unit                          | Source                                                                       | State    |
| ----------------------------- | ---------------------------------------------------------------------------- | -------- |
| `platform/secure-field.ts`    | `core/secure_field.py`                                                       | **done** |
| `platform/phone.ts`           | `core/phone.py` (45)                                                         | **done** |
| `platform/pin.ts`             | `core/pin.py` (125)                                                          | **done** |
| `platform/rate-limit.ts`      | `core/rate_limit.py` (87)                                                    | **done** |
| `platform/risk.ts`            | `core/risk.py` (148)                                                         | **done** |
| `platform/user-agent.ts`      | `core/user_agent.py` (209)                                                   | **done** |
| `providers/communications.ts` | `providers/communications.py`                                                | **done** |
| `providers/twilio/`           | `providers/twilio/*.py` (585)                                                | **done** |
| `providers/posthog/`          | `providers/posthog/client.py` (185)                                          | **done** |
| `platform/permissions.ts`     | `core/org_permissions.py` — a pure catalog plus the default role definitions | **done** |
| `platform/deletion.ts`        | `core/deletion.py`                                                           | **done** |
| `platform/session.ts`         | `core/session.py` — HMAC-SHA256 cookie sealing (**not** iron-session)        | **done** |
| `providers/workos/`           | `providers/workos/*.py` (~1,100), incl. the auth adapter                     | **done** |

**The permissions unit was mis-scoped in an earlier draft and is now resolved.**
`core/permissions.py` does not exist. The platform primitive is
`core/org_permissions.py` — the org permission catalog and the default role
definitions, pure data with no I/O. The DB-backed `resolve_member_permissions`
lives in `services/provisioning.py` and belongs to **Batch E**, not here. Do not
try to port it as a platform primitive; it needs a session.

The permission arrays carry an asymmetry that looks like an inconsistency and is
not: `owner` and `admin` are sorted, `billing_manager` and `member` are in
declaration order. They are seeded into `organization_roles.permissions`, so
sorting all four "for consistency" would change the rows every existing
organization already has. The test pins all four.

**Batch A is complete.** Every unit was verified against its Python source
before being committed; the methods are recorded in §2.

### What is left — the finish plan

**The service layer is done.** Nine of the ten service prerequisites are ported
and green; only `services/auth.py` remains. Everything below is now unblocked,
so the rest of the port is four phases and can run mostly in parallel.

| Phase | Work                             | State                                      |
| ----- | -------------------------------- | ------------------------------------------ |
| **1** | `services/auth.py` (787)         | **done** — 81 tests                        |
| **2** | the 8 remaining route groups     | **6 of 8 done**; `users` and `auth` remain |
| **3** | `workers/` and the startup seeds | workers **done**; seeds remain             |
| **4** | cutover                          | not started                                |

#### Phase 1 — the last service (**done**)

`services/auth.py` (787 lines) gates the `auth` module. It is the login,
registration, and session-issuing path, so per `.claude/rules/cli.md` it stays
with the primary agent and is **not** delegated. Everything it needs is already
ported: `platform/session.ts`, `platform/pin.ts`, `platform/rate-limit.ts`,
`providers/workos/**`, `services/auth-telemetry.ts`, `services/provisioning.ts`,
`services/identity-sync.ts`.

#### Phase 2 — the remaining route groups

Every prerequisite is in place. Split by **non-overlapping module directories**;
the only shared file is `src/http/routes.ts`, which the primary agent edits once
at the end of the phase.

| Module          | Routes | Lines | Lane        | Why                                                     |
| --------------- | ------ | ----- | ----------- | ------------------------------------------------------- |
| `memberships`   | 5      | 468   | delegate A  | plain CRUD over ported services                         |
| `billing`       | 4      | 925   | delegate A  | **its OpenAPI prose must be written** — no `docs.py`    |
| `apps` CRUD     | 13     | 991   | delegate B  | credential lookup already done                          |
| `provisioning`  | 15     | 1,082 | delegate B  | catalog service already ported                          |
| `features`      | 16     | 1,189 | delegate C  | `services/features.ts` already ported                   |
| `organizations` | 28     | 4,508 | delegate C  | largest non-auth surface                                |
| `users`         | 64     | 3,927 | **primary** | touches identification disclosure (PII) — **remaining** |
| `auth`          | 22     | 2,566 | **primary** | login, sessions, credentials — **remaining**            |

`users` is the largest surface at 64 routes. Split it the way `directory` was —
per-resource-group files sharing one prefix — rather than one flat file set.

#### Phase 3 — workers and seeds

- `workers/` — **two of three done.** `billing-customer-dispatch` and
  `finance-provisioning-dispatch` are ported and tested; they are exported but
  **deliberately not wired into the boot path**, so whoever does the cutover
  chooses where they start. `services/feature_flag_migration.py` (204) remains.
- Startup seeds: `services/feature_seeds.py` (547),
  `services/provisioning_seeds.py` (361), `services/plan_seeds.py` (186),
  `services/geo_seeds.py` (184), `services/bootstrap.py` (167).
  **Move these to a CLI or a migration, not a boot path** — the Express service
  must not run DDL or seeds at startup (`.claude/rules/express-api.md`).

#### Phase 4 — cutover

See §8. Primary agent only: it deletes the FastAPI tree, and a mistake there is
not recoverable from the diff alone.

### What delegating actually cost, and will cost again

Both delegate tools work; the exact invocations and their traps are in **Tool
state** below. On 2026-08-07 four lanes produced seven services in about five
minutes — and then took roughly as long again to review. Budget for both halves.

- **240 typecheck errors, 232 of them in the delegates' test files.** Only 8 were
  in source, which is the real signal: the _logic_ was largely sound. The single
  biggest cause was one mistake, now fixed once and for all in
  `src/test/mocked.ts` — see §6. **Name `Mocked<T>` in every brief.**
- **3 runtime failures out of 1,228.** Two were fixtures that violated a rule the
  implementation correctly enforced; one was an unstubbed return value. In every
  case the _code_ was right and the _test_ was wrong — establish which before
  changing either.
- **One circular import** (`auth-telemetry` ↔ its repository), caught only by
  `pnpm node:boundaries`. Run it; the other four checks pass straight through it.
- Delegates reliably forget to freeze the clock, and reliably stack
  `mockResolvedValueOnce` values they never consume.

### The brief that works

Reuse `.claude/briefs/muse/2026-08-07-port-features.md` as the template. The
parts that earn their place:

1. **Point at the worked example**, not just the rules —
   `src/services/identity-sync.ts` for a service, `src/modules/geo/**` for a
   simple module, `src/modules/directory/**` for a large one.
2. **List the files it may create, and the files it must not touch**, naming the
   directories other lanes are writing concurrently.
3. **State the conventions that actually break**: repository-only `@/db/client`,
   `BigInt` timestamps, exact Python error codes, `Mocked<T>`, freeze the clock,
   `Prisma.DbNull` for a cleared Json column, Python's `int()`/`float()` raise
   where JavaScript coerces.
4. **Tell it that it cannot run commands and must not claim it did.**
5. **Forbid `git commit`.** The orchestrator commits.

### Verify every module the same way

Two checks, both cheap, both catching things a passing suite cannot:

1. **Diff `/openapi.json` against the FastAPI router**, operation by operation.
   This is the only check that catches a route which was written but never
   mounted. `directory` was verified this way — 50 operations, 0 differences.
2. **For anything data-heavy or algorithmic, dump both implementations and
   diff.** `onboarding` was checked at 70 catalog fields and 267 validation
   issues; `user-agent` at 120 field comparisons.

### How to delegate well

- **`src/http/routes.ts` is the only shared file.** One edit per batch, at the
  end. That is the serialization point; everything else runs in parallel.
- **Scope each brief to non-overlapping directories** and say explicitly which
  files the delegate must not create, naming the ones another agent is writing.
- **Write the brief to `.claude/briefs/<tool>/<date>-<task>.md` and commit it**
  (`.claude/rules/cli.md`). Pass the path, not an inline prompt.
- **Give every brief the four verification commands** and "0 boundary errors" as
  the bar.
- **Verify the output yourself.** The docs translation was verified by importing
  both the Python and the TypeScript and comparing 759 constants value by value
  — that is what caught the two deviations. A delegation you do not inspect is
  not a delegation.

### Tool state — verified 2026-08-07

| Tool             | State                                       | Use it for                                       |
| ---------------- | ------------------------------------------- | ------------------------------------------------ |
| **Muse Code**    | **working**                                 | module and service ports — the best of the three |
| **agy** (Gemini) | **working**                                 | a second lane; Gemini models only                |
| **Codex**        | **exhausted** until `Aug 8th, 2026 4:03 AM` | the larger module ports once it returns          |

#### Muse Code — the primary delegate

```bash
cd apps/api && muse exec --trust-workspace --reasoning-effort high \
  --prompt-file /workspaces/876/.claude/briefs/muse/<brief>.md
```

- **`--trust-workspace` is required.** Without it Muse prints a single warning
  that the workspace is untrusted and **silently skips `AGENTS.md`** — it runs
  without the project rules.
- **It cannot run any command here.** Its bash is sandboxed through bubblewrap,
  which cannot create a namespace in this container. It says so honestly rather
  than claiming green checks, but it means it writes blind.
- **Monitor at 60–90s, not 5 minutes.** It finishes a whole module in about five
  minutes, so a five-minute check fires once, after the run is over.
- Measured throughput: four lanes produced seven services in ~5 minutes.

#### agy — the second lane, Gemini only

```bash
agy --model=gemini-3.6-flash-high --print-timeout 45m \
    --output-format stream-json --dangerously-skip-permissions \
    --print "$(cat .claude/briefs/muse/<brief>.md)"
```

- **Capacity is per model group and is not unlimited.** Measured 2026-08-07:
  Gemini 95% weekly / 98% five-hour; Claude+GPT **7% weekly / 0% five-hour**.
  **Send agy work to Gemini.** Check first — it costs no agent turn:
  `agy --output-format json --print-timeout 60s -p "/quota"`.
- An exhausted bucket surfaces only as `"status":"ERROR"` with
  `"error":"Individual quota reached…"` in the stream-json result. Under plain
  `--print` it looks identical to a model that read its context and gave up.
- **`--print-timeout` defaults to `5m0s`.** Always set it above the real
  duration; the default kills a run mid-flight, having already executed its tool
  calls, and exits 0 with nothing on stdout.
- **`--print` comes last**, because it takes the prompt as its value.
- `--effort` is rejected by the Claude models and kills the run instantly.
- Plain `--print` to a redirect can produce an empty file even on success
  ([antigravity-cli#408](https://github.com/google-antigravity/antigravity-cli/issues/408),
  still open) — hence `--output-format stream-json`.

#### Codex

Probe with `codex exec -m gpt-5.6-terra "Reply with exactly: CODEX_OK"`. An
exhausted quota still **exits 0** and prints the limit message, so read the
output rather than the exit code.

#### Whichever tool

- Background long runs and start a `Monitor` alongside each. Bracket a letter in
  the `pgrep` pattern (`bin/cod[e]x`, `prompt-fil[e]`) or the monitor matches its
  own command line and reports "still running" forever.
- **Confirm what it did with `git status` and `git diff`**, never from its own
  report.
- Delegates never commit. The orchestrating agent stages and commits.

## 6. Traps already hit

Added by the final batch (`users`, `auth`, seeds):

- **A delegate will invent a fallback identity rather than fail.** `createUser`
  generated a local id when WorkOS was unreachable, producing a user row whose
  `workos_user_id` points at nothing — an account that exists, looks healthy,
  and can never sign in. Any `catch` that substitutes a made-up value for a
  provider's answer is a defect.
- **Deleting a user must delete the provider user.** WorkOS has no disable
  state, so that call _is_ the credential revocation; swallowing its failure
  leaves a tombstoned account able to authenticate.
- **Check every column name against the schema, not against the usual pair.**
  `user_app_enrollments` has `enrolled_at`/`last_seen_at`, not
  `created_at`/`updated_at`, and only the latter moves on a repeat visit.
- **`vi.mock` of a service blanks its constants** — see below; this bit twice.

Added by the 2026-08-07 module batch:

- **Two modules declaring the same OpenAPI schema id takes `/openapi.json` down
  with a 500** — for every consumer, not just those routes. `billing` and
  `organizations` both declared `Subscription`. Only one module may own a shared
  contract; the other imports it through that module's `index.ts`, exactly as
  `domains/billing/router.py` imports `SubscriptionResponse` from the
  organizations domain. Nothing in the test suite catches this except a test
  that actually fetches `/openapi.json`.
- **A Zod `transform` in a _response_ schema cannot be rendered** into the
  OpenAPI output document, and fails the whole document the same way. A response
  schema describes what the serializer already produced; transforms belong on the
  request side.
- **`vi.mock('@/services/x', () => ({ … }))` blanks that module's exported
  constants too.** A partial factory replaces the whole module, so a constant
  read at module scope by an unrelated importer becomes `undefined` and crashes
  every suite that pulls it into the graph — not just the one that wrote the
  mock. Use `importOriginal` and override only what you stub.
- **A delegate will emit an entire module twice** in one file when a run
  restarts, with the second copy unreachable and using different names. Check
  `grep -c '^export async function' ` against the route count before reviewing
  the logic.
- **A delegate will "handle" a missing dependency with `try { await import(…) }
catch { return zeros }`.** That reports a broken queue as a clean run. Any
  swallow-everything catch around a service call is a defect, not defensiveness.
- **Watch for a cursor `loadAnchor` cast to `Promise<never>`.** It is how a
  delegate satisfies the paginator when the anchor's projection is narrower than
  the page's, and it disables the only type check that would catch the mismatch.

Earlier:

- **Forgetting to mount the router** in `routes.ts` → every test 404s.
- **`T & Record<string, ReturnType<typeof vi.fn>>` does not type a mock.**
  TypeScript resolves a named property from the declared member and ignores the
  index signature, so `repo.findUser.mockResolvedValue(...)` fails to compile
  even though it works at runtime. Use **`Mocked<T>` from `@/test/mocked`**,
  which maps over `keyof T`. This one mistake produced 232 of the 240 typecheck
  errors in the 2026-08-07 delegate batch.
- **A repository type belongs in the repository file.** Declaring
  `XRepository` in `x.ts` and importing it from `x.repository.ts` — while `x.ts`
  imports the factory back — is a circular dependency that `node:boundaries`
  fails on. `auth-telemetry` shipped with exactly that and had to be untangled.
- **A fixture with a frozen `NOW` needs a frozen clock.** Against the real clock
  every `expiresAt: NOW + 600` fixture is already in the past. Use
  `vi.useFakeTimers({ toFake: ['Date'] })` — faking timers wholesale stalls
  supertest, which drives real sockets.
- **`clearMocks` does not drain the `mockResolvedValueOnce` queue.** Values
  queued and not consumed leak into the next test and silently override its
  stub. One such leak disabled a cross-user authorization assertion entirely.
- **When a delegate's test fails, check which of the two is wrong.** In the
  2026-08-07 batch, two of three runtime failures were fixtures violating a rule
  the implementation correctly enforced. The code was right and the test was
  wrong; "fixing" the code would have removed a real check.
- **`prisma migrate` is the only way to change the schema.** The FastAPI service
  builds its schema from `ensure_*` functions replayed at boot, and those only
  create a table that is **absent** — they never alter an existing one. That is
  why `communication_calls` did not exist and `communication_messages` was
  missing `idempotency_scope`. Assume any column the SQLAlchemy model declares
  but the baseline lacks is simply not in the live database.
- **`agy`'s flag order**: `--print` takes the prompt, so it must come last.
- **Vitest module stubs**: `vi.spyOn(config, 'getSettings')` works, but a test
  asserting "rejects when unset" must present a credential that _would_ work
  otherwise, or it passes for the wrong reason.
- **Node vs Python AES-GCM**: Python appends the auth tag to the ciphertext;
  Node returns it separately from `getAuthTag()`. Any new crypto port needs a
  cross-implementation fixture, not just a round-trip test.
- **Node's base64 decoder is lenient** where Python's raises — validate by
  re-encoding and comparing.
- **`Number(' ')` is `0`, but `float(' ')` raises.** Any Python-to-JS numeric
  parse needs an explicit blank check, or a blank field silently becomes zero.
- **A test comment claiming a fixture came from the other implementation is not
  evidence.** Regenerate it. The Twilio vectors were checked this way and were
  genuine, but the check is what made that a fact rather than an assumption.
- **`z.coerce.boolean()` is `Boolean(value)`**, so the query string `'false'` —
  non-empty — becomes **true**. Every boolean query parameter needs an explicit
  parse of the recognised true spellings. `?include_deleted=false` returned
  tombstoned rows before this was caught.
- **A Prisma nested write needs the _checked_ create input.** Setting a relation's
  scalar (`bankId`) selects the unchecked variant, which forbids
  `directoryAddress: { create: … }`; use `bank: { connect: { id } }` instead. The
  alternative — two writes — is what risks an orphan child row.
- **The `apiKey` tier does not resolve the internal key.** A FastAPI read route
  that takes `Depends(resolve_principal)` while its router carries only
  `require_api_key` needs `attachPrincipal` as route middleware in Express, or
  `principal.internal` silently reads `false` for a platform caller.

---

## 7. Performance — what was actually slow in Python

Investigated because the assumption was that code volume caused it. It did not.

1. **`NullPool`** (`db/session.py:51`) opens a fresh Postgres connection per
   request. Correct for freeze-between-invocation serverless, wrong for a
   long-lived Cloudflare Container. Measured handshake cost ~30ms against ~6ms
   of query time (`.claude/rules/navigation-performance.md`). **The Express
   service uses a real pool** (`src/db/client.ts`), with the reasoning recorded.
2. **`APIEnvelopeMiddleware`** (`core/middleware.py:107`) is a
   `BaseHTTPMiddleware` that buffers the entire response body, `json.loads` it,
   and re-serializes — on every JSON response, with a second `BaseHTTPMiddleware`
   for logging above it. **The Express envelope wraps `res.json`** and never
   buffers bytes.
3. **Cold start** is the one place volume matters: 24,123 lines under `domains/`
   are imported at boot, plus SQLAlchemy and Pydantic model construction.

Both 1 and 2 were fixable in Python directly. The migration should not get
retroactive credit for a connection-pool setting. **Nobody has measured the two
services against each other** — if the performance claim matters, boot both and
time the same endpoint before asserting an improvement.

---

## 8. Cutover checklist (Batch H)

- [ ] Every module migrated and mounted; `/openapi.json` diffed against the
      FastAPI document, path by path and operationId by operationId
- [ ] `workers/` running the background loops the FastAPI app owned
- [ ] Startup seeds ported (`_seed_platform_apps`, feature seeds, geo seeds,
      plan seeds) — or deliberately moved to a migration/CLI
- [ ] Dockerfile and `wrangler.jsonc` pointed at the Node entry point
- [ ] Package scripts flipped: `dev`/`build`/`start`/`test`/`lint` to the
      `node:*` equivalents
- [ ] **Prisma migrations applied to every environment.** Two exist beyond the
      baseline and both fix a table the FastAPI service never created properly:
      `20260806000001_create_communication_calls` and
      `20260807000001_add_communication_message_idempotency_scope`. CI applies
      them; a hand-managed environment will not have them.
- [ ] `@876/sdk`, `@876/admin` and every app smoke-tested against the new service
- [ ] **`/oauth/token` still enveloped.** Its success and error bodies are
      wrapped in `{data, error}` in _both_ services — a deviation from RFC 6749,
      and the contract every existing 876 client is coded against. Do not
      "correct" it during cutover; that is a separate, versioned change.
- [ ] FastAPI tree deleted in its own commit, after the above is green
