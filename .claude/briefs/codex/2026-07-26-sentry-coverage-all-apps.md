# Brief: close the Sentry instrumentation gaps across all 876 apps

## Why

Every 876 app already has base Sentry wiring and all nine Sentry projects exist
in the `efesto` org (`876-api`, `876-app`, `876-billing`, `876-billing-api`,
`876-console`, `876-couriers`, `876-enterprise`, `876-storage-api`,
`876-widgets-api`). The coverage is nevertheless uneven, and one app is
publishing to a project slug that does not exist. This brief closes those gaps so
every surface reports errors the same way.

The three FastAPI services (`apps/api`, `apps/billing-api`, `apps/storage-api`)
are already complete — they each guard on `settings.sentry_dsn`, init
`sentry_sdk` with `environment`, `traces_sample_rate`, `send_default_pii=False`,
and declare `sentry-sdk[fastapi,sqlalchemy]` in `requirements.txt`. **Do not
touch them.**

## Gap 1 — `@876/app` points at a Sentry project that does not exist

`apps/876/next.config.ts:51` sets `project: '876-0b'`. There is no `876-0b`
project in the `efesto` org; the consumer app's project is **`876-app`**.

Change it to `project: '876-app'`. Leave every other option in that
`withSentryConfig(...)` call unchanged (including `sourcemaps: { disable: true }`
— enabling source maps needs a `SENTRY_AUTH_TOKEN` in CI and is out of scope).

## Gap 2 — migrate client init to `instrumentation-client.ts`

`sentry.client.config.ts` is the legacy entry point. Next.js 15.3+ loads
`src/instrumentation-client.ts` instead, and `onRouterTransitionStart` (client
navigation instrumentation) can only be exported from there. Only `apps/876`
has been migrated (`apps/876/src/instrumentation-client.ts`) — and it still has
a stale `apps/876/sentry.client.config.ts` alongside it, so the client SDK is
initialized twice.

For each of these five apps:

- `apps/billing`
- `apps/console`
- `apps/couriers`
- `apps/enterprise`
- `apps/widgets-api`

do the following:

1. Create `apps/<app>/src/instrumentation-client.ts` containing **exactly the
   `Sentry.init({...})` call and the `scrubEvent` helper currently in that app's
   `sentry.client.config.ts`** — same DSN env var, same sample rates, same
   `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`,
   `enableLogs: true`, `sendDefaultPii: false`, and the identical `beforeSend` /
   `scrubEvent` header-scrubbing body. Do not change any value.
2. Append the router-transition export, matching
   `apps/876/src/instrumentation-client.ts`:
   ```ts
   export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
   ```
   Place it directly after the `Sentry.init(...)` call, before `scrubEvent`.
3. Delete `apps/<app>/sentry.client.config.ts`.

Then for `apps/876`: delete the now-redundant `apps/876/sentry.client.config.ts`
and bring `apps/876/src/instrumentation-client.ts` into line with the other five
by adding the three options it is missing from its `Sentry.init` —
`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, and
`enableLogs: true`. Keep its existing `dsn`, `environment`, `tracesSampleRate`,
`sendDefaultPii`, `beforeSend`, `onRouterTransitionStart`, and `scrubEvent`
exactly as they are.

**Leave `sentry.server.config.ts`, `sentry.edge.config.ts`, and
`src/instrumentation.ts` untouched in every app** — the server/edge entry points
are still correct and still loaded from `instrumentation.ts`'s `register()`.

## Gap 3 — missing `global-error.tsx`

Without a root `global-error.tsx`, React rendering errors in the root layout are
never captured. `apps/876`, `apps/console`, and `apps/enterprise` have one;
**`apps/billing`, `apps/couriers`, and `apps/widgets-api` do not.**

Create `apps/<app>/src/app/global-error.tsx` for those three, byte-identical to
the existing `apps/console/src/app/global-error.tsx`:

```tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
```

Confirm first that each of the three apps really has an `src/app/` App Router
root (they do) and that no `global-error.tsx` already exists at another path in
that app. If one does, report it and skip rather than creating a duplicate.

## Explicitly out of scope

- `apps/api`, `apps/billing-api`, `apps/storage-api` (already complete)
- Enabling source-map upload / `sourcemaps.disable`
- Any change to `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` **values** — the
  `.env.example` placeholder keys already exist in all six apps and real DSNs are
  Cloudflare secrets. Never write a real DSN into a tracked file.
- Extracting the duplicated `scrubEvent` helper into a shared package (noted as a
  follow-up; not this change)
- Any `.next/`, `.open-next/`, or `node_modules/` path
- Any UI/chrome file

## Verification (run these, report the output)

```bash
pnpm --filter @876/app typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/widgets-api typecheck
```

Then confirm no stale references remain:

```bash
grep -rn "sentry.client.config" apps --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules | grep -v "\.next"
```

That grep must return nothing (the `instrumentation.ts` files only import the
server/edge configs).

## Rules

- Do **not** run `git add`, `git commit`, `git push`, or create branches. The
  orchestrating agent commits.
- Match repo Prettier config (root `.prettierrc`, `singleQuote: true`).
- Report every file created, modified, and deleted, with a one-line summary each.
