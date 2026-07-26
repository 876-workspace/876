# Brief: stop feature-flag evaluation failing silently

## Why (live incident)

A user reported that Console's **app switcher, search bar and other UI features
stopped loading**, and suspected PostHog. It is not PostHog. PostHog is only
reachable _through_ the 876 identity API, and that API is currently undeployed,
so every call fails.

The damage comes from how the failure is handled. In
`apps/console/src/lib/features.ts`:

```ts
const { data: appList, error: appError } = await $876.apps.list({ ... })
if (appError || !appList) return DISABLED_FEATURES
```

`DISABLED_FEATURES` sets `themeSwitcher`, `globalAdd`, `appSwitcher`,
`searchBar` and `chat` all to `false` and `enabledWidgetIds` to `[]`. So an
infrastructure outage is indistinguishable from "an admin turned every feature
off": the UI quietly loses functionality, nothing is logged, and **no Sentry
event is produced**. That is why the Sentry dashboard stayed empty while the
product was visibly broken.

Failing closed is the right _security_ behaviour — do not change it. The defect
is that it is **silent**. An outage must be observable.

## Scope

These files, and only these:

| App        | File                                     | Silent returns                                          |
| ---------- | ---------------------------------------- | ------------------------------------------------------- |
| Console    | `apps/console/src/lib/features.ts`       | lines ~30, ~33, ~39                                     |
| Couriers   | `apps/couriers/src/lib/features.ts`      | line ~48                                                |
| Billing    | `apps/billing/src/lib/features.ts`       | around the `platform.features.evaluate` call (~line 71) |
| Consumer   | `apps/876/src/lib/auth/guards.ts`        | the `client.features.evaluate` call (~line 162)         |
| Enterprise | `apps/enterprise/src/lib/auth/guards.ts` | the `client.features.evaluate` call (~line 187)         |

**Read each file first.** The five differ in shape — do not assume Console's
structure applies to the others. Billing/Couriers use a `platform` client;
876/Enterprise call inside auth guards where the fallback may not be a
`DISABLED_FEATURES` constant at all. Adapt to what is actually there.

## Required change

At **every** point where a feature-flag or app-list call fails and the code
falls back to a disabled/empty state, report it before returning. Keep the
existing return value and control flow **exactly as-is** — this is
observability only, not a behaviour change.

Report via `Sentry.captureException` (or `captureMessage` when there is no
Error object) from `@sentry/nextjs`, which is now installed in all six Next.js
apps. Include enough context to diagnose without guessing:

- which call failed (`apps.list` vs `features.evaluate`)
- the error `code` and `message` from the `{ data, error }` envelope
- the app slug and, where available, the app id
- **never** the user id, email, or any header/credential value

Use a Sentry `level` of `error` and a tag that makes these groupable, e.g.
`feature_flags`. Do not add a `beforeSend` override — the existing scrubbing in
each app's `sentry.server.config.ts` must keep applying.

Console additionally has a structured logger at `apps/console/src/lib/logger.ts`
(exports a `logger` object). **In Console only**, also log at error level
through it. The other apps have no logger module — do not create one, and do
not add `console.error` as a substitute.

Distinguish the two failure classes in the message so an outage is not confused
with configuration drift:

- the call errored (API unreachable / non-OK) → an outage
- the call succeeded but the expected record is absent (e.g. Console's
  `consoleApp` not found in the app list) → configuration drift

## Constraints

- **Do not change what the functions return, or when.** Fail-closed stays.
- Do not remove or weaken `DISABLED_FEATURES` or any equivalent fallback.
- Do not add retries, caching, or a "degraded mode" flag — out of scope.
- Do not touch `apps/console/src/app/api/auth/[...path]/route.ts` or any
  session/cookie code. A separate change owns that.
- Do not modify `sentry.*.config.ts` in any app.
- Do not commit. The orchestrating agent stages and commits.

## Verification (report each)

```bash
# 1. Every fail-closed path now reports
grep -n "captureException\|captureMessage" \
  apps/console/src/lib/features.ts apps/couriers/src/lib/features.ts \
  apps/billing/src/lib/features.ts apps/876/src/lib/auth/guards.ts \
  apps/enterprise/src/lib/auth/guards.ts

# 2. Fallbacks are still intact (must still be present)
grep -n "DISABLED_FEATURES" apps/console/src/lib/features.ts apps/couriers/src/lib/features.ts

# 3. Typecheck + test every touched app
pnpm --filter @876/console typecheck && pnpm --filter @876/console test
pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/app typecheck

# 4. Formatting
pnpm exec prettier --check "apps/*/src/lib/features.ts" "apps/*/src/lib/auth/guards.ts"
```

If an existing test asserts the silent-failure behaviour, update it to assert
the reporting call as well — do not delete the test. Report any test you
changed and why.
