# @876/device

Browser-only device signal collection for 876 authentication telemetry — fraud
review and aggregate analytics. This README doubles as the privacy record for
what leaves a user's browser.

## How it reaches the API

`@876/sdk` calls `collectDeviceSignal()` before auth mutations and attaches the
encoded result as `x-876-device`. Each app's `/api/auth/[...path]` bridge
forwards it to the 876 API, which decodes it in `services/auth_telemetry.py`.
No app wires this up itself — every current and future 876 app gets device
capture by authenticating through the SDK.

## What is collected

| Field                | Source                                                           | Stored as       |
| -------------------- | ---------------------------------------------------------------- | --------------- |
| Client hints         | `navigator.userAgentData.getHighEntropyValues()`                 | plain values    |
| Screen geometry      | `screen.*`, `devicePixelRatio`                                   | plain + digest  |
| Timezone / languages | `Intl.DateTimeFormat().resolvedOptions()`, `navigator.languages` | plain + digest  |
| Hardware hints       | `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`          | plain + digest  |
| Canvas render        | 2D text + gradient render                                        | **digest only** |
| WebGL                | vendor / renderer / parameters / extension list                  | **digest only** |
| Fonts                | availability probe over a fixed 20-font list                     | **digest only** |
| Audio                | offline oscillator → compressor render                           | **digest only** |

The client hints are the reason this exists in the form it does: a user-agent
string cannot say _which_ iPhone or _which_ Android handset, and Chrome freezes
the version it advertises. `platformVersion` and `model` answer both, and the
API prefers them over its user-agent parse.

## What is never collected

- No IP address (the server resolves that itself, from headers the browser
  cannot forge).
- No canvas data URLs, raw pixel data, or raw audio samples — only digests.
- No raw font list, only a digest of which of the 20 probes matched.
- No cookies, storage contents, form values, or anything user-entered.
- Nothing at all on the server: every entry point returns `null` when
  `window` is undefined.

## Behaviour guarantees

- **Never blocks authentication.** Collection is bounded by a timeout
  (400 ms default), every source is individually try/caught, and any failure
  yields `null`. The SDK proceeds without the header.
- **Stable per browser.** `visitorId` is a SHA-256 (via `crypto.subtle`) over
  the sorted component digests, truncated to 32 hex characters. In a
  non-secure context, where `crypto.subtle` is unavailable, it falls back to a
  chained FNV-1a — weaker, but still stable, because a fingerprint that changes
  between page loads would inflate the device count for one real browser.
- **Cached per tab** in `sessionStorage` under `876:device:v1`. Call
  `clearCachedDeviceSignal()` on sign-out.
- **Confidence is reported, not assumed.** `high` requires three strong sources
  plus client hints; `low` means the browser blocked most of them. Treat a
  `low`-confidence fingerprint as weak evidence — hardened browsers and privacy
  extensions legitimately produce them.

## The collector seam

`collectDeviceSignal({ collector })` accepts a `DeviceSignalCollector`, so a
stronger provider can replace the first-party fingerprint without touching a
call site.

`src/collectors/fingerprintjs.ts` implements that interface over a dynamic
import of `@fingerprintjs/fingerprintjs`, and returns `null` when the module is
absent. **That package is deliberately not a dependency**: FingerprintJS v4 OSS
ships under the Business Source License, and the accuracy that matters for
fraud comes from the paid Pro service. Both are decisions the platform has not
made — the seam keeps them cheap to make later.
