# Twilio Communications

Plan of record for adding phone verification, SMS/WhatsApp messaging, and
programmable voice to the 876 platform.

**Status:** Phase 0 (discovery and contracts) complete. No provider code written.
Nothing in this plan sends a message, places a call, or contacts Twilio until
Phase 6 activation is performed deliberately, per channel.

---

## 1. Objective

A reusable communications capability supporting, eventually:

- phone-number formatting, normalization, and validation
- OTP verification over SMS, voice call, and WhatsApp
- transactional SMS and WhatsApp messages
- outbound telephone calls
- inbound message and call webhooks
- delivery and call-status tracking
- phone-first registration and login (explicitly a **later, separate** project)

The implementation must be complete and testable but **inactive by default**.

---

## 2. Architectural decision: Twilio is a communications provider, not an auth provider

`providers/protocol.py` defines `AuthProvider` as the identity interface —
registration, login, sessions, recovery, email OTP. Twilio messaging and voice
do not belong on it. They get their own provider-agnostic protocols, implemented
by a Twilio adapter, following the same four-layer shape the WorkOS integration
already uses (`providers/workos/`: `client.py` → `adapter.py` → `errors.py`,
consumed through a protocol):

```python
class PhoneVerificationProvider(Protocol):
    async def create_verification(...) -> PhoneVerification: ...
    async def approve_verification(...) -> PhoneVerification: ...

class MessagingProvider(Protocol):
    async def create_message(...) -> ProviderMessage: ...
    async def retrieve_message(...) -> ProviderMessage: ...

class VoiceProvider(Protocol):
    async def create_call(...) -> ProviderCall: ...
    async def retrieve_call(...) -> ProviderCall: ...

class PhoneLookupProvider(Protocol):
    async def create_lookup(...) -> PhoneLookup: ...

class CommunicationsWebhookVerifier(Protocol):
    def validate(...) -> bool: ...
```

---

## 3. Phase 0 discovery findings

These were verified against the tree on 2026-08-02 and **change several
assumptions in the original plan**. Read this section before implementing.

### 3.1 `apps/api/db/models.py` no longer exists

Models are a package: `apps/api/db/models/` (`users.py`, `auth.py`, `orgs.py`,
`billing_*.py`, …) re-exported from `db/models/__init__.py`. New communications
models go in `db/models/communications.py` and must be added to both the import
list and `__all__` in `db/models/__init__.py`. (Root `CLAUDE.md` still says
`db/models.py`; that reference is stale and should be corrected separately.)

### 3.2 The `verifications` table has **no readers and no writers**

`Verification` (`db/models/auth.py:181`) is declared, and its table is created,
but nothing in `apps/api` — no repository, service, router, or test — reads or
writes it. Every `grep` hit for "Verification" outside the model file is either
an unrelated docstring, a WorkOS `email_verification_required` auth event, or a
test fixture.

**Consequence:** the original plan's caution about preserving compatibility with
existing verification functionality does not apply — there is none to preserve.
The table can be extended freely in Phase 2.

Do not confuse it with `auth_email_otps` (`AuthEmailOtpChallenge`,
`db/models/auth.py:193`), which **is** live and backs the WorkOS email magic-OTP
login flow. That table is untouched by this work. It is also the local precedent
for the resend/attempt fields this plan adds (`last_sent_at`, `can_resend_at`,
`send_count`, `verified_at`).

**Decision — extend `verifications`, do not add a parallel challenge table.**
Both `user_emails.verification_id` and `user_mobile_numbers.verification_id`
already carry a foreign key to `verifications.id`. A new table would orphan those
columns or force a migration of a schema nobody uses yet. `auth_email_otps` stays
separate because it is a WorkOS login artifact, not a generic contact-point
challenge.

### 3.3 `user_mobile_numbers` is greenfield

`UserMobileNumber` (`db/models/users.py:159`) exists with the right shape —
`user_id`, `number`, `type`, `is_primary`, `verification_status`,
`verification_id`, `verified_at`, unique on `(user_id, number)` — and its table is
created in `main.py:478`. It has **no repository, no routes, no schemas, and no
SDK surface**. Phase 2 builds all of that from scratch; there is no legacy
behavior to preserve.

Gap to close in Phase 2: there is no database-level guarantee of one primary per
user. Add a partial unique index on `(user_id) WHERE is_primary` alongside the
service-level rule.

### 3.4 `users.phone` has readers; `users.phone_verified` has none

`users.phone` is read (never written outside user creation) by:

- `services/provisioning.py:87`
- `services/billing_customer_sync.py:120` (customer snapshot → outbox)
- `domains/users/router.py:202`, as a fallback for `profile.phone_number`

`users.phone_verified` has no readers at all.

**Consequence:** treating both as compatibility projections of the primary
mobile number is safe. Note that changing `users.phone` alters the
billing-customer snapshot payload hash and will legitimately enqueue a
`customer.ensure` — that is correct behavior, and the outbox already deduplicates
by payload hash.

### 3.5 `user_profiles.phone_number` is display-only

Read/written only by the profile endpoints (`domains/users/router.py:202,336`,
`domains/users/schemas.py:235,250`). It is free-text and unverified. It must
never be used for a verification or authentication decision. Phase 2 does not
migrate it.

### 3.6 The public-router precedent already exists

`api/v1.py` mounts `protected_router` (with `require_api_key`) alongside public
routers — `oauth_router`, `apps_public_router`, `geo_router` — each enforcing its
own credential rules. Twilio webhook routes mount on the **public** `router` and
authenticate by signature validation, exactly as the OAuth surface does. No new
routing concept is needed.

### 3.7 Dependencies and helpers already present

- `httpx>=0.28` is already a dependency and is how WorkOS is called. Use it for
  outbound Twilio REST. The `twilio` package is **not** installed; add it for
  `RequestValidator` and TwiML generation only.
- `core/rate_limit.py` (`enforce_rate_limit`) exists and is what the abuse
  controls in §12 should build on rather than a new mechanism.
- `core/security.py` provides `SessionDep`, `ConsumerSessionDep`,
  `EnterpriseSessionDep`, `AdminDep`.
- `packages/core/src/lib/phone.ts` already exports `parsePhone`,
  `normalizePhone`, `listDialCodes`, `formatPhone`, backed by `countries.json`.
  Client-side formatting is done; the API needs its own E.164 normalization,
  and the two must agree.

---

## 4. Twilio products

| 876 capability         | Twilio product                       | Purpose                               |
| ---------------------- | ------------------------------------ | ------------------------------------- |
| SMS OTP                | Verify API                           | Generate, deliver, and check codes    |
| Voice OTP              | Verify API, `call` channel           | Deliver codes by telephone            |
| WhatsApp OTP           | Verify API, `whatsapp` channel       | Deliver codes over WhatsApp           |
| SMS messages           | Programmable Messaging               | Transactional notifications           |
| WhatsApp messages      | Programmable Messaging + Content API | Free-form or approved templates       |
| Telephone calls        | Programmable Voice                   | Outbound calls and status tracking    |
| Number validation      | Lookup v2                            | Validate and normalize numbers        |
| Delivery tracking      | Status callbacks                     | Update local message and call records |
| Inbound communications | Messaging and Voice webhooks         | Receive incoming messages and calls   |

Twilio Verify owns code generation and verification state. **876 never generates
or stores the raw OTP.**

---

## 5. Backend structure

```text
apps/api/
├── providers/
│   ├── communications.py            # provider-agnostic protocols + dataclasses
│   └── twilio/
│       ├── __init__.py
│       ├── client.py                # async httpx REST client
│       ├── adapter.py               # Twilio objects → 876 types
│       ├── errors.py                # provider errors → platform error codes
│       ├── signatures.py            # RequestValidator wrapper
│       └── types.py
│
├── domains/
│   ├── mobile_numbers/{router,schemas,docs,service}.py
│   ├── communications/{router,schemas,docs,service}.py
│   └── twilio_webhooks/{router,schemas,docs,service}.py
│
├── db/
│   ├── models/communications.py     # + register in db/models/__init__.py
│   └── repositories/
│       ├── mobile_numbers.py
│       ├── communication_messages.py
│       ├── communication_calls.py
│       └── communication_webhook_events.py
│
└── tests/
    ├── test_twilio_client.py
    ├── test_twilio_errors.py
    ├── test_twilio_signatures.py
    ├── test_mobile_number_verification.py
    ├── test_communication_messages.py
    ├── test_communication_calls.py
    └── test_twilio_webhooks.py
```

---

## 6. Configuration

Extend `core/config.py` following the existing WorkOS/Stripe/PostHog field style
(`Field(default="", validation_alias="…")`).

```env
TWILIO_MODE=disabled            # disabled | fake | live

TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_KEY_SECRET=
TWILIO_AUTH_TOKEN=              # required for webhook signature validation

TWILIO_VERIFY_SERVICE_SID=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_VOICE_FROM_NUMBER=
TWILIO_WHATSAPP_FROM=
TWILIO_WEBHOOK_BASE_URL=

TWILIO_LOOKUP_ENABLED=false
TWILIO_VERIFY_SMS_ENABLED=false
TWILIO_VERIFY_CALL_ENABLED=false
TWILIO_VERIFY_WHATSAPP_ENABLED=false
TWILIO_SMS_ENABLED=false
TWILIO_WHATSAPP_ENABLED=false
TWILIO_VOICE_ENABLED=false
```

- `disabled` — every operation fails with `communications/not-configured` before
  any network call.
- `fake` — deterministic responses for local development and tests, no network.
- `live` — real requests, permitted only when the required credentials exist.

Outbound REST uses the API key + secret. The account Auth Token is retained
solely because webhook signature validation requires it.

---

## 7. Data model

### Source-of-truth rule

`user_mobile_numbers` is the canonical phone-number store.

- `number` is stored in E.164.
- Multiple numbers per user; exactly one primary (service rule **and** partial
  unique index).
- `users.phone` / `users.phone_verified` are compatibility projections of the
  primary number, synchronized in the same transaction.
- `user_profiles.phone_number` is display-only and never authoritative.

### Verification record additions

Nullable additions to `verifications` (safe — see §3.2):

```text
provider  provider_sid  subject_type  subject_id  channel  status
attempt_count  last_sent_at  can_resend_at  verified_at  metadata
```

The OTP itself is never written to `value` or anywhere else — only provider
correlation data, status, timestamps, and safe metadata.

### `communication_messages`

```text
id  provider  provider_sid  channel(sms|whatsapp)  direction  status
to_number  from_number  messaging_service_sid  content_sid
body_preview  body_hash
user_id  organization_id  app_id  client_reference  idempotency_key
provider_error_code
sent_at  delivered_at  read_at  failed_at  created_at  updated_at
```

Retain a preview or hash plus delivery metadata by default. Store a full body
only where a product has a documented business and retention requirement.

### `communication_calls`

```text
id  provider  provider_sid  direction  status  to_number  from_number
template_key  user_id  organization_id  app_id  client_reference
idempotency_key  duration_seconds  provider_error_code
started_at  answered_at  completed_at  created_at  updated_at
```

### `communication_webhook_events`

```text
id  provider  event_type  provider_sid  payload_hash
signature_valid  processed_at  processing_error  created_at
```

Provides webhook idempotency and debugging. **Status callbacks are not ordered** —
Twilio makes no ordering guarantee — so status updates need an explicit
transition precedence and must never let a non-terminal update regress a terminal
one.

---

## 8. API surface

### Self-scoped mobile numbers (`SessionDep`, ownership-enforced)

```http
POST   /users/me/mobile-numbers
GET    /users/me/mobile-numbers
GET    /users/me/mobile-numbers/{mobile_number_id}
PATCH  /users/me/mobile-numbers/{mobile_number_id}
DELETE /users/me/mobile-numbers/{mobile_number_id}
POST   /users/me/mobile-numbers/{mobile_number_id}/verifications
POST   /users/me/mobile-numbers/{mobile_number_id}/verifications/{verification_id}/approve
POST   /users/me/mobile-numbers/{mobile_number_id}/make-primary
```

### Server-only communications (`AdminDep` initially)

```http
POST /communications/messages
GET  /communications/messages
GET  /communications/messages/{message_id}
POST /communications/calls
GET  /communications/calls
GET  /communications/calls/{call_id}
POST /communications/phone-lookups
```

Never reachable from a browser on the strength of an ordinary user session. A
later phase may introduce explicit app scopes (`communications:verify`,
`communications:messages:create`, …).

### Twilio webhooks (public router, signature-authenticated)

```http
POST /webhooks/twilio/messages/inbound
POST /webhooks/twilio/messages/status
POST /webhooks/twilio/calls/inbound
POST /webhooks/twilio/calls/status
POST /webhooks/twilio/voice
```

Twilio cannot present an 876 API key, so these mount on the public router
(precedent: §3.6). Signatures are computed over the **exact configured public
URL** — validate against `TWILIO_WEBHOOK_BASE_URL`, never a proxy-reconstructed
internal hostname. Parsing must tolerate unknown future fields.

---

## 9. SDK surface

### `@876/sdk` — the caller's own numbers only

```ts
$876.mobileNumbers.create / retrieve / update / delete / list
$876.mobileNumberVerifications.create / approve
```

```text
packages/sdk/src/resources/mobile-numbers.ts
packages/sdk/src/resources/mobile-number-verifications.ts
packages/sdk/src/types/mobile-numbers.ts
```

### `@876/admin` — privileged

```ts
$876.messages.create / retrieve / list
$876.calls.create / retrieve / list
$876.phoneLookups.create
```

Per the auth-tier gating rule, unrestricted `messages.create()` /
`calls.create()` must never appear in the consumer SDK.

---

## 10. Core workflows

**Phone verification.** Create number → normalize/validate → create pending
verification → Twilio Verify (`sms` | `call` | `whatsapp`) → user submits code →
Twilio check → **only an `approved` provider response completes verification** →
in one transaction: approve verification, mark number verified, set
`verified_at`, optionally set primary, sync `users.phone`/`phone_verified` →
emit an audit event carrying no code.

The WorkOS email magic-OTP flow is unchanged and stays separate.

**SMS / WhatsApp.** Authorize caller → resolve a **server-owned template key**
→ create the local record with an idempotency key → send → store SID and initial
status → advance state from signed status callbacks. WhatsApp free-form is
permitted only inside the 24-hour customer-service window; otherwise an approved
template, addressed by a platform template key mapped server-side to a
`ContentSid`. A browser must never supply a `ContentSid`.

**Voice.** Authorize → accept a platform `templateKey` (**never** caller-supplied
TwiML or an arbitrary URL) → resolve to a signed 876 TwiML endpoint → create the
pending record → place the call → store the SID → track initiated/ringing/
answered/completed and terminal outcomes.

---

## 11. Error registry

```text
communications/not-configured          communications/channel-disabled
communications/invalid-phone-number    communications/number-already-used
communications/number-not-verified     communications/verification-pending
communications/verification-expired    communications/verification-failed
communications/max-attempts-reached    communications/rate-limited
communications/provider-unavailable    communications/delivery-failed
communications/invalid-template        communications/invalid-webhook-signature
communications/duplicate-request
```

`providers/twilio/errors.py` maps Twilio HTTP statuses and provider error codes
onto these, and logs the upstream code, HTTP status, resource SID, 876
correlation ID, and safe context. It must never log OTP codes, API secrets,
full message bodies, or unmasked phone numbers.

---

## 12. Abuse and cost controls

Built on `core/rate_limit.py`, in the provider service (so every 876 app inherits
them), before any live traffic: per-user / per-number / per-IP / per-org / per-app
limits; resend cooldown; max code-check attempts; daily verification, message,
and call budgets; destination-country allowlists; restricted API keys; per-channel
flags; app-level permissions; duplicate-send prevention; a production test-number
denylist; audit events on every outbound operation; **no automatic retry after an
uncertain provider timeout**; and explicit consent/opt-out handling before any
recurring or marketing messaging.

---

## 13. Phases

Three phases, each a self-contained unit that lands on `main` under its own
branch and PR. No long-lived integration branch: every phase is coherent on its
own, leaves the platform working, and ships nothing live (all channels stay
disabled until §13 Phase 3 activation).

| Phase | Scope                                                                                                                                                                                                                                                                                     | Branch                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0     | Discovery and contracts — this document (lands with Phase 1)                                                                                                                                                                                                                              | —                                   |
| 1     | **Foundation and phone verification** — config + `disabled`/`fake`/`live` modes, provider protocols, Twilio client/adapter/errors/signature validator, fake provider, `verifications` extension, mobile-number domain and routes, Verify across SMS/call/WhatsApp, consumer SDK resources | `feat/twilio-verification`          |
| 2     | **Messaging and voice** — message and call models/repositories/services, server-owned template registry, WhatsApp Content mapping, outbound SMS/WhatsApp/calls, inbound and status webhooks, TwiML endpoints, admin SDK resources                                                         | `feat/twilio-messaging-voice`       |
| 3     | **Console, observability, and activation** — read-only communications log, delivery/failure/latency metrics, budget and rate-limit visibility, safe manual retry, then controlled per-channel production activation                                                                       | `feat/twilio-console-observability` |

Phase 1 merges before Phase 2 starts — Phase 2's messages and calls reuse Phase
1's client, adapter, error registry, signature validator, and mode gating.

**Phase 1 acceptance.** The API starts with no Twilio credentials; every
operation returns `communications/not-configured` in `disabled` mode; `fake` mode
needs no network; no credential can reach a browser bundle; invalid webhook
signatures are rejected. No OTP value is stored anywhere; a user cannot read or
verify another user's number; only an `approved` Twilio response marks a number
verified; the WorkOS email magic-OTP flow is unchanged; every channel is off by
default.

**Phase 2 acceptance.** Browser-originated arbitrary sends are impossible;
duplicate idempotency keys do not double-send; unknown template keys fail before
contacting Twilio; out-of-order status callbacks cannot regress a terminal
status; message bodies are not logged; no caller-supplied TwiML or external URL
is accepted; calls use only configured senders; recording stays disabled.

**Phase 3 activation order.**

```text
Lookup → SMS Verify → Voice Verify → WhatsApp Verify
      → transactional SMS → WhatsApp templates → outbound voice → inbound
```

Each step: internal allowlisted numbers first, budget alerts configured,
rollback documented.

---

## 14. Test coverage

**Provider** — form-encoded requests, API-key auth, response conversion, timeout
handling, error mapping, signature validation, public-URL reconstruction, unknown
webhook fields.

**Domain** — E.164 validation, ownership, primary-number constraint, resend
cooldown, attempt limits, approved/expired/failed/max-attempt states, transaction
rollback on database failure, disabled-channel behavior, idempotency, out-of-order
callbacks, masked logging.

**SDK** — resource composition, Zod input/response validation, paths and methods,
`{ data, error }` behavior, no admin resources in consumer bundles.

**Regression** — WorkOS login, email magic OTP, registration, session
establishment, existing profile updates.

---

## 15. Definition of done

Provider-neutral interfaces; the codebase works with no Twilio credentials; every
live capability defaults off; fake-provider tests need no network; one documented
source of truth for mobile numbers; 876 never generates or stores an OTP; one
shared verification flow across all three channels; local correlation records for
messages and calls; signed, idempotent, order-safe callbacks; no arbitrary user
can send or call; SDK methods follow existing resource patterns; API/SDK/env/
activation docs complete; `ruff`, `mypy`, `pytest` and the TypeScript package
tests and builds all pass.

---

## 16. Explicitly out of scope

Phone-first registration; passwordless phone login; automatic linking of an
unknown number to a user; marketing or bulk messaging; call recording;
browser-held Twilio credentials; user-supplied TwiML; automatic provider retries
without idempotency; production activation; replacing WorkOS email OTP.

Session issuance and account-resolution rules for phone-first auth are a separate
project that this foundation makes possible.
