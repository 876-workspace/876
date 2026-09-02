# Codex brief — Twilio Phase 1: provider foundation + phone verification

**Model:** gpt-5.6-terra, high reasoning. **Repo:** `/workspaces/876`.
**Branch:** `feat/twilio-verification` (already created from `origin/main` — work
on it, do **not** create another).

**Read first, in full:** `docs/plans/twilio-communications.md`. It is the plan of
record and contains a Phase 0 discovery section (§3) with verified findings about
this repo. Trust §3 over your own assumptions about the tree. Also read
`.claude/rules/api-backend.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/stripe-api-pattern.md`, `.claude/rules/types.md`, and
`.claude/rules/code-style.md`.

## What to build

Phase 1 only (plan §13): the provider foundation **and** phone verification.
Nothing from Phase 2 (messages, calls, TwiML, inbound webhooks beyond what
signature validation needs).

### 1. Config — `apps/api/core/config.py`

Add the `TWILIO_*` settings in plan §6, following the existing WorkOS/Stripe/
PostHog style (`Field(default="", validation_alias="…")`). `TWILIO_MODE` is
`disabled | fake | live`, defaulting to `disabled`. Add a derived property that
reports whether live mode is actually satisfiable (mode is `live` **and** the
required credentials are non-empty); `live` with missing credentials must behave
as `disabled`, not crash at import. Update `apps/api/.env.example` if one exists.

### 2. Provider protocols — `apps/api/providers/communications.py`

Provider-agnostic `Protocol`s and frozen dataclasses exactly as named in plan §2
and §5: `PhoneVerificationProvider`, `MessagingProvider`, `VoiceProvider`,
`PhoneLookupProvider`, `CommunicationsWebhookVerifier`, plus `PhoneVerification`,
`ProviderMessage`, `ProviderCall`, `PhoneLookup`. Match the style of
`apps/api/providers/protocol.py` (frozen dataclasses, `runtime_checkable`
protocols, docstrings explaining the error contract). Define the `MessagingProvider`
and `VoiceProvider` protocols now — Phase 2 implements them — but do **not**
implement message/call methods on the Twilio adapter in this phase.

### 3. Twilio adapter — `apps/api/providers/twilio/`

`client.py`, `adapter.py`, `errors.py`, `signatures.py`, `types.py`, `__init__.py`.

- **`client.py`** — async `httpx` REST client, mirroring `providers/workos/client.py`
  in structure, timeouts, and error surfacing. Twilio REST takes
  **form-encoded** bodies, not JSON. Authenticate with HTTP Basic using
  `TWILIO_API_KEY` / `TWILIO_API_KEY_SECRET` (**not** the account SID + auth
  token). Verify v2: `POST /v2/Services/{sid}/Verifications` and
  `POST /v2/Services/{sid}/VerificationCheck`. Lookup v2:
  `GET https://lookups.twilio.com/v2/PhoneNumbers/{e164}`.
- **`adapter.py`** — converts Twilio payloads into the §2 dataclasses. The adapter
  is the only place Twilio field names appear outside `types.py`.
- **`errors.py`** — maps Twilio HTTP status + provider error codes onto the
  `communications/*` registry in plan §11, raising `AppHTTPException`
  (`core/errors.py`). Log upstream code, HTTP status, resource SID, correlation
  id, and safe context. **Never** log OTP codes, API secrets, or unmasked phone
  numbers — add a masking helper and use it.
- **`signatures.py`** — thin wrapper over the `twilio` package's `RequestValidator`.
  Validate against `TWILIO_WEBHOOK_BASE_URL` + the route path, never a
  proxy-reconstructed hostname (plan §8). Add `twilio` to
  `apps/api/requirements.txt` (and `pyproject.toml` if deps are declared there).
- **Fake provider** — a deterministic in-process implementation of the protocols
  used when `TWILIO_MODE=fake`, making no network calls. Put it beside the real
  adapter (e.g. `providers/twilio/fake.py` or `providers/communications_fake.py`
  — your call, state which in the summary). Tests must not need network access.
- In `disabled` mode every operation raises `communications/not-configured`
  **before** any network call.

### 4. Data model

- Extend `Verification` (`apps/api/db/models/auth.py:181`) with the nullable
  columns in plan §7: `provider`, `provider_sid`, `subject_type`, `subject_id`,
  `channel`, `status`, `attempt_count`, `last_sent_at`, `can_resend_at`,
  `verified_at`, `metadata`. **Verified in §3.2: this table has no readers or
  writers today**, so extension is safe. The OTP value is never stored — not in
  `value`, not in `metadata`.
- `UserMobileNumber` (`apps/api/db/models/users.py:159`) already exists with the
  right shape; do not redefine it. Add a partial unique index guaranteeing one
  primary per user (`(user_id) WHERE is_primary`) per plan §3.3.
- Follow this repo's migration mechanism — inspect `apps/api/db/migrate.py` and
  `apps/api/main.py` (table creation around line 478) and match whatever is
  already used. Do not introduce Alembic if it is not already present.

### 5. Repository + domain

- `apps/api/db/repositories/mobile_numbers.py` — matching the existing repository
  style in that directory.
- `apps/api/domains/mobile_numbers/{router,schemas,docs,service}.py` — the routes
  in plan §8 under `SessionDep`, with strict ownership checks. Route-level
  OpenAPI prose lives in `docs.py`, Pydantic contracts in `schemas.py`, per
  `.claude/rules/api-backend.md`. Mount on the **protected** router in
  `apps/api/api/v1.py`.
- E.164 normalization and validation server-side. `packages/core/src/lib/phone.ts`
  already does this client-side (`parsePhone`, `normalizePhone`) — read it and
  make the two agree on what is valid.
- Verification completion is **one transaction**: approve the verification, mark
  the number verified, set `verified_at`, optionally set primary (clearing any
  other primary), and sync `users.phone` / `users.phone_verified`. Only an
  `approved` provider response completes it. Emit an audit event (see
  `apps/api/domains/audit_events/`) carrying no code.
- Resend cooldown, max send count, and max check attempts, built on
  `apps/api/core/rate_limit.py` (`enforce_rate_limit`) — do not invent a second
  rate-limit mechanism.
- Per-channel flags gate SMS/call/WhatsApp independently; a disabled channel
  returns `communications/channel-disabled` before any provider call.

### 6. SDK — `packages/sdk`

`resources/mobile-numbers.ts`, `resources/mobile-number-verifications.ts`,
`types/mobile-numbers.ts`. Follow the existing resource-factory pattern exactly
(`(runtime) => ({ verb() {…} })`, Zod-validated responses, `{ data, error }`
envelopes, endpoint constants) — copy the shape of an existing resource file
rather than inventing one. Verbs: `create`, `retrieve`, `update`, `delete`,
`list` on mobile numbers; `create`, `approve` on verifications. **Nothing
admin-tier goes in `@876/sdk`.** Do not add messaging or call resources in this
phase.

### 7. Tests

`apps/api/tests/`: `test_twilio_client.py`, `test_twilio_errors.py`,
`test_twilio_signatures.py`, `test_mobile_number_verification.py`. Cover plan §14
"Provider" and "Domain" bullets: form-encoded request shape, API-key auth,
response conversion, timeout handling, error mapping, signature validation
(valid, invalid, wrong URL), E.164 validation, ownership enforcement, the
one-primary constraint, resend cooldown, attempt limits, approved/expired/failed/
max-attempt states, transaction rollback when the DB update fails, disabled-mode
and disabled-channel behavior, and that no OTP value is ever persisted. Plus SDK
tests matching the existing SDK test style. **No test may touch the network.**

Also add regression coverage that the WorkOS email magic-OTP flow
(`auth_email_otps`) is unaffected.

## Hard constraints

- Nothing may contact Twilio by default. Default mode is `disabled`, every
  channel flag defaults to `false`.
- 876 never generates or stores an OTP code.
- No Twilio credential may reach a browser bundle.
- `user_profiles.phone_number` is display-only — never read it for a verification
  or auth decision, and do not migrate it.
- Do not touch the WorkOS auth flow, `AuthProvider`, or `auth_email_otps`.
- Do not add `src/proxy.ts` or `middleware.ts` to any Next.js app.
- Do not implement Phase 2 (messages, calls, TwiML, inbound webhook handlers).

## Verification — all must pass before you report done

```bash
cd /workspaces/876/apps/api && python -m ruff check . && python -m mypy . tests && python -m pytest
cd /workspaces/876 && pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test
```

## Reporting

**Do not commit and do not create a branch.** Leave the work staged in the tree;
the orchestrating agent reviews, formats, and commits. When done, summarize: every
file added/changed, where you put the fake provider, which migration mechanism you
used and why, the exact verification command output, and anything in the plan you
could not implement as written (with the reason) rather than silently deviating.
