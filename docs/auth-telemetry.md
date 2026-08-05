# Auth Device and Geo Telemetry Plane

## What this is

The authentication telemetry plane records who signed in, from where, and on what device, for every authentication attempt across every 876 app. It captures client device signals, Cloudflare edge geo/IP metadata, and parsed user agents, persisting them into audit records, device profiles, and active user sessions.

---

## The path a signal takes

1. **Browser**: `collectDeviceSignal` in `packages/device/src/index.ts` gathers fingerprint components, high-entropy client hints (`navigator.userAgentData`), screen dimensions, and locale metadata into an encoded base64url signal blob.
2. **SDK**: `sendAuthRequest` in `packages/sdk/src/request.ts` invokes `collectDeviceSignal` on authentication mutations and attaches the serialized signal to the `x-876-device` HTTP header.
3. **App Bridge**: `proxyAuthRequest` and `buildForwardHeaders` in `apps/876/src/app/api/auth/[...path]/route.ts` call `extractRequestContext` and `requestContextHeaders` in `packages/core/src/request-context/index.ts` to extract Cloudflare edge geo/IP headers (`cf-connecting-ip`, `cf-ipcountry`, etc.) and forward them along with `x-876-device` and `X-876-API-Key` to FastAPI.
4. **FastAPI Trust Verification**: `require_api_key` in `apps/api/core/security.py` validates the app API key, setting `request.state.api_key`. `resolve_request_context` in `apps/api/core/request_context.py` checks this flag and decodes `x-876-*` headers into a `RequestContext` marked `trusted=True`.
5. **Telemetry Recording**: `AuthTelemetryService.record` in `apps/api/services/auth_telemetry.py` decodes `x-876-device`, refines user-agent parsing via `refine_with_client_hints` in `apps/api/core/user_agent.py`, upserts a device row via `UserDeviceRepository.record_seen` in `apps/api/db/repositories/user_devices.py`, and creates an attempt log via `AuthAttemptRepository.create` in `apps/api/db/repositories/auth_attempts.py`.
6. **Session Minting**: `establish_session` in `apps/api/domains/auth/session_state.py` receives the returned `AttemptContext` and stamps `device_id`, IP, country, region, city, ASN, and AS organization directly onto the new session row in `sessions`.

---

## The trust boundary

The trust boundary determines whether forwarded geo and client IP headers are trusted by the API. Geo and IP headers (`x-876-client-ip`, `x-876-geo-country`, etc.) are accepted only when the caller presents a valid app API key (`876_app_secret_*`), confirming the request comes from one of our own server-side Next.js app bridges (`require_api_key` in `apps/api/core/security.py`).

If an unauthenticated or direct client caller includes `x-876-*` headers, `resolve_request_context` in `apps/api/core/request_context.py` ignores them entirely. The context falls back to the raw connection IP (`cf-connecting-ip` or socket host) and standard `user-agent` header, sets all geo fields to `None`, and marks `context_trusted = False` on the resulting attempt row. This prevents any client from spoofing country origins or geographic metadata.

---

## What is captured

### `auth_attempts` table

| Column               | Type                | Meaning                                                                   |
| -------------------- | ------------------- | ------------------------------------------------------------------------- |
| `id`                 | `String`            | Primary key (`atmp_…`).                                                   |
| `event`              | `String`            | Authentication event type (`login`, `register`, `callback`, etc.).        |
| `outcome`            | `String`            | Outcome of the attempt (`succeeded`, `failed`, or `pending`).             |
| `failure_code`       | `String \| None`    | Application error code for failed/pending attempts.                       |
| `identifier`         | `String \| None`    | Lowercased email address or username attempted.                           |
| `user_id`            | `String \| None`    | Foreign key to `users.id` if user was resolved.                           |
| `app_id`             | `String \| None`    | Foreign key to `apps.id` of calling application.                          |
| `session_id`         | `String \| None`    | Minted session ID if authentication succeeded.                            |
| `realm`              | `String \| None`    | Login entry point realm (`consumer` or `enterprise`).                     |
| `device_id`          | `String \| None`    | Foreign key to `user_devices.id` if device was recorded.                  |
| `device_fingerprint` | `String \| None`    | Visitor ID fingerprint extracted from client device signal.               |
| `ip_address`         | `String \| None`    | Resolved client IP address.                                               |
| `ip_country_code`    | `String(2) \| None` | ISO 3166-1 alpha-2 country code.                                          |
| `ip_region_code`     | `String \| None`    | ISO region code.                                                          |
| `ip_region`          | `String \| None`    | Region or state name.                                                     |
| `ip_city`            | `String \| None`    | City name.                                                                |
| `ip_postal_code`     | `String \| None`    | Postal or ZIP code.                                                       |
| `ip_timezone`        | `String \| None`    | IANA timezone name.                                                       |
| `ip_latitude`        | `String \| None`    | Geolocation latitude as text string.                                      |
| `ip_longitude`       | `String \| None`    | Geolocation longitude as text string.                                     |
| `ip_asn`             | `String \| None`    | Autonomous System Number.                                                 |
| `ip_as_organization` | `String \| None`    | Autonomous System organization name.                                      |
| `user_agent`         | `Text \| None`      | Full raw User-Agent header text.                                          |
| `device_type`        | `String \| None`    | Resolved device category (`desktop`, `mobile`, `tablet`, `bot`, `other`). |
| `device_brand`       | `String \| None`    | Device manufacturer brand.                                                |
| `device_model`       | `String \| None`    | Device model name.                                                        |
| `os_name`            | `String \| None`    | Operating system family name.                                             |
| `os_version`         | `String \| None`    | Operating system version string.                                          |
| `browser_name`       | `String \| None`    | Web browser name.                                                         |
| `browser_version`    | `String \| None`    | Web browser version string.                                               |
| `is_bot`             | `Boolean`           | True if User-Agent matched bot/crawler signatures.                        |
| `context_trusted`    | `Boolean`           | True if IP and geo metadata came from a validated API key.                |
| `risk_score`         | `Integer \| None`   | Reserved for risk engine score.                                           |
| `risk_reasons`       | `JSON \| None`      | Reserved for risk engine factor list.                                     |
| `request_id`         | `String \| None`    | Trace identifier (`x-request-id`).                                        |
| `created_at`         | `BigInteger`        | Unix timestamp in seconds when recorded.                                  |

### `user_devices` table

| Column              | Type                 | Meaning                                                          |
| ------------------- | -------------------- | ---------------------------------------------------------------- |
| `id`                | `String`             | Primary key (`dev_…`).                                           |
| `user_id`           | `String`             | Foreign key to `users.id`.                                       |
| `fingerprint`       | `String`             | Client visitor ID fingerprint (`visitorId`).                     |
| `confidence`        | `String`             | Fingerprint confidence level (`low`, `medium`, `high`).          |
| `device_type`       | `String`             | Device category (`desktop`, `mobile`, `tablet`, `bot`, `other`). |
| `device_brand`      | `String \| None`     | Device manufacturer brand.                                       |
| `device_model`      | `String \| None`     | Device model name.                                               |
| `os_name`           | `String \| None`     | Operating system family name.                                    |
| `os_version`        | `String \| None`     | Operating system version string.                                 |
| `browser_name`      | `String \| None`     | Web browser name.                                                |
| `browser_version`   | `String \| None`     | Web browser version string.                                      |
| `is_bot`            | `Boolean`            | True if device matched bot/crawler signatures.                   |
| `label`             | `String \| None`     | User or admin assigned custom device label.                      |
| `trusted`           | `Boolean`            | True if explicitly marked trusted by an admin.                   |
| `trusted_at`        | `BigInteger \| None` | Unix timestamp when device was marked trusted.                   |
| `trusted_by`        | `String \| None`     | User ID of administrator who marked device trusted.              |
| `blocked_at`        | `BigInteger \| None` | Unix timestamp when device was blocked.                          |
| `blocked_by`        | `String \| None`     | User ID of administrator who blocked device.                     |
| `block_reason`      | `Text \| None`       | Reason for administrative block.                                 |
| `first_seen_at`     | `BigInteger`         | Unix timestamp when device was first observed for this user.     |
| `last_seen_at`      | `BigInteger`         | Unix timestamp when device was last observed.                    |
| `last_ip`           | `String \| None`     | Most recent IP address seen for this device.                     |
| `last_country_code` | `String(2) \| None`  | Most recent ISO country code seen.                               |
| `sign_in_count`     | `Integer`            | Total successful sign-ins recorded from this device.             |
| `signal`            | `JSON \| None`       | Filtered device signal payload (components excluded).            |
| `created_at`        | `BigInteger`         | Unix timestamp when row was created.                             |
| `updated_at`        | `BigInteger`         | Unix timestamp when row was last updated.                        |

### `sessions` additions

| Column               | Type                 | Meaning                                                      |
| -------------------- | -------------------- | ------------------------------------------------------------ |
| `device_id`          | `String \| None`     | Foreign key to `user_devices.id` associated with session.    |
| `ip_country_code`    | `String(2) \| None`  | ISO country code recorded at session creation.               |
| `ip_region`          | `String \| None`     | Region or state name recorded at session creation.           |
| `ip_city`            | `String \| None`     | City name recorded at session creation.                      |
| `ip_asn`             | `String \| None`     | Autonomous System Number recorded at session creation.       |
| `ip_as_organization` | `String \| None`     | Autonomous System organization recorded at session creation. |
| `last_seen_at`       | `BigInteger \| None` | Unix timestamp when session was last active.                 |
| `revoked_at`         | `BigInteger \| None` | Unix timestamp when session was revoked.                     |
| `revoked_by`         | `String \| None`     | Actor ID or user ID that revoked the session.                |

---

## Events and outcomes

### `event` vocabulary

| Value               | Written when                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `login`             | Password login submitted (`POST /auth/login`).                                                           |
| `register`          | Consumer account registered (`POST /auth/register`).                                                     |
| `register_business` | Business account registered (`POST /auth/register-business`).                                            |
| `social`            | Social OAuth login flow initiated (`POST /auth/social-login`).                                           |
| `callback`          | WorkOS OAuth callback or ID token session exchanged (`POST /auth/callback`, `POST /auth/oauth/session`). |
| `otp_send`          | Magic OTP code dispatch requested (`POST /auth/magic-otp/send`).                                         |
| `otp_verify`        | Magic OTP code verification attempted (`POST /auth/magic-otp/verify`).                                   |
| `password_recover`  | Password recovery email requested (`POST /auth/recover`).                                                |
| `password_reset`    | Password reset completed with token (`POST /auth/reset-password`).                                       |
| `verify_email`      | Registration email verification code submitted (`POST /auth/verify-email`).                              |
| `refresh`           | Access token refreshed via refresh token (`POST /auth/refresh`).                                         |
| `session_switch`    | Active account switched within the signed-in set (`POST /auth/sessions/switch`).                         |
| `signout`           | One account signed out of the set (`POST /auth/sessions/{sid}/signout`).                                 |

### `outcome` vocabulary

| Value       | Written when                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `succeeded` | Authentication succeeded and session/tokens were minted.                                                     |
| `failed`    | Authentication failed due to invalid credentials, expired tokens, or rate limits.                            |
| `pending`   | Step succeeded but legitimately does not authenticate anyone yet (OTP send, recovery mail, social hand-off). |

---

## Failure isolation

Telemetry execution is completely failure-isolated: `AuthTelemetryService.record` in `apps/api/services/auth_telemetry.py` wraps all repository and resolution operations in a top-level `try...except Exception` block. On any database error or internal exception, it logs `auth.telemetry.failed` via `logger.warning` and returns an empty `AuthAttemptRecord(None, None, None)` snapshot. A telemetry outage never fails or degrades an authentication attempt.

This failure isolation is proven by unit tests in `apps/api/tests/test_auth_telemetry.py` under `TestFailureIsolation`:

- `test_a_raising_repository_is_swallowed`
- `test_a_raising_device_upsert_is_swallowed`

---

## Privacy

Telemetry enforces strict privacy boundaries prior to storage:

- **Raw device components**: Raw component digests (`components`) such as canvas, WebGL, audio, and font fingerprints are excluded via `signal.model_dump(exclude={"components"})` before writing to `user_devices.signal`.
- **IP proxy chains**: Full `x-forwarded-for` header chains are truncated (`_fallback_ip` in `apps/api/core/request_context.py` extracts only the first client IP); proxy chains are never stored in full.
- **Coordinates precision**: Latitude and longitude (`ip_latitude`, `ip_longitude`) are stored as text strings rather than floating-point numbers to ensure geographic precision is never distorted by float conversion.

---

## Operating it

The database migration `ensure_session_telemetry_columns` in `apps/api/db/migrate.py` adds the telemetry columns (`device_id`, `ip_country_code`, `ip_region`, `ip_city`, `ip_asn`, `ip_as_organization`, `last_seen_at`, `revoked_at`, `revoked_by`) to existing `sessions` tables. Standard `Base.metadata.create_all` creates new tables (`auth_attempts`, `user_devices`), but does not modify pre-existing tables. Because session creation in `establish_session` runs outside telemetry failure isolation (a session row is non-optional), a missing column on `sessions` would fail every login attempt. Running `ensure_session_telemetry_columns` at startup guarantees these columns exist.

Client device fingerprinting can be disabled in client applications by setting `collectDeviceSignal: false` on `create876Client` in `@876/sdk`, preventing `@876/device` from running browser fingerprint collection or attaching `x-876-device` headers.

---

## Not yet built

- Admin API endpoints (`/devices`, `/auth-attempts`, `/sessions` — all `AdminDep`)
- Console UI (device management, session inspection, sign-in history)
- WorkOS Vault encryption
- Account PINs
- Risk scoring and threat engine (`risk_score`, `risk_reasons`)
- PostHog telemetry event emission
