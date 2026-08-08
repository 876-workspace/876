# Navigation & Data-Path Performance

Read this before adding a `loading.tsx`, adding an `await` to a layout, writing
an auth/permission guard, or choosing a database driver in any app. It records
what was measured on 2026-08-06 while fixing Console and Couriers, so the same
defects are not rebuilt from first principles.

Companion to the root `CLAUDE.md` → "Loading States & Suspense Placement"
(which owns the _skeleton shape_ rules) and `.claude/rules/performance.md`.

## The two facts everything here follows from

Both are stated in the version-matched docs at
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`:

> `loading.js` wraps `not-found.js`, `page.js`, and **nested `layout.js` files**
> in a `<Suspense>` boundary. It does **not** wrap the `layout.js` … in the same
> segment.

> If the layout accesses uncached or runtime data (e.g. `cookies()`, `headers()`,
> or uncached fetches), `loading.js` will not show a fallback for it.
> **Without Cache Components: navigation blocks until the layout finishes
> rendering.**

Read together: a fallback covers _more_ than you think (every nested layout
below it), and _less_ than you think (never the layout beside it).

## Rule 1 — Never stack a fallback over a route group

A `(list)` / `(overview)` route group is **covered by** the segment above it. If
both carry a `loading.tsx`, one navigation paints two different fallbacks in
sequence — the parent's, then the group's, then the page.

- **Do not** put a `loading.tsx` at a segment that contains a route group with
  its own. Push it down to the specific child routes that have nothing.
- A comment claiming a fallback covers "everything except the list" describes an
  exception Next.js has no way to honour. Three such files shipped in Console and
  flashed a 9-tab record header over the apps list for months.
- `scripts/check-app-structure.mjs` enforces this (checks 6 and 7). It failed to
  catch the original instance through two independent gaps — route groups were
  excluded from "has children", and `DetailHeaderSkeleton` was not recognised as
  page-shaped. Both are fixed; if you add a new recognisable skeleton component,
  add it to `isPageShapedFallback`.

**Before deleting a parent fallback, check every child it covers.** A child's own
`loading.tsx` never covers that child's own `layout.tsx` — so a child whose
layout awaits still needs a boundary above it. Deleting the parent in that case
trades a wasted paint for a hard block.

## Rule 2 — A detail layout awaits `params` and nothing else

A layout that awaits data suspends into the **parent** segment's boundary — the
list the user just clicked from — and no `loading.tsx` this route owns can catch
it. The result is the click landing on the previous screen.

```tsx
// Correct: params only; everything else streams behind its own boundary.
export default async function DetailLayout({ children, params }: Props) {
  const { slug } = await params
  const tabs = buildTabs(slug) // static — real and clickable at once

  return (
    <DetailHeader>
      <Suspense fallback={<IdentityFallback />}>
        <Identity slug={slug} /> {/* calls notFound() if absent */}
      </Suspense>
      <RouteTabs tabs={tabs} />
      {children}
    </DetailHeader>
  )
}
```

- **The tab strip almost never depends on the record.** Build it from `params`
  and render it immediately. Where it genuinely varies (Console gates app tabs on
  `app_kind`), stream it with the shared minimum as the fallback — real tabs, not
  a skeleton, and no tab that later disappears.
- **`notFound()` moves into the streamed component**, since that is where the
  record is resolved. Accept that it then returns 200 with `noindex`; the docs
  cover this under "Status Codes".
- **`notFound()` cannot be called from a client component.** When the header is
  `'use client'`, keep a small **server** component inside the boundary to
  resolve-and-decide, and pass the result down.
- Reference implementations: `apps/[slug]/layout.tsx`,
  `apps/[slug]/plans/[planSlug]/layout.tsx`,
  `settings/users/[id]/layout.tsx`.

## Rule 3 — A guard cannot stream, so make it cheap

An authorization guard **must** block: content cannot render before we know the
viewer may see it. Do not try to move it below a boundary. Make it cost nothing
instead.

- **Memoize every session-derived read with `React.cache`.** Console was
  resolving the same platform user three times per render — once for a bootstrap
  check, once for display hydration, once per segment-layout permission check —
  each its own Worker → FastAPI → Neon round trip, all ahead of any paint.
- **Prefer data already in the sealed session over a fetch.** The session cookie
  is signed by the API and is the same trust root as `session.user.id`, which
  authorization already relies on completely. Reading an address or a name from
  it adds no attack surface. Record the staleness trade-off in a comment, and
  make sure a stale value can only _withhold_ access, never widen it.
- **Watch `React.cache` argument identity.** It compares with `Object.is`, so a
  function taking an inline object literal (`getFeatures({ userId, widgets })`)
  never hits. Take primitives, or don't bother wrapping it.
- **Two call sites issuing the same list are one round trip too many.** Console's
  shell and its app-detail routes both ran
  `apps.list({ limit: 100, clientType: 'public' })` on the same render. A shared
  `cache()`d catalog module (`src/lib/apps-catalog.ts`) is the fix.

## Rule 4 — Neon over HTTP, unless you need interactive transactions

Measured against a real `us-east-1` Neon instance, cold client per request as a
Worker does it, running a `findUnique … include`:

| Transport                     | p50  | max       |
| ----------------------------- | ---- | --------- |
| WebSocket pool (`PrismaNeon`) | 68ms | **652ms** |
| HTTP (`PrismaNeonHttp`)       | 45ms | **67ms**  |

Raw driver, same instance: `SELECT 1` over HTTP is **6ms**; a WebSocket pool
costs ~30ms to open. **The database is not the cost — the handshake is**, and its
tail is what makes navigation feel unpredictable rather than merely slow.

- **Use `PrismaNeonHttp` when the app's data surface is single-model reads and
  writes.** `create`, `update`, `delete`, `deleteMany` and `findUnique … include`
  all work over HTTP; this was verified end-to-end against the real schema, not
  inferred.
- **Use `PrismaNeon` (WebSocket) when the app uses interactive `$transaction`.**
  HTTP cannot do them. Couriers (`src/lib/service/transaction.ts`) and Billing
  (`$transaction(async (tx) => …)`) both do, and must stay on the pool.
- **Audit before swapping**: `grep -rn '\$transaction' <app>/src/lib/service`.
  Console had none, which is why it was eligible and the others are not.
- The request-scoped client resolver (`createRequestScopedResolver`) is
  **mandatory** on the pool — a Neon socket belongs to the request that opened it
  and reusing it hangs workerd (Error 1101). Over HTTP there is no socket to
  strand, so it becomes belt-and-braces; keep it anyway.

## Rule 5 — `cacheComponents` is blocked upstream; do not enable it

`cacheComponents: true` is broken on `@opennextjs/cloudflare` as of 1.20.2:
[#1225](https://github.com/opennextjs/opennextjs-cloudflare/issues/1225),
[#1130](https://github.com/opennextjs/opennextjs-cloudflare/issues/1130),
[#1321](https://github.com/opennextjs/opennextjs-cloudflare/issues/1321) — all
open. The causes are in the adapter and the runtime, not app code:
`Buffer.from(cacheData.rsc)` on `undefined` for PPR, and **workerd reordering
ReadableStream chunks larger than 4096 bytes**, which corrupts RSC Flight
streams. Nothing written in an app fixes either.

Until #1225 closes, every app here runs classic App Router. That means Rules 1–3
are the whole ceiling, and `"use cache"` / `export const instant` must not appear
in app code.

**`partialPrefetching` is blocked for the same reason** — it depends on the same
prerendered-shell machinery #1225 corrupts. The Vercel `next-beats` demo gets its
"data feels instant" from `cacheComponents` + `partialPrefetching` together;
neither is available to us, so a `<Link>` prefetch here only ever warms the
`loading.tsx` shell, never the dynamic data. The shell is already instant across
console and couriers (re-verified 2026-08-08); the remaining felt latency on a
navigation is the **query itself**, which is a data/query-optimization concern
(batch the N+1s, trim `select`s, Rule 4 driver choice) — not a loading-strategy
one. Do not reach for a config flag to fix query latency.

**`reactCompiler: true` IS the standard, and IS safe.** It is a build-time source
transform (needs `babel-plugin-react-compiler`), produces plain React, and has no
relationship to #1225 — OpenNext just bundles its output. It is enabled in console
and couriers and is the config baseline every new 876 Next app ships with. It cuts
**client re-render** churn during interaction and streaming; it does **not** change
navigation or data latency, so do not present it as a nav-speed fix.

### The config baseline every 876 Next app ships with

```ts
// next.config.ts
const nextConfig: NextConfig = {
  reactCompiler: true, // adopted platform-wide — safe on Cloudflare
  // cacheComponents / partialPrefetching: OFF — blocked by OpenNext #1225.
  //   Re-enable both only once #1225 closes and a deploy is verified.
}
```

The instant-navigation feel comes entirely from the **page shape** (Rules 1–3),
not from flags: a non-async page renders chrome + `<Suspense>` synchronously, the
async data component lives inside the boundary, `params`/`searchParams` are pushed
down as promises (never awaited at the page top only to block the shell), and each
boundary's fallback is the real chrome + a `DataTableSkeleton` with the true column
set. This is what console and couriers already do; it is what every future app
copies.

## Rule 6 — Give the click immediate feedback

`@876/ui/nav-progress` is mounted in each app's shell. It exists because Rule 3
means some navigation genuinely blocks, and a route-level fallback cannot cover
that window.

- Start is a **capture-phase** click on any same-origin anchor — Next's `Link`
  calls `preventDefault()` itself, so checking `defaultPrevented` on the bubble
  would skip exactly the links that matter. Finish is `usePathname` changing.
- Do **not** reach for `useLinkStatus` for an app-wide bar: it reports only for
  the single `<Link>` it sits under, and its pending state is skipped entirely
  once a route is prefetched.
- Progress is written straight to the node's transform. Animating a decorative
  bar through React state re-renders the shell every frame.

## Checklist for a new detail route

- [ ] Layout awaits `params` only; data access is behind `<Suspense>`.
- [ ] Tab strip built from `params`, rendered immediately.
- [ ] `notFound()` lives in the streamed server component that resolves the record.
- [ ] The route's own `loading.tsx` sits at the leaf, not at a segment holding a
      route group.
- [ ] Any guard on the path is memoized and does no avoidable network I/O.
- [ ] `node scripts/check-app-structure.mjs` passes.
