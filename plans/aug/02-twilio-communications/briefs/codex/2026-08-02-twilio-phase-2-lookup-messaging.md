# Codex brief — Twilio Phase 2: Lookup, carrier intelligence, and messaging

**Model:** gpt-5.6-terra, high reasoning. **Repo:** `/workspaces/876`.
**Branch:** `feat/twilio-messaging-lookup` — already created and checked out.
Phase 1 is committed and merged into this branch's history; build on it.

**Read first:** `docs/plans/twilio-communications.md` (§3 discovery findings, §7
data model, §8 API surface, §11 error registry, §12 abuse controls) and
`apps/api/providers/twilio/` as it now stands — you wrote it, but the reviewer
changed three things: the httpx client is pooled per credential pair via
`_shared_client` and closed by `close_shared_clients()` in the app lifespan,
`mask_phone_number` is now wired through `TwilioClient._request(to_number=…)`,
and the Lookup base URL is injectable (`lookup_base_url`). Do not undo these.

Also read `.claude/rules/api-backend.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/stripe-api-pattern.md`, and `.claude/rules/code-style.md`.

## Priority order — this matters

The two capabilities wanted first for real testing are **Lookup** and **SMS
OTP**. SMS OTP shipped in Phase 1. So **Lookup is the highest-value item in this
phase — build it first and completely**, then messaging. If you run short, it is
far better to deliver Lookup finished and messaging partial than both half-done.

## 1. Lookup — validation, formatting, and carrier identification

`TwilioClient.create_lookup` and `TwilioPhoneLookupProvider` already exist but
have **no endpoint and no data model**. Finish them.

### Line-type / carrier intelligence

Twilio Lookup v2 returns basic validity and E.164/national formatting for free.
**Carrier and line type require the paid `line_type_intelligence` data package**,
requested via a `Fields` query parameter. Therefore:

- Add `TWILIO_LOOKUP_LINE_TYPE_ENABLED=false` alongside the existing
  `TWILIO_LOOKUP_ENABLED`. Requesting the paid package must be a **separate,
  explicitly-enabled** decision, because it bills per lookup.
- `create_lookup` takes an explicit `include_line_type: bool` and only sends
  `Fields=line_type_intelligence` when both the flag and the argument are true.
- The `PhoneLookup` dataclass carries: `valid`, `e164`, `national_format`,
  `country_code`, and nullable `carrier_name`, `line_type`, `mobile_country_code`,
  `mobile_network_code`. Nullable because they are absent without the paid package.
- **Never** silently fall back to requesting the paid package.

### Endpoint

`POST /communications/phone-lookups` under `AdminDep`, in a new
`apps/api/domains/communications/` domain (`router.py`, `schemas.py`, `docs.py`,
`service.py`). Server-only per plan §8 — it costs money per call, so it must not
be reachable from a browser on an ordinary user session.

Cache lookups: add a `communication_phone_lookups` table (or reuse a sensible
existing pattern) keyed on the normalized E.164 number, storing the resolved
fields, `line_type_requested`, and `created_at`. A repeat lookup of the same
number inside a configurable TTL (default 30 days) returns the cached row without
billing a second request. This is the single most important cost control here.

### Relationship to `packages/core/src/lib/phone.ts` — read carefully

The intent is to move authoritative formatting/validation onto Twilio. Do **not**
delete or bypass the local `parsePhone`/`normalizePhone`/`formatPhone` helpers:

- **Local helpers stay** as the synchronous, free, offline path used for
  input-time UI feedback and for the E.164 normalization the API already does on
  write. A network round-trip per keystroke is not viable, and Lookup costs money
  per call.
- **Twilio Lookup becomes the authoritative check** at submission time — when a
  number is added, before a verification is sent, and wherever carrier/line type
  matters.
- Where the two disagree on validity, **Twilio wins** and the local result is
  treated as a provisional hint.

Wire it so that `MobileNumberService.create` optionally consults Lookup when
`TWILIO_LOOKUP_ENABLED` is on: a Lookup `valid: false` rejects the number with
`communications/invalid-phone-number`, and the returned E.164 is stored in
preference to the locally normalized value. When the flag is off, behaviour is
exactly as today. When Lookup errors or times out, **fail open to the local
result** and log it — a provider outage must not block a user adding a number.

Persist `carrier_name` and `line_type` onto the mobile number row when known
(add nullable columns), so a later phase can refuse to SMS a landline.

## 2. Messaging — SMS and WhatsApp

Per plan §7 and §10. Only after Lookup is complete.

- `communication_messages` model in `db/models/communications.py`, registered in
  `db/models/__init__.py` (§3.1), with the fields in plan §7. Store
  `body_preview` and `body_hash`, **not** the full body.
- Repository + `apps/api/domains/communications/` service verbs, reusing the
  domain you created for Lookup.
- `POST/GET /communications/messages` under `AdminDep`.
- **Server-owned template registry.** A caller supplies a `template_key`, never
  raw body text and never a `ContentSid`. Unknown key ⇒
  `communications/invalid-template` **before** any provider call. WhatsApp
  template keys map server-side to a `ContentSid`.
- **Idempotency**: unique on `(idempotency_key)` per tenant/app; a duplicate
  returns the existing record rather than sending twice.
- Implement `MessagingProvider` on the Twilio adapter (the protocol already
  exists) against Programmable Messaging, form-encoded, using
  `TWILIO_MESSAGING_SERVICE_SID`.

## 3. Webhooks — status callbacks and inbound

- New `apps/api/domains/twilio_webhooks/` mounted on the **public** router in
  `api/v1.py` (plan §3.6 — precedent is `oauth_router`/`geo_router`), because
  Twilio cannot present an 876 API key.
- Every route validates the signature via the existing `TwilioWebhookVerifier`
  before doing anything else; invalid ⇒ `communications/invalid-webhook-signature`.
- `communication_webhook_events` table for idempotency: dedupe on
  `(provider_sid, event_type, payload_hash)`; a replay is a no-op.
- **Status callbacks are not ordered.** Define an explicit rank
  (`queued < sent < delivered < read`, with `failed`/`undelivered` terminal) and
  never let a lower-ranked or non-terminal update overwrite a terminal status.
  Test this directly by applying callbacks out of order.
- Extend `TwilioWebhookVerifier` to include the query string in the signed URL —
  Twilio signs the full URL, so a callback URL carrying query params currently
  fails validation.

## Out of scope for this phase

Programmable Voice, TwiML endpoints, outbound calls, the Console log, and any
production activation. Do not start them.

## Hard constraints

- Everything stays disabled by default; new flags default `false`.
- No browser-reachable send path; messages and lookups are `AdminDep` only.
- No raw body text or `ContentSid` from a caller.
- No full message bodies in logs or in the database by default.
- Never store an OTP.
- No cross-database foreign keys; core entities are opaque ID columns.
- Do not add `src/proxy.ts` or `middleware.ts` to any Next.js app.
- Do not modify `pnpm-lock.yaml` unless you genuinely add a JS dependency — the
  sandbox regenerates it with different peer resolution, and that churn must not
  be committed.

## SDK

Add to `@876/admin` only (`packages/admin`): `messages.create/retrieve/list` and
`phoneLookups.create`. **Nothing** from this phase goes in `@876/sdk` — these are
`AdminDep` endpoints and the auth-tier gating rule forbids it.

## Verification — all must pass before reporting done

```bash
cd /workspaces/876/apps/api && ./.venv/bin/python -m ruff check . \
  && ./.venv/bin/python -m mypy providers/ domains/communications/ domains/twilio_webhooks/ domains/mobile_numbers/ db/ tests/ \
  && ./.venv/bin/python -m pytest -q
cd /workspaces/876 && pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
```

Expect the existing 570 API tests to still pass, plus yours. There is no `python`
on PATH — use `./.venv/bin/python`. `mypy . tests` fails on a pre-existing
duplicate-module issue; use the targeted form above and do not try to fix it.

Test coverage required (plan §14): Lookup caching and TTL, the paid-package flag
gating, local-vs-Twilio disagreement, fail-open on Lookup outage, template-key
rejection before any provider call, idempotent duplicate sends, out-of-order and
replayed status callbacks, signature validation including a query string, and
that no message body is persisted in full.

## Reporting

**Do not commit and do not branch** — the orchestrating agent owns all git.
Report every file added/changed, the exact verification output, and anything you
could not implement as specified, with the reason, rather than deviating silently.
