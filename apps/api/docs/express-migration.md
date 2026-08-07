# FastAPI → Express migration — state, decisions, and the remaining plan

**Read this first in any session that continues the migration.** It is the
handoff: where the work stands, every decision that would otherwise be
re-derived, the recipe for migrating one module, and how the rest should be
split and delegated.

Companion rules: `.claude/rules/express-api.md` (the contract),
`.claude/rules/cli.md` (delegation routing), `.claude/rules/testing.md`.

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
pnpm node:test          # 478 passing, 19 files
pnpm node:boundaries    # 0 errors (warnings are docs.ts files without routes yet)
npx prettier --check "src/**/*.ts"
```

**Run every one of these in the foreground.** Backgrounding a verification
command is how a session ends up narrating a pass that never happened
(`.claude/rules/cli.md`).

### Landed

| Area                | State                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain           | Express 5, TS ESM strict, Vitest + supertest, tsup, dependency-cruiser, pino                                                                                                                                                                   |
| Prisma              | Multi-file schema baselined against the live DB; `scripts/guard-migrate.mjs` refuses `migrate dev` when another service's tables are present                                                                                                   |
| Platform core       | `config/` (zod, parsed once at boot), `platform/logger.ts` (pino + AsyncLocalStorage request context), `http/envelope.ts` (`{data,error}`, list object, cursor pagination), `http/errors.ts`, `http/openapi/registry.ts`, `http/api-router.ts` |
| Auth                | `http/auth/` — `requireApiKey`, `requireSession`, `requireAdmin`, consumer/enterprise realm guards; `platform/jwt.ts` (RS256 sign/verify/JWKS)                                                                                                 |
| Crypto              | `platform/secure-field.ts` — envelope encryption, verified against a Python-sealed fixture                                                                                                                                                     |
| Docs                | All 20 `domains/*/docs.py` translated to `src/modules/*/*.docs.ts` (759 constants)                                                                                                                                                             |
| Platform primitives | `phone`, `pin` (scrypt, cross-checked against a Python-generated hash), `rate-limit`, `risk`, `user-agent`, `permissions`, `secure-field`; `AppHttpError` moved to `platform/errors.ts` so leaf layers can raise it                            |
| Providers           | `providers/communications.ts` (the neutral contract), `providers/twilio/**` (client, adapter, errors, fake, webhook signatures), `providers/posthog/**`                                                                                        |

### Modules migrated (9 of 22)

`health`, `geo`, `audit-events`, `sessions`, `auth-attempts`, `devices`,
`addresses`, `modules`, and `apps` (credential lookup only — its CRUD routes are
still outstanding).

`src/modules/geo/**` is the worked example — copy its shape exactly.

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

### Batch A — platform primitives and vendor adapters (10 of 12 done)

| Unit                          | Source                                                                                                | State         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| `platform/secure-field.ts`    | `core/secure_field.py`                                                                                | **done**      |
| `platform/phone.ts`           | `core/phone.py` (45)                                                                                  | **done**      |
| `platform/pin.ts`             | `core/pin.py` (125)                                                                                   | **done**      |
| `platform/rate-limit.ts`      | `core/rate_limit.py` (87)                                                                             | **done**      |
| `platform/risk.ts`            | `core/risk.py` (148)                                                                                  | **done**      |
| `platform/user-agent.ts`      | `core/user_agent.py` (209)                                                                            | **done**      |
| `providers/communications.ts` | `providers/communications.py`                                                                         | **done**      |
| `providers/twilio/`           | `providers/twilio/*.py` (585)                                                                         | **done**      |
| `providers/posthog/`          | `providers/posthog/client.py` (185)                                                                   | **done**      |
| `platform/permissions.ts`     | `core/org_permissions.py` — a pure catalog plus the default role definitions                          | **done**      |
| `platform/session.ts`         | `core/session.py` — iron-session sealing, must stay compatible with `unsealSession876` in `@876/core` | primary agent |
| `providers/workos/`           | `providers/workos/*.py` (~900)                                                                        | primary agent |

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

The two remaining Batch A units — `platform/session.ts` and `providers/workos/`
— are auth- and credential-critical, so per `.claude/rules/cli.md` they stay
with the primary agent and are not delegated.

### Batches B–H

| Batch | Modules                                                                                                                                                             | FastAPI lines | Suggested owner                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| **B** | communications, mobile-numbers, memberships, onboarding                                                                                                             | ~1,270        | Codex                                                                          |
| **C** | products, apps CRUD, features                                                                                                                                       | ~2,470        | Codex                                                                          |
| **D** | directory                                                                                                                                                           | 1,678         | Codex — 50 routes, 10 resources x 5 verbs (agy attempt failed, see Tool state) |
| **E** | provisioning, organizations (+ `access.py`, `structure.py`)                                                                                                         | ~3,480        | Codex, primary agent reviews                                                   |
| **F** | users                                                                                                                                                               | 3,262         | Codex, primary agent reviews                                                   |
| **G** | auth, oauth                                                                                                                                                         | ~2,670        | **primary agent only** (`.claude/rules/cli.md`)                                |
| **H** | `workers/` (billing dispatch, finance provisioning, feature-flag migration), startup seeds (`services/*_seeds.py`), Dockerfile + wrangler cutover, retire `main.py` | —             | primary agent                                                                  |

`billing` (565 + 191) has **no `docs.py`** — its OpenAPI prose has to be written,
not translated. Slot it into C or E and budget for that.

`twilio_webhooks` (93) is public and needs raw-body signature verification
_before_ JSON parsing — mount it before `express.json()`.

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

### Tool state

- **Codex** (`codex exec -m gpt-5.6-terra`): hit its usage limit 2026-08-06,
  resets **2026-08-08 04:00Z**. Best tool for batches B, C, E, F.
- **agy** (`agy --model=claude-sonnet-4-6` / `--model=gemini-3.6-flash-high`):
  unlimited capacity, but **`--effort` is rejected for the Sonnet model** —
  passing it kills the run instantly.

  **Treat its exit code as meaningless and its stdout as unreliable.** On
  2026-08-07 it was given four briefs. Three produced nothing: one died with
  `Error: timeout waiting for response`, and two exited **0** having printed only
  "now I'll apply the edits" without writing a file. The fourth — the refresh of
  this document — **applied all seven of its edits correctly while printing
  nothing at all**, so the run that looked most like a failure was the one that
  worked.

  The only way to know what agy did is `git status` and `git diff`. A trivial
  prompt (`--print "Reply with exactly OK"`) returns in seconds, so a smoke test
  distinguishes "agy is broken" from "this brief is too long for it". Long,
  multi-file briefs are what it fails at; the `directory` port was abandoned
  after it read the context files and stopped. Give it one file and a numbered
  edit list, then verify by diff.

- Background long runs and start a 5-minute `Monitor` alongside each one
  (`pgrep -f "bin/cod[e]x"` — bracket the letter, or the monitor matches itself).

---

## 6. Traps already hit

- **Forgetting to mount the router** in `routes.ts` → every test 404s.
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
- [ ] `@876/sdk`, `@876/admin` and every app smoke-tested against the new service
- [ ] FastAPI tree deleted in its own commit, after the above is green
