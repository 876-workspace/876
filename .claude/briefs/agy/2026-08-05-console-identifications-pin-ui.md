# Brief — Console UI for identifications and the account PIN

**Tool:** `agy`, `claude-sonnet-4-6`
**Repo:** `/workspaces/876`, branch `feat/auth-device-telemetry`
**Author:** Opus 5 (primary agent)

## Your task

Add two sections to the Console user Security tab
(`apps/console/src/app/(app)/users/[username]/security/page.tsx`):

1. **Identifications** — the user's sensitive identifiers, masked.
2. **Account PIN** — PIN status, with Set and Clear actions.

## Files you may create or modify — nothing else

Create:

- `apps/console/src/app/(app)/users/[username]/security/_components/identifications-section.tsx`
- `apps/console/src/app/(app)/users/[username]/security/_components/pin-section.tsx`
- `apps/console/src/app/api/users/[id]/pin/route.ts`
- `apps/console/src/lib/client/pin.ts`

Modify:

- `apps/console/src/app/(app)/users/[username]/security/page.tsx` (wire the two
  new sections in, each in its own `<Suspense>`, exactly like the existing
  `DevicesData` / `SessionsData` / `SignInActivityData` components already there
  — copy that pattern)
- `apps/console/src/lib/client/index.ts` (register the new `pin` namespace
  beside the existing `sessions` and `devices` entries)

**Do not touch `apps/api`, `packages/`, or any other app.** Do not commit,
stage, branch or stash.

## The client surface that already exists — use it, do not invent

Server-side, from `@/lib/876`:

```ts
$876.users.identifications.list(userId) // { data: { data: [...] } }
$876.users.pin.retrieve(userId) // AdminUserPin
```

An identification serializes as:

```ts
{
  ;(id,
    user_id,
    type,
    label,
    country_code,
    value_masked,
    verified,
    verified_at,
    created_at,
    updated_at)
}
```

`AdminUserPin` is:

```ts
{
  object: ('pin',
    user_id,
    scope,
    is_set,
    set_at,
    last_verified_at,
    failed_attempts,
    locked_until)
}
```

**`value_masked` is the only value form that exists.** There is no unmasked
value on these responses and you must not attempt to obtain one — full
disclosure is a separate entitlement-gated API that Console does not call here.
Do not build a "reveal" affordance.

## The route handler

`apps/console/src/app/api/users/[id]/pin/route.ts` — copy the exact shape of
`apps/console/src/app/api/sessions/[id]/route.ts`, which is the reference:
`requireConsolePermission('console:users')` first, then `$876`, then
`apiJson`. No business logic.

- `POST` → `$876.users.pin.set(id, { pin })`
- `DELETE` → `$876.users.pin.delete(id)`

`apps/console/src/lib/client/pin.ts` exports `pin = { set, clear }` calling
those, following `apps/console/src/lib/client/sessions.ts` exactly.

## What each section renders

### Identifications

A `876-card p-5` with an `<h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">`
heading (match `devices-section.tsx` exactly), then a table:

| Column  | Content                                                                                        | Style                             |
| ------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| Type    | `label` (e.g. "Taxpayer Registration Number")                                                  | `font-medium` — the row subject   |
| Value   | `value_masked`                                                                                 | `font-mono text-muted-foreground` |
| Country | `country_code` or an em dash                                                                   | `text-muted-foreground`           |
| Status  | `<Badge variant="success">Verified</Badge>` or `<Badge variant="secondary">Unverified</Badge>` | —                                 |
| Added   | `created_at` formatted                                                                         | `text-muted-foreground`           |

Empty state: `<p className="text-muted-foreground text-sm">No identifications recorded.</p>`
— a bare sentence, no heading, no description paragraph.

### Account PIN

A `876-card p-5` showing:

- whether a PIN is set (`<Badge>`),
- when it was set and last verified (or an em dash),
- a **lockout warning** when `locked_until` is in the future — render it with
  `variant="warning"`, never green,
- a "Set PIN" control (a 4–8 digit input plus a submit button) that calls
  `client.pin.set`,
- a "Clear" destructive button, only when `is_set` is true, behind a
  `window.confirm`, calling `client.pin.clear`.

On success call `router.refresh()`. On error render `result.error.message` in
`text-destructive text-sm`. Copy the state handling in
`_components/sessions-section.tsx` — `useTransition`, an `error` state, no
toasts.

**Never render the PIN value back to the screen after submission, and never put
it in a URL or a query string.**

## Rules you must follow

- `.claude/rules/app-layout.md` — bare-verb button labels (`Set`, `Clear`), no
  green buttons, table cell hierarchy (exactly one `font-medium` subject cell
  per row), em dash for empty values.
- `CLAUDE.md` UI copy — **no explanatory `<p>` under a heading**. A heading and
  the table is the whole section.
- `.claude/rules/app-structure.md` — these are route-local `_components/`, no
  barrel files, no app-name prefixes on file or symbol names.
- Server components fetch; only the interactive PIN card is `'use client'`.
- Mutations go through the route handler, never a server action.

## Verification before you report done

```bash
cd /workspaces/876
pnpm --filter @876/console typecheck
pnpm --filter @876/console test
npx prettier --check "apps/console/src/app/(app)/users/[username]/security/**/*.tsx" "apps/console/src/lib/client/pin.ts" "apps/console/src/app/api/users/[id]/pin/route.ts"
```

All three must pass; run `prettier --write` on your files if the check fails.
`git status --short` must show only the files listed at the top of this brief.

Report: the files you created and modified, the command output, and anything in
this brief that conflicted with what you found in the code.
