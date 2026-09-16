# Brief — Widgets API: Notepad admin stats endpoint

**Tool:** `agy` (`claude-sonnet-4-6`, `--effort high`)
**Repo:** `/workspaces/876` — branch `feature/widgets-api-stats`
**Do not commit.** The orchestrator stages and commits.

## Why

Console's widget detail page (`/widgets/notepad`) currently renders three
placeholder "Not connected" usage rows. We are replacing them with real stat
cards, matching the app-detail stat tiles in
`apps/console/src/app/(app)/apps/[slug]/page.tsx`. Those cards need real
aggregate numbers out of the Widgets bounded context. Console must **not**
query the Widgets database — it has no credentials and never will. So the
numbers have to come from a new admin endpoint on `apps/widgets-api`, reached
through the existing `@876/widgets/server/admin` client.

This brief is **only** the backend half: the endpoint, its service function,
and the client method. Do not touch any Console UI.

## File scope (touch nothing else)

- `apps/widgets-api/src/lib/service/stats/` (new directory)
- `apps/widgets-api/src/lib/service/index.ts` (register the namespace)
- `apps/widgets-api/src/app/api/v1/admin/stats/notepad/route.ts` (new)
- `packages/widgets/src/types/stats.ts` (new)
- `packages/widgets/src/server/admin.ts` (add the `stats` namespace)
- Test files colocated with the above.

## What to build

### 1. Service — `apps/widgets-api/src/lib/service/stats/notepad.ts`

```ts
export async function retrieveNotepadStats(): Promise<
  ServiceResult<NotepadStats>
>
```

Returns this exact shape (snake_case on the wire, matching every other
serialized resource in this app):

```ts
{
  object: 'notepad_stats',
  notes: number,              // total NotepadNote rows
  collections: number,        // total NotepadCollection rows
  accounts: number,           // distinct owner_account_id across notes
  pinned_notes: number,       // notes where pinned = true
  filed_notes: number,        // notes where collection_id IS NOT NULL
  notes_created_last_30d: number,   // created_at >= now - 30d
  notes_updated_last_30d: number,   // updated_at >= now - 30d
  active_accounts_last_30d: number, // distinct owner_account_id, updated_at >= now - 30d
  generated_at: number        // unix seconds
}
```

Timestamps in this database are **Unix seconds** (`Int`), not `DateTime` —
see `apps/widgets-api/prisma/schema/`. Compute the 30-day boundary as
`Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60`.

Implementation notes:

- Import `prisma` from `@/lib/db` — never construct a client. That module is
  request-scoped for Cloudflare Workers; just use the exported `prisma`.
- Use `prisma.notepadNote.count(...)`, `prisma.notepadCollection.count(...)`,
  and `prisma.notepadNote.groupBy({ by: ['ownerAccountId'] })` (then take
  `.length`) for the distinct-account counts. Prisma has no `countDistinct`.
- Run the independent queries concurrently with a single `Promise.all` — this
  runs on a Worker and eight sequential round trips to Neon is a real cost.
- Return via `ok(...)` from `../result`.
- Follow the existing file-per-verb layout: `notepad.ts` plus an `index.ts`
  that re-exports, exactly like `apps/widgets-api/src/lib/service/notes/`.
- Types go in `apps/widgets-api/src/lib/service/stats/types.ts`, mirroring
  `apps/widgets-api/src/lib/service/notes/types.ts`.

### 2. Route — `apps/widgets-api/src/app/api/v1/admin/stats/notepad/route.ts`

Copy the shape of `apps/widgets-api/src/app/api/v1/admin/notes/route.ts`
exactly:

```ts
import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const result = await service.stats.retrieveNotepadStats()
  return serviceResponse(result)
}
```

`{ admin: true }` is required — these are cross-account aggregates.

### 3. Client — `packages/widgets/src/server/admin.ts`

Add a `stats` namespace alongside the existing `notes` namespace, following
the identical `requestJson` + Zod `safeParse` pattern already in that file:

```ts
stats: {
  notepad(actor: Actor) {
    return requestJson(
      config,
      actor,
      { method: 'GET', path: '/api/v1/admin/stats/notepad', role: 'admin' },
      (data) => {
        const parsed = notepadStatsSchema.safeParse(data)
        return parsed.success ? parsed.data : null
      }
    ) as Promise<WidgetsClientResult<NotepadStats>>
  },
},
```

Note the verb: `notepad()` reads as `stats.notepad()`. Do **not** name it
`get`/`fetch`/`load` — those prefixes are banned by
`.claude/rules/sdk-conventions.md`.

Put `notepadStatsSchema` and the inferred `NotepadStats` type in
`packages/widgets/src/types/stats.ts`, modelled on
`packages/widgets/src/types/notes.ts` (Zod schema first, type inferred from
it). Export it from wherever the other type modules are exported.

## Tests

Add `apps/widgets-api/src/lib/service/stats/notepad.test.ts`. Follow the
existing mocking pattern in
`apps/widgets-api/src/lib/service/notes/notes.service.test.ts` — read it first
and match it; do not invent a different Prisma mocking approach.

Per `.claude/rules/testing.md`, every assertion must be able to fail:

- Assert the **complete** returned object with `toEqual`, not `toBeDefined()`.
- Assert the 30-day boundary is computed correctly by faking the system clock
  (`vi.useFakeTimers()` + `vi.setSystemTime()`, and `vi.useRealTimers()` in
  `afterEach`) and asserting the exact `gte` value passed to the Prisma mock
  via `toHaveBeenCalledWith`.
- Cover the empty-database case (every count zero).
- Assert `generated_at` against the faked clock, not `expect.any(Number)`.

## Verify (must pass before you report done)

```
pnpm --filter @876/widgets-api typecheck
pnpm --filter @876/widgets-api test
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
```

## Constraints

- Read `.claude/rules/sdk-conventions.md` (verb vocabulary, service layering:
  only `src/lib/service/` may touch `prisma`) and `.claude/rules/types.md`
  before writing code.
- No migrations. No schema changes. Read-only aggregation over existing tables.
- Do not touch `apps/console` — that is a separate phase.
- Do not run `git commit`.
