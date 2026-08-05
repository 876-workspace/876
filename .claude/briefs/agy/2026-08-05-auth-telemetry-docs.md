# Brief — document the auth device-telemetry data plane

**Tool:** `agy` (Antigravity), `gemini-3.1-pro-high`
**Repo:** `/workspaces/876`, branch `feat/auth-device-telemetry`
**Author:** Opus 5 (primary agent)

## Your task, in one sentence

Write **one new file**, `docs/auth-telemetry.md`, documenting the authentication
device/geo telemetry plane that just shipped — what it captures, how the trust
boundary works, and how to operate it.

## Absolute constraints

- **Create exactly one file: `docs/auth-telemetry.md`.** Do not create any
  other file. Do not modify any existing file. Do not touch `apps/`,
  `packages/`, or `.claude/`.
- **Do not commit, branch, or stage anything.** Leave the file in the working
  tree.
- **Document only what the code actually does.** Read every file listed below
  before writing about it. If something is unclear, write what the code shows
  and add a short "unverified" note — never invent behaviour, endpoint names,
  column names, or configuration keys.
- The admin API surface, the Console UI, WorkOS Vault, account PINs and risk
  scoring are **being written right now by another agent and do not exist yet.**
  Do not document them. A single "Not yet built" section listing them by name
  is correct; anything more is fabrication.

## Read these first (this is the whole source of truth)

Server side:

- `apps/api/core/request_context.py` — how a request's IP/geo/UA/device signal
  is resolved, and what `trusted` means.
- `apps/api/core/user_agent.py` — UA parsing and client-hint refinement.
- `apps/api/services/auth_telemetry.py` — the recording service.
- `apps/api/db/models/devices.py` — the `user_devices` and `auth_attempts`
  tables. **Take every column name from this file.**
- `apps/api/db/models/auth.py` — the columns added to `sessions`.
- `apps/api/db/migrate.py` → `ensure_session_telemetry_columns`.
- `apps/api/db/repositories/user_devices.py`,
  `apps/api/db/repositories/auth_attempts.py`,
  `apps/api/db/repositories/sessions.py`.
- `apps/api/domains/auth/router.py` and
  `apps/api/domains/auth/session_state.py` — which events are recorded where.
- `apps/api/core/security.py` → `require_api_key` (why a validated app API key
  is what makes forwarded metadata trustworthy).

Client side:

- `packages/core/src/request-context/index.ts` — header precedence, the
  `x-876-*` wire headers, sanitization.
- `packages/device/src/index.ts` — what the device signal contains.
- `packages/sdk/src/request.ts` — how and when the signal is attached.
- `apps/876/src/app/api/auth/[...path]/route.ts` — the bridge wiring (the other
  three apps are identical).

## Required structure

Use these exact `##` headings, in this order:

1. **What this is** — two or three sentences. The plane records who signed in,
   from where, and on what device, for every authentication attempt across every
   876 app.
2. **The path a signal takes** — browser → `@876/sdk` → the app's
   `/api/auth/[...path]` bridge → FastAPI → `auth_attempts` / `user_devices` /
   `sessions`. One numbered list, one line per hop, naming the real function at
   each hop.
3. **The trust boundary** — the single most important section. Explain that
   geo/IP headers are only believed when the caller presented a valid app API
   key (i.e. it is one of our own server-side bridges), that an unauthenticated
   caller's `x-876-*` headers are ignored in favour of the raw connection, and
   that the result is marked `context_trusted` on the attempt row. Say plainly
   why: otherwise any client could claim any country.
4. **What is captured** — three tables, one per table (`auth_attempts`,
   `user_devices`, the `sessions` additions), each listing column, type and a
   one-line meaning. Take these from the model files verbatim.
5. **Events and outcomes** — the `event` vocabulary and the `outcome`
   vocabulary, each value with one line on when it is written. Note that
   `pending` covers steps that legitimately do not authenticate anyone yet (OTP
   send, recovery mail, social hand-off).
6. **Failure isolation** — telemetry never fails an authentication: the service
   catches everything, logs `auth.telemetry.failed`, and returns an empty
   record. Name the test that proves it.
7. **Privacy** — what is deliberately not stored or forwarded (raw device
   `components`, full `x-forwarded-for` chains), and that latitude/longitude are
   strings so precision is never lost.
8. **Operating it** — the `ensure_session_telemetry_columns` migration and why
   a missing `sessions` column would break every login; how to disable client
   fingerprinting (`collectDeviceSignal: false` on `create876Client`).
9. **Not yet built** — a short bullet list: admin API endpoints, Console UI,
   WorkOS Vault encryption, account PIN, risk scoring, PostHog emission.

## House style — follow it exactly

- Match the tone and formatting of an existing doc: read `docs/cloudflare.md`
  first and mirror its heading style, table style and density.
- **No marketing language, no filler, no "In this document we will…".** Lead
  with the fact.
- Prefer a table over a paragraph whenever the content is field/meaning pairs.
- Every code identifier in backticks; every file reference as a repo-relative
  path.
- British/American spelling: match the surrounding docs (American).
- Keep it under roughly 250 lines.

## Verification before you report done

- `npx prettier --check docs/auth-telemetry.md` passes (run
  `npx prettier --write docs/auth-telemetry.md` if not).
- Every column name you wrote appears in `apps/api/db/models/devices.py` or
  `apps/api/db/models/auth.py` — check them one by one.
- Every file path you cited exists (`ls` each one).
- `git status --short` shows exactly one new file: `docs/auth-telemetry.md`.

Report: the file you created, the checks you ran, and any place where the code
disagreed with this brief.
