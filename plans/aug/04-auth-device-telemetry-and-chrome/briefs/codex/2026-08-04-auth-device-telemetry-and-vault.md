# Brief — Auth device telemetry, geo/fraud signals, WorkOS Vault & expanded user identity

**Tool:** Codex (`gpt-5.6-terra`, `model_reasoning_effort=medium`)
**Repo:** `/workspaces/876` (pnpm monorepo, branch off `main`)
**Author:** Opus 5 (primary agent). All design decisions in this document are
already made — implement them as written. Do not re-litigate the design; if
something here is impossible against the real code, implement the closest
faithful thing and say so in your final report.

---

## 0. Read this first

This is a **single, large, one-shot brief**. You will not be prompted again.
Work through the phases **in the order given**. After each phase: run that
phase's verification commands, fix what you broke, and print a short
`PHASE N COMPLETE` marker with a file list before moving on. If you approach
your budget limit, **stop at a phase boundary in a green state** rather than
leaving a half-finished phase.

**Do not commit anything.** Leave all work in the working tree. The
orchestrating agent stages and commits.

### Rules you must read before writing code

- `CLAUDE.md` (repo root) — platform shape, boundaries, no-server-actions,
  no `proxy.ts`/`middleware.ts`, loading-state rules, UI copy rules.
- `.claude/rules/api-backend.md` — FastAPI domain layout (`router.py` /
  `schemas.py` / `docs.py`), `AppHTTPException(http_status_code=...)`,
  `ListObject[T]`, auth deps.
- `.claude/rules/sdk-conventions.md` — `$876.<resource>.<verb>()`, the
  auth-tier gating rule, `retrieveBy<Key>` naming, banned `get*`/`find*`.
- `.claude/rules/app-layout.md` — Console page containers, `ResourceToolbar`,
  `StatusFilterHeading`, detail toolbars, table cell hierarchy, button labels.
- `.claude/rules/app-structure.md` — `_components/` / `features/` placement,
  no barrels, no app-name prefixes.
- `.claude/rules/types.md`, `.claude/rules/code-style.md`,
  `.claude/rules/deletions.md`, `.claude/rules/customer-architecture.md`
  (Layer 1 identity rules — identifications), `.claude/rules/naming.md`.
- `.claude/rules/testing.md` — test standard for everything you add.

### Non-negotiable conventions (repeated because they are the usual failures)

1. **Timestamps are Unix seconds (`BigInteger`)** everywhere in DB/API/SDK.
2. **Every serialized resource carries a Stripe-style `object` discriminator.**
   Lists are `ListObject[T]` → `{ object: "list", data, has_more, url, total_count }`.
3. **`AppHTTPException(code=..., message=..., http_status_code=...)`** — the
   kwarg is `http_status_code`, never `status_code`.
4. **No cross-DB foreign keys** to app datastores. Everything here lives in the
   core identity API's Postgres, so normal FKs to `users`/`apps`/`organizations`
   are correct and expected.
5. **No server actions** in Next.js. Client mutations → thin route handler under
   `app/api/...` that authorizes then calls `$876`.
6. **Console reads go through `$876` from `@/lib/876` (`@876/admin`)**, never raw
   `fetch`.
7. **No green buttons.** Add buttons are `primaryVariant="info"`. Bare-verb
   labels (`Add`, `Edit`, `Export`, `Delete`).
8. **No descriptive `<p>` paragraphs under headings.**
9. **Chrome is never a skeleton** — toolbars/headings/table `<thead>` render
   immediately; only the fetching component is wrapped in `<Suspense>`.
10. **No barrel `index.ts`** re-exporting a directory in app code.
11. Python: `from __future__ import annotations`, full type annotations, must
    pass `mypy` strict as configured.

---

## 1. What we are building, and why

876 is one identity that unlocks many product apps. Today we capture almost
nothing about **who is signing in, from where, and on what**. `sessions` has
nullable `ip_address` / `user_agent` columns that are populated only from a
**client-supplied request body field** (`CallbackRequest.ip_address`) — which is
both unreliable and spoofable, and is set on exactly one code path.

We need, platform-wide and for every app in the ecosystem (current and future):

- **Where a request came from** — IP, country, region, city, timezone, ASN.
- **What device it came from** — device type, brand, model, OS + version,
  browser + version ("iPhone 15 Pro / iOS 18.2 / Safari 18.2", "Samsung
  SM-S928B / Android 15 / Chrome 131", "Windows 11 / Edge 131").
- **A stable device fingerprint** so repeat visits from the same browser are
  recognisable across sign-ups and sign-ins.
- **Every authentication attempt**, successful _or failed_, recorded with all of
  the above — this is the anti-fraud plane.
- **All of it reviewable and manageable in Console.**

Plus, in the same pass, the sensitive-identity work this unblocks:

- **WorkOS Vault**-backed encryption for sensitive identifier values (Jamaican
  TRN first, then passport / driver's licence), replacing today's plaintext
  `user_identifications.value` column.
- **Expanded identification records** (issuing country/authority, issue/expiry
  dates, verification workflow, optional document scan via 876 Storage).
- **Account PIN** support (set / verify / change / clear), for future
  step-up and courier counter-verification flows.

**Explicit scope guard:** this work **records and surfaces** signals. It does
**not** block, challenge, or deny any authentication attempt. Risk scoring is
computed and stored, and the threshold that would enforce it defaults to
disabled. Do not add any code path that rejects a login because of a risk score
unless the settings threshold is explicitly configured above zero.

---

## 2. What already exists (verified — do not re-derive)

| Thing              | Location                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth routes        | `apps/api/domains/auth/router.py` (946 lines), `schemas.py`, `docs.py`, `session_state.py`                                                                                                                  |
| Auth service       | `apps/api/services/auth.py` (already threads `ip_address` / `user_agent` into `SessionRepository.create`)                                                                                                   |
| Session model      | `apps/api/db/models/auth.py` → `class Session` (has `ip_address`, `user_agent`)                                                                                                                             |
| Session repo       | `apps/api/db/repositories/sessions.py`                                                                                                                                                                      |
| WorkOS adapter     | `apps/api/providers/workos/adapter.py`, HTTP client `providers/workos/client.py`, errors `errors.py`                                                                                                        |
| Audit events       | `apps/api/db/models/audit.py`, `domains/audit_events/`, repo `db/repositories/audit_events.py`                                                                                                              |
| PostHog provider   | `apps/api/providers/posthog/client.py` (+ settings `posthog_*` in `core/config.py`)                                                                                                                         |
| Identifications    | model `db/models/users.py::UserIdentification`, registry `core/identifications.py`, repo `db/repositories/user_identifications.py`, routes in `domains/users/router.py` (~line 2064+: list/create/disclose) |
| Geo reference data | `apps/api/domains/geo/` (`/currencies`, `/countries`, `/countries/{code}/regions`), seeds `services/geo_seeds.py`, models `db/models/geo.py`                                                                |
| Client IP helper   | `apps/api/core/security.py::_client_ip` (only `request.client.host` — insufficient)                                                                                                                         |
| Rate limiting      | `apps/api/core/rate_limit.py::enforce_rate_limit`                                                                                                                                                           |
| Auth bridge routes | e.g. `apps/876/src/app/api/auth/[...path]/route.ts`, using `@876/core/fetch/bridge` (`buildSafeBridgePath`, `fetchApiBridge`, `copyBridgeResponse`) — one per app (876, enterprise, console, couriers)      |
| Browser analytics  | `packages/analytics/src/runtime.tsx` (PostHog browser), `audit.ts`, `sanitize.ts`, `types.ts`                                                                                                               |
| SDK request layer  | `packages/sdk/src/request.ts` (`sendAuthRequest`, `getAuthHeaders`) over `@876/core/client`                                                                                                                 |
| Admin client       | `packages/admin/src/client.ts` + `src/resources/*.ts`                                                                                                                                                       |
| Console            | `apps/console/src/app/(app)/…`; **`/sessions/page.tsx` is a stub returning `null`** — this is where session management goes. User detail route is `users/[username]/`.                                      |

Dependencies present in `apps/api/requirements.txt`: asyncpg, fastapi, httpx,
pydantic-settings, pyjwt[crypto], sqlalchemy, structlog, sentry-sdk, uvicorn,
python-multipart, beautifulsoup4, twilio.

---

# PHASE 1 — Signal capture (core API + shared packages)

Goal: every auth-relevant request resolves a trustworthy request context, a
parsed device, and a stable fingerprint, and every attempt is recorded.

## 1.1 `@876/core/request-context` (new, server-side, framework-agnostic)

New file `packages/core/src/request-context/index.ts`, exported as the subpath
`@876/core/request-context` (add to `packages/core/package.json` `exports` and
to `tsconfig`/build config the same way sibling subpaths like
`@876/core/fetch/bridge` are wired — copy that pattern exactly).

```ts
export type RequestGeo = {
  countryCode: string | null   // ISO-3166-1 alpha-2, uppercase
  regionCode: string | null
  region: string | null
  city: string | null
  postalCode: string | null
  timezone: string | null
  latitude: string | null      // strings, never floats — precision + serialization
  longitude: string | null
  asn: string | null
  asOrganization: string | null
}

export type RequestContext = {
  ip: string | null
  userAgent: string | null
  geo: RequestGeo
  origin: string | null
  requestId: string | null
  deviceSignal: string | null  // opaque base64url blob from @876/device
}

export function extractRequestContext(request: Request): RequestContext
export function requestContextHeaders(ctx: RequestContext): Record<string, string>
export const REQUEST_CONTEXT_HEADERS: { readonly [K in keyof …]: string }
```

`extractRequestContext` reads, in precedence order:

- **IP:** `cf-connecting-ip` → `true-client-ip` → first entry of
  `x-forwarded-for` → `x-real-ip` → `null`.
- **Geo:** Cloudflare headers — `cf-ipcountry`, `cf-region-code`, `cf-region`,
  `cf-ipcity`, `cf-postal-code`, `cf-timezone`, `cf-iplatitude`,
  `cf-iplongitude`, `cf-asn` (also accept `cf-ip-asn`), `cf-as-organization`.
  Treat the literal values `XX`, `T1`, and empty string as `null`.
- **User agent:** `user-agent`.
- **Device signal:** `x-876-device`.
- **Origin/request id:** reuse each app's existing `getRequestOrigin` result and
  `x-request-id`.

`requestContextHeaders` serializes to the canonical **`x-876-*` wire headers**
the API trusts (see §1.3):

```
x-876-client-ip, x-876-geo-country, x-876-geo-region-code, x-876-geo-region,
x-876-geo-city, x-876-geo-postal, x-876-geo-timezone, x-876-geo-latitude,
x-876-geo-longitude, x-876-geo-asn, x-876-geo-as-org, x-876-client-ua,
x-876-device
```

Omit any header whose value is null. Values must be sanitized: strip CR/LF,
trim, cap each at 512 chars (`x-876-device` at 8192) — a header injection
through a forwarded value is the one real risk here.

Unit-test this module thoroughly (`packages/core/src/request-context/index.test.ts`):
precedence, `XX`/`T1` normalization, CRLF stripping, length caps, empty-header
behaviour, `x-forwarded-for` with multiple hops and whitespace.

## 1.2 Wire the bridge routes (all four apps)

In **every** app's `src/app/api/auth/[...path]/route.ts`
(`apps/876`, `apps/enterprise`, `apps/console`, `apps/couriers` — find them all;
also do the same for any `[...path]` OAuth bridge that forwards auth traffic),
inside `buildForwardHeaders`:

```ts
const ctx = extractRequestContext(request)
for (const [key, value] of Object.entries(requestContextHeaders(ctx))) {
  headers.set(key, value)
}
```

Do not remove any existing forwarded header. Keep `X-876-API-Key` — it is what
makes the forwarded context trustworthy (see next section).

## 1.3 `apps/api/core/request_context.py` (new)

```python
@dataclass(frozen=True)
class RequestGeo: ...      # same fields as the TS type, snake_case
@dataclass(frozen=True)
class RequestContext:
    ip: str | None
    user_agent: str | None
    geo: RequestGeo
    device_signal: str | None
    origin: str | None
    request_id: str | None
    trusted: bool
```

`resolve_request_context(request: Request) -> RequestContext`:

**Trust rule — this is the security-critical part, implement it exactly.**
The `x-876-*` headers are only honoured when the request presented a valid
876 app API key (i.e. it came from one of our own server-side bridge routes).
Determine this from the already-validated API-key state that `require_api_key`
puts on the request (inspect `core/security.py`; if it does not already stash
the resolved key on `request.state`, add that — a single `request.state.api_key`
assignment — rather than re-validating here). When the request is **not**
API-key-authenticated, ignore every `x-876-*` header and fall back to
`cf-connecting-ip` / `x-forwarded-for` / `request.client.host` and the raw
`user-agent`, with `trusted=False`.

Never log or persist a raw `x-forwarded-for` chain; only the resolved single IP.

Add `apps/api/tests/test_request_context.py` covering: trusted path, untrusted
path ignoring spoofed `x-876-client-ip`, CF fallback, `XX` normalization,
missing everything.

## 1.4 `apps/api/core/user_agent.py` (new) — device parsing

Add dependency to `apps/api/requirements.txt`:

```
ua-parser>=1.0,<2
```

(`ua-parser` v1 is pure-Python with bundled regexes and needs no compiler; if
its import surface differs from what you expect, read the installed package
rather than guessing. If — and only if — it cannot be installed in this
environment, implement a self-contained regex parser in this same module with
the same public API and say so in your report.)

```python
@dataclass(frozen=True)
class ParsedUserAgent:
    device_type: str        # 'desktop' | 'mobile' | 'tablet' | 'bot' | 'other'
    device_brand: str | None
    device_model: str | None
    os_name: str | None
    os_version: str | None
    browser_name: str | None
    browser_version: str | None
    is_bot: bool

def parse_user_agent(user_agent: str | None) -> ParsedUserAgent
```

**Client hints refine the parse.** A raw iOS user agent cannot tell you which
iPhone, and modern Chrome freezes its UA version. So `parse_user_agent` gets a
companion:

```python
def refine_with_client_hints(
    parsed: ParsedUserAgent, hints: Mapping[str, Any] | None
) -> ParsedUserAgent
```

which overrides `os_version` from `platformVersion`, `device_model` from
`model`, and `browser_version` from the highest-entropy entry of
`fullVersionList`, when present. Client hints come from the device signal
payload (§1.5) — they are more accurate than the UA string and must win.

Also emit `Accept-CH` and `Critical-CH` response headers from the API for the
auth routes so browsers send high-entropy hints on subsequent requests. Add
this in the existing response-header middleware if one exists; otherwise a
small middleware in `main.py`:

```
Accept-CH: Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform,
           Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, Sec-CH-UA-Full-Version-List,
           Sec-CH-UA-Arch, Sec-CH-UA-Bitness
Critical-CH: Sec-CH-UA-Platform-Version, Sec-CH-UA-Model
```

Read those `Sec-CH-UA-*` request headers in `resolve_request_context` as a
secondary hint source (they arrive on direct requests; the bridge should
forward them too — add them to the forwarded set in §1.2 as
`x-876-ch-<name>` and honour them under the same trust rule).

Test file `apps/api/tests/test_user_agent.py` with a table of at least 12 real
user-agent strings (iPhone Safari, iPad Safari, Android Chrome on a Samsung,
Android Chrome on a Pixel, Windows Chrome, Windows Edge, macOS Safari, macOS
Chrome, Linux Firefox, Googlebot, curl, empty string) asserting every field.

## 1.5 `@876/device` (new package) — browser device signal

New workspace package `packages/device` (`@876/device`), browser-only, **zero
runtime dependencies**, matching the build/tsconfig/package.json shape of
`packages/analytics`.

```ts
export type DeviceSignal = {
  version: 1
  visitorId: string // stable, hex, 32 chars
  confidence: 'low' | 'medium' | 'high'
  collectedAt: number // unix seconds
  hints: {
    platform: string | null
    platformVersion: string | null
    model: string | null
    architecture: string | null
    bitness: string | null
    mobile: boolean | null
    fullVersionList: { brand: string; version: string }[] | null
  }
  screen: {
    width: number
    height: number
    pixelRatio: number
    colorDepth: number
  }
  timezone: string | null
  timezoneOffset: number
  languages: string[]
  hardwareConcurrency: number | null
  deviceMemory: number | null
  touchPoints: number
  components: Record<string, string> // hashed component digests, never raw
}

export async function collectDeviceSignal(options?: {
  collector?: DeviceSignalCollector
  timeoutMs?: number
}): Promise<DeviceSignal | null>

export function encodeDeviceSignal(signal: DeviceSignal): string // base64url JSON
export function decodeDeviceSignal(encoded: string): DeviceSignal | null
export function clearCachedDeviceSignal(): void

export type DeviceSignalCollector = () => Promise<{
  visitorId: string
  confidence?: 'low' | 'medium' | 'high'
  components?: Record<string, string>
}>
```

**Default (first-party) collector.** Deliberately dependency-free, so we take on
no third-party licence or bundle weight now:

- `navigator.userAgentData.getHighEntropyValues([...])` when available (this is
  what answers "which iPhone / which Android / what OS version").
- Screen geometry, colour depth, device pixel ratio.
- `Intl.DateTimeFormat().resolvedOptions().timeZone` + offset.
- `navigator.languages`, `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`.
- A canvas 2D render digest, a WebGL vendor/renderer digest, and an
  `AudioContext` offline-render digest — each wrapped in try/catch, each with
  its own timeout, each contributing only a **hash**, never raw pixel data.
- Font-availability probe over a fixed 20-font list, measured via canvas
  metrics.

`visitorId` = SHA-256 (via `crypto.subtle`, falling back to a bundled 32-bit
FNV-1a chain when `crypto.subtle` is unavailable, e.g. non-secure contexts) over
the sorted, stable component digests. `confidence` is `high` when
`userAgentData` high-entropy hints and both canvas and WebGL digests were
obtained; `medium` when any two; `low` otherwise.

**Adapter seam.** The `collector` option exists so a stronger provider can be
dropped in later without touching call sites. Ship
`packages/device/src/collectors/fingerprintjs.ts` implementing
`DeviceSignalCollector` over a **dynamic** `import('@fingerprintjs/fingerprintjs')`
that returns `null` when the module is absent. **Do not add
`@fingerprintjs/fingerprintjs` to any `package.json`** — the seam is documented
and unused by default; the licence/bundle decision is deferred.

**Caching & privacy.** Cache the collected signal in `sessionStorage` under
`876:device:v1` for the tab's lifetime (collection is expensive; do not re-run
per request). Wrap every storage access in try/catch (throws in private mode).
Never collect on the server — every entry point must guard
`typeof window === 'undefined'` and return `null`. Never include raw canvas data
URLs, IP, or any PII in `components`.

Write `packages/device/README.md` explaining what is collected, why (fraud +
analytics), the adapter seam, and the exact list of collected fields — this
doubles as the privacy-review artefact.

Tests (`packages/device/src/*.test.ts`, jsdom): stable id across two calls,
different id when a component changes, graceful degradation when
`crypto.subtle` / `AudioContext` / `userAgentData` are missing, `null` on
server, `encode`/`decode` round-trip, oversized-payload rejection in `decode`.

## 1.6 SDK attaches the signal automatically

In `packages/sdk`:

- Add `@876/device` as a dependency.
- In `packages/sdk/src/request.ts`, `getAuthHeaders` becomes able to attach
  `x-876-device`. Because collection is async, add an async pre-step in
  `sendAuthRequest`: when `runtime.collectDeviceSignal !== false` **and** the
  path is one of the auth mutation paths (`/auth/login`, `/auth/register`,
  `/auth/register-business`, `/auth/callback`, `/auth/magic-otp/send`,
  `/auth/magic-otp/verify`, `/auth/recover`, `/auth/reset-password`,
  `/auth/verify-email`, `/auth/social`), `await collectDeviceSignal()` (guarded
  by a 400 ms timeout — **never** let fingerprinting delay or fail a login;
  on timeout or error, proceed with no header) and set the encoded value.
- Add `collectDeviceSignal?: boolean` to `create876Client` options
  (default `true`), threaded onto `SdkRuntime`.

The point of this placement: **every current and future app gets device capture
for free**, with no per-app wiring, because they all authenticate through
`@876/sdk` → their own bridge → the API.

Bridge routes already forward `x-876-device` via §1.2.

## 1.7 Data model — `apps/api/db/models/devices.py` (new)

Register the module in `db/models/__init__.py` alongside its siblings and make
sure `db/migrate.py` picks the tables up the same way existing tables are
handled (follow the file's existing pattern exactly — do not invent a new
migration mechanism).

### `user_devices`

| column                                       | type                                     | notes                                          |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `id`                                         | String PK                                | `dev_…` (use the repo's existing id generator) |
| `user_id`                                    | FK `users.id` ON DELETE CASCADE, indexed |                                                |
| `fingerprint`                                | String, not null                         | the `visitorId`                                |
| `confidence`                                 | String, default `'low'`                  |                                                |
| `device_type`                                | String, default `'other'`                |                                                |
| `device_brand` / `device_model`              | String nullable                          |                                                |
| `os_name` / `os_version`                     | String nullable                          |                                                |
| `browser_name` / `browser_version`           | String nullable                          |                                                |
| `is_bot`                                     | Boolean default false                    |                                                |
| `label`                                      | String nullable                          | admin/user-assigned friendly name              |
| `trusted`                                    | Boolean default false                    |                                                |
| `trusted_at` / `trusted_by`                  | BigInteger / String nullable             |                                                |
| `blocked_at` / `blocked_by` / `block_reason` | BigInteger / String / Text nullable      | recorded only; nothing enforces it yet         |
| `first_seen_at` / `last_seen_at`             | BigInteger not null                      |                                                |
| `last_ip`                                    | String nullable                          |                                                |
| `last_country_code`                          | String(2) nullable                       |                                                |
| `sign_in_count`                              | Integer default 0                        |                                                |
| `signal`                                     | JSON nullable                            | the decoded `DeviceSignal`, minus `components` |
| `created_at` / `updated_at`                  | BigInteger not null                      |                                                |

Unique index on `(user_id, fingerprint)`. Index on `(user_id, last_seen_at)` and
on `fingerprint` alone (so Console can find every account sharing one device —
the single most valuable fraud query).

### `auth_attempts`

| column                                                        | type                                                | notes                                                                                                                                                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                          | String PK                                           | `atmp_…`                                                                                                                                                                                                       |
| `event`                                                       | String not null                                     | `login` \| `register` \| `register_business` \| `otp_send` \| `otp_verify` \| `password_reset` \| `password_recover` \| `verify_email` \| `social` \| `callback` \| `refresh` \| `session_switch` \| `signout` |
| `outcome`                                                     | String not null                                     | `succeeded` \| `failed` \| `pending` \| `blocked`                                                                                                                                                              |
| `failure_code`                                                | String nullable                                     | the `AppHTTPException.code`                                                                                                                                                                                    |
| `identifier`                                                  | String nullable, indexed                            | email/username as submitted, lowercased                                                                                                                                                                        |
| `user_id`                                                     | FK `users.id` ON DELETE SET NULL, nullable, indexed | resolved when known                                                                                                                                                                                            |
| `app_id`                                                      | FK `apps.id` ON DELETE SET NULL, nullable           |                                                                                                                                                                                                                |
| `session_id`                                                  | String nullable                                     |                                                                                                                                                                                                                |
| `realm`                                                       | String nullable                                     | `consumer` \| `enterprise` (from `X-876-Realm`)                                                                                                                                                                |
| `device_id`                                                   | FK `user_devices.id` ON DELETE SET NULL, nullable   |                                                                                                                                                                                                                |
| `device_fingerprint`                                          | String nullable, indexed                            | kept even when no user resolved                                                                                                                                                                                |
| `ip_address`                                                  | String nullable, indexed                            |                                                                                                                                                                                                                |
| `ip_country_code`                                             | String(2) nullable, indexed                         |                                                                                                                                                                                                                |
| `ip_region_code` / `ip_region` / `ip_city` / `ip_postal_code` | String nullable                                     |                                                                                                                                                                                                                |
| `ip_timezone`                                                 | String nullable                                     |                                                                                                                                                                                                                |
| `ip_latitude` / `ip_longitude`                                | String nullable                                     | strings, not floats                                                                                                                                                                                            |
| `ip_asn` / `ip_as_organization`                               | String nullable                                     |                                                                                                                                                                                                                |
| `user_agent`                                                  | Text nullable                                       |                                                                                                                                                                                                                |
| `device_type` / `device_brand` / `device_model`               | String nullable                                     | denormalized snapshot                                                                                                                                                                                          |
| `os_name` / `os_version` / `browser_name` / `browser_version` | String nullable                                     |                                                                                                                                                                                                                |
| `is_bot`                                                      | Boolean default false                               |                                                                                                                                                                                                                |
| `context_trusted`                                             | Boolean default false                               | was the geo/IP forwarded by our own bridge                                                                                                                                                                     |
| `risk_score`                                                  | Integer nullable                                    | 0–100, phase 3                                                                                                                                                                                                 |
| `risk_reasons`                                                | JSON nullable                                       | `string[]`, phase 3                                                                                                                                                                                            |
| `request_id`                                                  | String nullable                                     |                                                                                                                                                                                                                |
| `created_at`                                                  | BigInteger not null, indexed                        |                                                                                                                                                                                                                |

Composite indexes: `(user_id, created_at)`, `(ip_address, created_at)`,
`(identifier, created_at)`, `(outcome, created_at)`, `(created_at)`.

**Denormalization is intentional** — an attempt is an immutable historical fact
and must not change when the device record is later renamed or the user is
deleted.

### `sessions` — additive columns

`device_id` (FK `user_devices.id` ON DELETE SET NULL, nullable),
`ip_country_code` String(2), `ip_region` String, `ip_city` String,
`ip_asn` String, `ip_as_organization` String, `last_seen_at` BigInteger nullable,
`revoked_at` BigInteger nullable, `revoked_by` String nullable.
All nullable/defaulted — existing rows must remain valid.

## 1.8 Repositories

- `apps/api/db/repositories/user_devices.py` — `UserDeviceRepository` with
  `record_seen(...)` (the create-or-update-on-`(user_id, fingerprint)` path,
  bumping `last_seen_at`/`sign_in_count`/`last_ip`/`last_country_code` and
  refreshing parsed fields), `list_for_user`, `retrieve`, `list` (admin, with
  filters + cursor pagination), `list_by_fingerprint`, `update` (label/trusted/
  blocked). Follow `db/repositories/base.py` cursor helpers exactly.
- `apps/api/db/repositories/auth_attempts.py` — `AuthAttemptRepository` with
  `create`, `retrieve`, `list` (filters: `user_id`, `identifier`, `event`,
  `outcome`, `ip_address`, `ip_country_code`, `device_fingerprint`, `app_id`,
  `created_after`, `created_before`; cursor pagination; newest-first), and
  `count_recent_failures(*, identifier=None, ip_address=None, since)`.
- Extend `db/repositories/sessions.py` with the new columns, `revoke(id, by)`,
  `list` (admin filters: `user_id`, `active` bool, `device_id`) and
  `touch_last_seen`.

## 1.9 The recording service — `apps/api/services/auth_telemetry.py` (new)

Single entry point used by every auth route:

```python
class AuthTelemetryService:
    async def record(
        self,
        *,
        request: Request,
        event: str,
        outcome: str,
        identifier: str | None = None,
        user_id: str | None = None,
        app_id: str | None = None,
        session_id: str | None = None,
        failure_code: str | None = None,
    ) -> AuthAttemptRecord: ...
```

It must:

1. `resolve_request_context(request)`.
2. Decode `x-876-device` (base64url JSON, **hard-cap 8 KiB before decode**,
   validate with a Pydantic model, reject silently on any failure — a malformed
   signal must never break a login).
3. `parse_user_agent(...)` then `refine_with_client_hints(...)`.
4. When `user_id` is known, `UserDeviceRepository.record_seen(...)` and use the
   resulting `device.id`.
5. Insert the `auth_attempts` row.
6. Return a small record so the caller can attach `device_id` to the session.

**Failure isolation is mandatory.** Wrap the whole body so that _any_ exception
is caught, logged (`logger.warning("auth.telemetry.failed", exc_info=True)`),
and swallowed. Telemetry must never fail an authentication. Add a test that
proves a raising repository does not break `/auth/login`.

Expose it as a FastAPI dependency (`AuthTelemetryDep`) following the pattern of
the existing `AuthServiceDep`.

## 1.10 Wire it into the auth routes

In `apps/api/domains/auth/router.py`, for **every** authentication entry point
(`/login`, `/register`, `/register-business`, `/callback`, `/magic-otp/send`,
`/magic-otp/verify`, `/recover`, `/reset-password`, `/verify-email`, `/social`,
`/refresh`, `/session/switch`, `/session/signout`):

- On success: `await telemetry.record(..., outcome="succeeded", user_id=...)`.
- On the failure paths that currently raise `AppHTTPException` or return an
  `AuthEvent`: record `outcome="failed"` with `failure_code` set to the error
  code **before** raising. Failed attempts are the entire point of the fraud
  plane — do not skip any.
- Thread the resolved context into session creation so
  `sessions.ip_address` / `user_agent` / `device_id` / geo columns are populated
  from the **server-resolved** context.

Deprecate `CallbackRequest.ip_address` / `user_agent`: keep the fields (wire
compatibility) but mark them deprecated in the `Field(description=...)` and
**prefer the resolved context** whenever it yields a value. Do the same for any
other schema carrying client-supplied IP/UA.

Extend `apps/api/services/auth.py` where needed so the context reaches
`SessionRepository.create` — keep its signature style (`ip_address`,
`user_agent`) and add `device_id` plus a `geo: RequestGeo | None`.

## 1.11 Phase 1 verification

```bash
cd /workspaces/876/apps/api && python -m ruff check . && python -m mypy . tests && python -m pytest
cd /workspaces/876 && pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/device typecheck && pnpm --filter @876/device test
pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test
pnpm --filter @876/app typecheck && pnpm --filter @876/enterprise typecheck
pnpm --filter @876/console typecheck && pnpm --filter @876/couriers typecheck
```

Run these in the **foreground**. Print `PHASE 1 COMPLETE` with a file list.

---

# PHASE 2 — Admin surface: API endpoints, `@876/admin`, Console

Goal: 876 staff can review and manage every signal captured in Phase 1.

## 2.1 API endpoints (all `AdminDep`)

New domain `apps/api/domains/devices/` (`router.py`, `schemas.py`, `docs.py`,
`__init__.py`), registered in `api/v1.py`:

| Method | Path                            | Purpose                                                                                             |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/devices`                      | list, filters `user_id`, `fingerprint`, `device_type`, `trusted`, `blocked`, `q`, cursor pagination |
| GET    | `/devices/{device_id}`          | retrieve                                                                                            |
| POST   | `/devices/{device_id}`          | update `label`, `trusted`, `blocked` (+ `block_reason`)                                             |
| GET    | `/devices/{device_id}/attempts` | that device's attempt history                                                                       |
| GET    | `/devices/{device_id}/users`    | every account seen on this fingerprint — the fraud-linkage view                                     |

New domain `apps/api/domains/auth_attempts/` (same four files), registered:

| Method | Path                          | Purpose                                                                                                                                                                                           |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/auth-attempts`              | list with every filter in §1.8, cursor pagination, newest first                                                                                                                                   |
| GET    | `/auth-attempts/{attempt_id}` | retrieve                                                                                                                                                                                          |
| GET    | `/auth-attempts/summary`      | aggregate counts for the Console dashboard: totals by outcome, top 10 countries, top 10 failure codes, top 10 IPs by failure count, over a `window` param (`24h` \| `7d` \| `30d`, default `24h`) |

New domain `apps/api/domains/sessions/` (or extend an existing one if a sessions
router already exists — check first):

| Method | Path                        | Purpose                                                                                                                               |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/sessions`                 | list, filters `user_id`, `active`, `device_id`, cursor pagination                                                                     |
| GET    | `/sessions/{session_id}`    | retrieve                                                                                                                              |
| DELETE | `/sessions/{session_id}`    | revoke → tombstone `{ object: "session", id, deleted: true }` (soft: set `revoked_at`/`revoked_by`, per `.claude/rules/deletions.md`) |
| DELETE | `/users/{user_id}/sessions` | revoke all for a user                                                                                                                 |

Also add to the users domain:

| Method | Path                             | Purpose |
| ------ | -------------------------------- | ------- |
| GET    | `/users/{user_id}/devices`       |         |
| GET    | `/users/{user_id}/auth-attempts` |         |
| GET    | `/users/{user_id}/sessions`      |         |

Resource `object` discriminators: `"device"`, `"auth_attempt"`, `"session"`,
`"auth_attempt_summary"`. Every list is a `ListObject[T]`. Route-level OpenAPI
prose goes in each domain's `docs.py`, ordered `*_SUMMARY`, `*_DESCRIPTION`,
`*_RESPONSES`, grouped alphabetically by operation — per
`.claude/rules/api-backend.md`.

**Serialization rule:** never return the raw `components` map from the device
signal, and never return a full `x-forwarded-for` chain. IP addresses **are**
returned to Console (admin tier) — that is the point — but must never appear in
any consumer/session-tier response.

Tests in `apps/api/tests/api/` for each router: auth-dependency enforcement
(missing internal key → rejected), pagination, every filter, the tombstone
shape, and the summary aggregation.

## 2.2 `@876/admin` resources

New factory modules following the existing shape exactly
(`(runtime) => ({ verb() {…} })`, ~5-line methods over `packages/admin/src/request.ts`):

- `packages/admin/src/resources/devices.ts` — `list`, `retrieve`, `update`,
  `listAttempts`, `listUsers`.
- `packages/admin/src/resources/auth-attempts.ts` — `list`, `retrieve`,
  `retrieveSummary`.
- `packages/admin/src/resources/sessions.ts` — `list`, `retrieve`, `revoke`,
  `revokeForUser`.
- Extend `packages/admin/src/resources/users.ts` with `listDevices`,
  `listAuthAttempts`, `listSessions`.

Compose them in `packages/admin/src/client.ts` as `$876.devices`,
`$876.authAttempts`, `$876.sessions`. Types in `packages/admin/src/types.ts`
following the file's existing conventions. **Nothing here goes in `@876/sdk`** —
these are all `AdminDep`, so the auth-tier gating rule forbids it. Add
`.test.ts` files matching the existing admin resource tests.

## 2.3 Console UI

Follow `.claude/rules/app-layout.md` and `.claude/rules/app-structure.md`
precisely. Chrome renders immediately; only the fetching component is inside
`<Suspense>`, with a `DataTableSkeleton` carrying that table's real columns from
a `*-skeleton-columns.ts` sibling.

### `/sessions` — replace the stub

`apps/console/src/app/(app)/sessions/page.tsx` currently returns `null`.
Build the real list page:

- `ResourceToolbar` with `titleFilter={<StatusFilterHeading …/>}`, options
  `All` / `Active` / `Revoked` / `Expired`, `?status=` in the URL, threaded into
  `$876.sessions.list()` — never filter client-side.
- No Add button (sessions are not created by hand); keep the `···` dropdown with
  Refresh + Export.
- Columns: **User** (tier 1, links to `/users/[username]`), Device
  (`iPhone · iOS 18.2 · Safari` — tier 3 muted), Location
  (`Kingston, Jamaica` with a country badge — tier 3), IP (tier 3,
  `tabular-nums`), Status (`<Badge>`), Started (tier 3), Last seen (tier 3).
- Row action: Revoke (destructive, confirm via `AlertDialog`), through a thin
  route handler `apps/console/src/app/api/sessions/[id]/route.ts` that
  authorizes with `requireConsolePermission(...)` then calls
  `$876.sessions.revoke(...)`, invoked from `client` (`@/lib/client`).

### `/security` — new Console section

- `apps/console/src/app/(app)/security/page.tsx` — hub page (wide container
  variant `px-6 pt-5 pb-8 sm:px-8 lg:px-12`, `sm:columns-2 lg:columns-3` cards
  with `break-inside-avoid`), linking to Sign-ins, Devices, Sessions.
- `/security/sign-ins` — the `auth_attempts` list. `StatusFilterHeading` over
  outcome (`All` / `Succeeded` / `Failed` / `Blocked`). Extra filter row:
  free-text `q` (matches identifier / IP / fingerprint), country select fed by
  `$876` geo countries, event select, date range. Columns: **Identifier**
  (tier 1, links to the user when resolved), Event, Outcome (`<Badge>`),
  Location, Device, IP (`tabular-nums`), When.
- `/security/sign-ins/[id]` — detail page: everything captured, grouped in
  `patterns/detail` accordions (Request, Device, Location, Result, Risk). Show
  the failure code verbatim. Include a "Other attempts from this IP" and "Other
  accounts on this device" section — that linkage is the fraud tool.
- `/security/devices` — devices list. `StatusFilterHeading` over `All` /
  `Trusted` / `Blocked`. Columns: **Device** (tier 1 — `Samsung SM-S928B`, with
  OS/browser as the `text-muted-foreground text-xs` second line), Owner, Last
  location, Sign-ins (`tabular-nums`), First seen, Last seen, Status badge.
- `/security/devices/[id]` — detail page with the standard detail-view header
  toolbar (Edit + `···`), accordions for Signal, Accounts on this device,
  Recent attempts, Active sessions. `···` items: Trust / Untrust, Block /
  Unblock (destructive, last), Export.
- Add a **Security** entry to the Console sidebar nav config
  (`components/shell/*-nav-config.ts`) with children Sign-ins, Devices,
  Sessions. The parent must carry a real `href` (`/security`), never `'#'`.

### User detail page

`apps/console/src/app/(app)/users/[username]/` — add three accordion sections
using the existing `patterns/detail` components: **Devices**, **Sign-in
activity** (last 20 attempts), **Sessions** (with per-row Revoke and a
"Revoke all" action). Each loads through its own `<Suspense>` boundary so the
rest of the page is not blocked.

### Dashboard

Add a compact "Authentication (24h)" card to `/dashboard` fed by
`$876.authAttempts.retrieveSummary({ window: '24h' })`: succeeded / failed
counts, top country, top failure code. Keep it to a stat row — no prose.

## 2.4 Phase 2 verification

```bash
cd /workspaces/876/apps/api && python -m ruff check . && python -m mypy . tests && python -m pytest
cd /workspaces/876 && pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
```

Foreground only. Print `PHASE 2 COMPLETE` with a file list.

---

# PHASE 3 — WorkOS Vault, expanded identifications, account PIN

This is the security-sensitive phase. **The design below is fixed — transcribe
it, do not substitute your own crypto choices.** It will be reviewed line by
line by the primary agent.

## 3.1 `core/secure_field.py` — the encryption abstraction

One small abstraction with two providers, selected by settings. This is what
lets dev/test run without WorkOS while production uses Vault.

```python
@dataclass(frozen=True)
class SealedValue:
    ciphertext: str      # opaque, provider-prefixed
    key_id: str | None
    provider: str        # 'workos_vault' | 'local_aesgcm'

class SecureFieldProvider(Protocol):
    async def seal(self, plaintext: str, *, context: Mapping[str, str]) -> SealedValue: ...
    async def unseal(self, sealed: SealedValue, *, context: Mapping[str, str]) -> str: ...

def get_secure_field_provider(settings: Settings) -> SecureFieldProvider
```

- `context` is **authenticated associated data** — always
  `{"user_id": …, "type": …}`. Binding the ciphertext to its owner means a row
  copied to another user's record fails to decrypt. This is required, not
  optional.
- `ciphertext` is stored with a provider prefix (`wv1:` / `la1:`) so a future
  provider migration can tell the formats apart.

### `providers/workos/vault.py` (new)

Implement over the existing `WorkOSClient` (httpx, same auth/error handling as
`providers/workos/client.py`; map errors through `providers/workos/errors.py`):

- `encrypt(plaintext, context) -> str` and `decrypt(ciphertext, context) -> str`
  using WorkOS Vault's data-key encrypt/decrypt endpoints, with the context map
  passed as the encryption context.
- Also expose the key-value object operations (`create_object`, `read_object`,
  `update_object`, `delete_object`, `list_objects`) — we do not use them yet,
  but the provider should be complete so the next feature does not have to
  reopen it.
- Read the WorkOS Vault API surface from its docs before implementing; if you
  cannot reach the docs, implement against
  `POST /vault/v1/keys/data-key`, `POST /vault/v1/keys/decrypt`, and
  `/vault/v1/kv` with a clear comment naming the assumption, and flag it in your
  report so it can be verified.
- New settings in `core/config.py`:
  `workos_vault_enabled: bool = Field(default=False, validation_alias="WORKOS_VAULT_ENABLED")`
  and `workos_vault_key_context: str` (a namespace, default `"876"`).

### Local fallback (`local_aesgcm`)

AES-256-GCM via `cryptography` (add `cryptography>=44,<46` to
`requirements.txt`; `pyjwt[crypto]` already pulls it in — verify and reuse
rather than duplicating a pin if it is already resolved). Key from
`SECURE_FIELD_KEY` (base64, 32 bytes). Random 12-byte nonce per seal, context
map serialized deterministically as the AAD, output
`la1:<b64(nonce)>.<b64(ciphertext)>`. **If `SECURE_FIELD_KEY` is unset and Vault
is disabled, `seal` must raise** — never silently store plaintext.

Tests: round-trip both providers (Vault via a stubbed client), wrong-context
decrypt fails, tampered ciphertext fails, missing key raises, prefix routing.

## 3.2 Encrypt `user_identifications`

Additive migration — the plaintext column stays until a follow-up drops it.

New columns on `user_identifications`:

| column             | notes                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value_ciphertext` | Text nullable — sealed value                                                                                                                                      |
| `value_key_id`     | String nullable                                                                                                                                                   |
| `value_provider`   | String nullable                                                                                                                                                   |
| `value_last4`      | String(4) nullable — for masked display                                                                                                                           |
| `value_hash`       | String nullable, indexed — HMAC-SHA256 of the normalized value under a server pepper `IDENTIFICATION_HASH_PEPPER`, for duplicate detection **without decrypting** |

Behaviour:

- **Create/update**: normalize → validate (existing `core/identifications.py`
  helpers) → compute `value_hash` and `value_last4` → seal → store ciphertext.
  **Stop writing the plaintext `value` column for new rows.**
- **Read (list/retrieve)**: masked output only, built from `value_last4` (fall
  back to `mask_identification_value(row.value)` while legacy plaintext rows
  exist).
- **Disclose**: the existing entitlement-gated `/disclose` endpoint decrypts via
  the provider. Keep every existing check — active org→app subscription plus the
  type's `disclosure_app_slugs` allowlist — and keep writing the audit event.
  Add `device_fingerprint` / `ip_address` from the request context to that audit
  event's properties.
- **Duplicate detection** now uses `value_hash`, not `value`.
- Backfill script `apps/api/scripts/encrypt_user_identifications.py`: dry-run by
  default, `--apply` to write; seals each plaintext row, sets the new columns,
  and (only with `--clear-plaintext`) nulls `value`. Idempotent; skips rows that
  already have ciphertext.

**Never log, trace, or serialize a raw identification value anywhere except the
disclosure response.** Add a test asserting the list/retrieve serializers cannot
emit an unmasked value.

## 3.3 Expanded identification records

Add to `core/identifications.py`'s registry: `national_id`, `voters_id`,
`nis` (Jamaica National Insurance Scheme), `tax_id` (generic), `work_permit`.
Give each a label, `country_code`, normalization pattern, and
`disclosure_app_slugs` (couriers for TRN/passport/driver's licence/national id;
empty frozenset for the rest until an app needs them). Update the
`user_identifications_type_check` CHECK constraint to match — and add a test
asserting the constraint and the registry cannot drift.

New columns on `user_identifications`:
`issuing_country_code` String(2) FK `countries.code` ON DELETE SET NULL,
`issuing_authority` String, `issued_at` BigInteger, `expires_at` BigInteger,
`verification_status` String default `'unverified'`
(`unverified` \| `pending` \| `verified` \| `rejected`),
`rejection_reason` Text, `file_id` String (opaque 876 Storage file id — **no
FK**, per `.claude/rules/storage-architecture.md`; the upload route is
`attachment` category, `private` audience).

Keep the existing `verified`/`verified_at`/`verified_by` columns in sync with
`verification_status` (`verified == (verification_status == 'verified')`) so no
existing reader breaks.

Add admin routes under the users domain: `POST /users/{user_id}/identifications/{id}`
(update, incl. verification status transitions) and
`DELETE /users/{user_id}/identifications/{id}` (soft delete per
`.claude/rules/deletions.md` — the tombstone columns already exist).
Add the matching `@876/admin` methods
(`$876.users.identifications.{list,create,update,delete,disclose}`).

Console: add an **Identifications** accordion to the user detail page — masked
values, type, issuing country, status badge, expiry, and a "Disclose" action
that is permission-gated, writes an audit event, and reveals the full value once
behind an explicit confirm dialog.

## 3.4 Account PIN

New table `user_pins` (`apps/api/db/models/users.py`):

`id` PK (`pin_…`), `user_id` FK CASCADE, `scope` String default `'account'`,
`pin_hash` Text not null, `algorithm` String default `'scrypt'`,
`failed_attempts` Integer default 0, `locked_until` BigInteger nullable,
`last_verified_at` BigInteger nullable, `set_at` BigInteger not null,
`created_at` / `updated_at`. Unique `(user_id, scope)`.

Hashing: `hashlib.scrypt` (stdlib, no new dependency) with `n=2**15, r=8, p=1`,
a per-row 16-byte random salt, 32-byte output, stored as
`scrypt$<n>$<r>$<p>$<b64 salt>$<b64 hash>`. Verify with
`hmac.compare_digest`. PIN policy: 4–8 digits, reject trivial sequences
(`0000`, `1234`, `1111`, ascending/descending runs, and the user's date of
birth digits when known).

Endpoints (users domain, `AdminDep` for the admin surface; a `SessionDep`
self-service variant is a follow-up, not this phase):

| Method | Path                          | Purpose                                                                                                       |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/users/{user_id}/pin`        | set or replace (body `{ pin }`)                                                                               |
| POST   | `/users/{user_id}/pin/verify` | `{ pin }` → `{ object: "pin_verification", verified: bool, locked_until }`                                    |
| DELETE | `/users/{user_id}/pin`        | clear → tombstone                                                                                             |
| GET    | `/users/{user_id}/pin`        | status only — `{ object: "pin", is_set, set_at, locked_until, failed_attempts }`. **Never returns the hash.** |

Lockout: 5 consecutive failures → `locked_until = now + 900`; reset the counter
on success. Rate-limit `verify` through the existing
`core/rate_limit.enforce_rate_limit`. Every set/clear/failed-verify writes an
`audit_events` row **and** an `auth_attempts` row (`event="pin_verify"` — add it
to the event vocabulary).

Console: a **Security** accordion on the user detail page showing PIN status,
with Set / Clear actions and a lockout indicator.

## 3.5 Phase 3 verification

```bash
cd /workspaces/876/apps/api && python -m ruff check . && python -m mypy . tests && python -m pytest
cd /workspaces/876 && pnpm --filter @876/admin typecheck && pnpm --filter @876/admin test
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
```

Print `PHASE 3 COMPLETE` with a file list.

---

# PHASE 4 — Analytics emission & risk scoring (record-only)

## 4.1 PostHog server-side emission

In `services/auth_telemetry.py`, after the attempt row is written, emit a
PostHog event through the existing `providers/posthog/client.py`:

- Event name: `auth_attempt`.
- `distinct_id`: the user id when known, else `device:<fingerprint>`, else
  `anon:<sha256(ip)[:16]>`.
- Properties: `event`, `outcome`, `failure_code`, `app_slug`, `realm`,
  `country_code`, `region`, `city`, `timezone`, `asn_organization`,
  `device_type`, `device_brand`, `device_model`, `os_name`, `os_version`,
  `browser_name`, `browser_version`, `is_bot`, `risk_score`, `context_trusted`.
- **Never send the raw IP, the email/identifier, or the raw device components.**
  Send `ip_hash` = first 16 hex chars of `sha256(pepper + ip)` instead.
- `$geoip_disable: true` (we supply our own geo).
- Emission is fire-and-forget and fully exception-isolated, exactly like the
  rest of the telemetry service.

Also mirror each attempt into `audit_events` (`event="auth.attempt"`,
`source="server"`) reusing the existing repository, with the same
privacy-filtered property set — Console's audit log then shows auth activity
alongside everything else.

## 4.2 Risk scoring — `apps/api/core/risk.py`

A **pure, deterministic, synchronous** scorer. No I/O inside it; the caller
gathers the inputs.

```python
@dataclass(frozen=True)
class RiskInput:
    is_new_device: bool
    is_new_country_for_user: bool
    is_bot: bool
    context_trusted: bool
    recent_failures_for_identifier: int
    recent_failures_for_ip: int
    distinct_users_on_device: int
    minutes_since_last_attempt_elsewhere: int | None
    km_from_last_attempt: float | None

@dataclass(frozen=True)
class RiskAssessment:
    score: int              # 0-100, clamped
    reasons: list[str]      # stable snake_case codes

def assess_risk(signal: RiskInput) -> RiskAssessment
```

Rules and weights (fixed — implement exactly, and unit-test each in isolation
plus the clamp at 100):

| Condition                                              | Points | Reason code                |
| ------------------------------------------------------ | ------ | -------------------------- |
| New device for this user                               | +15    | `new_device`               |
| New country for this user                              | +20    | `new_country`              |
| Bot user agent                                         | +30    | `bot_user_agent`           |
| Context not trusted (direct, non-bridge call)          | +10    | `untrusted_context`        |
| ≥3 recent failures for the identifier                  | +20    | `identifier_failure_burst` |
| ≥10 recent failures from the IP                        | +25    | `ip_failure_burst`         |
| ≥3 distinct users on the same device fingerprint       | +25    | `shared_device`            |
| Implied travel > 800 km/h between consecutive attempts | +35    | `impossible_travel`        |

"Recent" = the last 15 minutes, via
`AuthAttemptRepository.count_recent_failures`. Distance uses a haversine helper
in the same module over the stored lat/long strings (skip when either is
missing). Store `risk_score` and `risk_reasons` on the attempt row.

**Enforcement stays off.** Add
`auth_risk_block_threshold: int = Field(default=0, validation_alias="AUTH_RISK_BLOCK_THRESHOLD")`.
When it is `0` (the default, and the only supported production value today)
**nothing is ever blocked** — the score is recorded and returned to Console
only. Implement the threshold check as a single guarded branch so enabling it
later is a config change, and add a test proving that a score of 100 with the
default threshold still authenticates successfully.

Console: show the score as a badge on the sign-ins list and a reasons list on
the detail page. A score ≥ 60 renders as a warning-styled badge — **not** green,
and not a blocking affordance.

## 4.3 Phase 4 verification

Same commands as Phase 3, plus `pnpm --filter @876/console test`.
Print `PHASE 4 COMPLETE`.

---

# Final report

End with:

1. A phase-by-phase list of files added/modified.
2. The exact verification commands you ran and their results (paste failures
   verbatim — do not claim green if it is not).
3. Every assumption you had to make (especially the WorkOS Vault endpoint
   shapes, the `ua-parser` import surface, and anything about `db/migrate.py`).
4. Anything you deliberately did not do, and why.
5. Any place where following this brief conflicted with a repo rule — name the
   rule and what you did.

**Do not run `git commit`, `git add`, or `git push`.**
