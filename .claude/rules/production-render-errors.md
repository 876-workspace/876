# Production Render Errors (React #441) and Service Worker Noise

Read this before debugging a page that works in development but fails on a
Vercel production build, before passing a prop from a Server Component to a
Client Component, and before adding an authenticated route segment to any app.

Companion to `error-handling.md` (errors are values),
`navigation-performance.md`, and `data-loading.md`.

## What the browser console is telling you

| Console line                                                                          | Meaning                                                                                                                                               | Where the cause is                                                                                              |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Minified React error #441`                                                           | **Any** exception thrown while rendering a Server Component. React strips the message in production and keeps only a `digest`.                        | The server logs. The browser never has it.                                                                      |
| `sw.js … Uncaught (in promise) no-response` / `FetchEvent … the promise was rejected` | Serwist's `NetworkOnly` got **no response at all**: the navigation was aborted (a click or reload while a slow page streamed) or the network dropped. | Nowhere to fix. A 500 or an error page is still a response and never produces `no-response`. Treat it as noise. |
| `The resource … was preloaded using link preload but not used`                        | Next preloaded a font the page did not paint in time.                                                                                                 | Harmless.                                                                                                       |
| Errors from `injectedMethod*.js`, `VM…` anonymous scripts (`reportAllChanges`, …)     | A browser extension.                                                                                                                                  | Not the app.                                                                                                    |

**#441 is a symptom class, not one bug.** Three unrelated defects produced the
identical console output on 2026-09-14: an API route validating the wrong
params schema, a function prop crossing the RSC boundary, and an unapplied
production migration. Do not pattern-match on the console; read the logs.

## Debug procedure — logs first, always

```bash
npx vercel logs https://<app>.vercel.app --since 30m --level error
npx vercel logs https://<app>-api.vercel.app --since 30m   # the service it called
```

1. The Next app's log gives the real message and the `digest`.
2. If the message is a service error (`Couriers request failed (…)`,
   `crm/…`), read **that service's** log: it carries the underlying
   `prisma:error`, validation issue, or stack.
3. A `prisma:error … column … does not exist` means a migration is not applied
   in production. Run `npx prisma migrate status` in **every** app with
   `prisma/migrations` — see the `prod-migrations-blocked-ci` memory. Applying
   one needs explicit user approval.
4. Vercel runtime logs are short-lived. Reproduce first, then pull immediately.

## Rule 1 — never pass a function from a Server Component to a Client Component

React cannot serialize a function. Development shows a readable message;
production crashes the route with #441. Typecheck, lint, and unit tests cannot
see it, because each side is valid alone.

- Pass serializable data — a base href string, a key, plain `{ value, label }`
  options — and build the function **inside** the client component.
- A shared `'use client'` component in `@876/<product>-ui` must not take an
  href builder, formatter, or render callback as a required prop, because a
  server host will eventually render it. Take `requestBaseHref: string`, not
  `requestHref: (id) => string`.
- `pnpm check:rsc-boundaries` (`scripts/check-rsc-boundaries.mjs`, run in the
  App structure workflow) walks every route's server import graph and fails on
  an inline arrow/function or a local function binding passed to a component
  imported from a `'use client'` module. It does not see a function forwarded
  through an intermediate server component's props — keep those serializable
  too.

## Rule 2 — every authenticated segment has an `error.tsx`

Without one, a throw escalates to `global-error`, which replaces the whole app —
sidebar included — for a single failed request.

- Each app's authenticated segment (`(app)/`, `[orgSlug]/`, `[slug]/`, `app/`)
  carries a thin `error.tsx` rendering `SegmentError` from
  `@876/ui/segment-error`. It shows the `digest` so a user report can be
  matched to the log line.
- Pass Next's `retry()`, never `reset()`: a server fetch failure only recovers
  when the segment is fetched again.
- A segment's `error.tsx` does not catch a throw from the `layout.tsx` beside
  it. Guards in that layout still reach `global-error`; keep them cheap and
  deterministic.
- The boundary is the last line of defence, not the error design. Expected
  service failures stay values rendered in place (`error-handling.md`); a
  helper that throws on any service error (`requireCouriersData`) turns every
  backend fault into this fallback.

## Rule 3 — a migration merged is not a migration applied

Code that reads a new column deploys faster than the migration reaches the
production database. Before redeploying an app whose PR added a migration, run
`prisma migrate status` against production for that app. A migration must also
apply cleanly on a database that already ran every earlier migration — never
re-create an index or column an earlier migration owns.

## Do not

- Do not diagnose #441 from the browser console.
- Do not chase Serwist `no-response` as the cause of a failed page.
- Do not pass a function prop across the RSC boundary, inline or by reference.
- Do not ship an authenticated segment without `error.tsx`.
- Do not use `reset()` in a segment error boundary.
- Do not redeploy a service whose migration is pending in production.
