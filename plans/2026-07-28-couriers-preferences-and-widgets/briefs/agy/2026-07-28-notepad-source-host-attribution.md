# Brief — Notepad notes: record which app a note was written in

**Tool:** `agy` (`gemini-3.1-pro-high`)
**Repo:** `/workspaces/876` — work on the current branch
**Do not commit. Do not open a PR.** The orchestrator stages and commits.

## Hard file scope — touching anything else will break a concurrent phase

You may edit **only**:

- `apps/widgets-api/prisma/schema/` and `apps/widgets-api/prisma/migrations/`
- `apps/widgets-api/src/lib/service/notes/`
- `apps/widgets-api/src/app/api/v1/notes/route.ts`
- `apps/widgets-api/src/app/api/v1/admin/notes/route.ts`
- `apps/widgets-api/src/lib/auth/service-key.ts`
- `packages/widgets/src/types/notes.ts`
- `packages/widgets/src/server/request.ts`
- `packages/widgets/src/server/client.ts`
- `packages/widgets/src/server/admin.ts`
- `packages/widgets/src/browser/notes.ts`
- test files colocated with the above

**Do NOT touch `apps/console`, `apps/couriers`, `apps/billing`, `apps/api`, or
`packages/widgets/src/react/`.** Another agent is editing `apps/api` right now
and Claude is editing `apps/console`. If a Console or host-app change is
needed, describe it in your report — do not make it.

## Why

Console's Notepad admin data view is being rebuilt as a master-detail screen.
One required column is **which application the note was written in** — Notepad
is a shared widget that runs in Console, Billing and Couriers, and an admin
looking at a note has no way to tell where it came from. The `notepad_notes`
table has no such column today, so this is a schema change plus a write path.

## The design decision (already made — implement it, don't redesign it)

Store the **widget host**, not a core 876 app ID.

`WidgetHost` is an existing shared union in `packages/widgets/src/catalog.ts`:
`'console' | 'billing' | 'couriers' | 'enterprise' | '876'`. It is already the
vocabulary the widget catalog uses for per-app feature keys, and
`WIDGET_HOST_APP_SLUGS` already maps it to app slugs, so Console can resolve a
display name without the Widgets database holding a cross-context identifier.

This deliberately avoids storing a core `app_…` ID: per
`.claude/rules/platform-services.md`, cross-context references are opaque IDs
with no FK, and adding one here would mean every host must be configured with
its own app ID for no display benefit. The host enum is simpler and already
shared. **Do not** add an `app_id` column.

## 1. Schema + migration

In `apps/widgets-api/prisma/schema/` add to the `NotepadNote` model:

```prisma
/// Widget host the note was created in (@876/widgets WidgetHost). Null for
/// rows written before attribution existed.
sourceHost String? @map("source_host")
```

Nullable is required — existing rows genuinely have unknown provenance and
must not be back-filled with a guess.

Add an index only if you can justify it; a display-only column probably does
not need one. State your reasoning.

Write the migration by hand under
`apps/widgets-api/prisma/migrations/20260728000000_notepad_source_host/migration.sql`,
matching the style of the two existing migrations (read them first). It must be
a plain additive `ALTER TABLE ... ADD COLUMN "source_host" TEXT;` — no
back-fill, no `NOT NULL`, no default.

Then regenerate the Prisma client:
`pnpm --filter @876/widgets-api exec prisma generate`
(The generated client is committed under `src/lib/db/generated/prisma` — the
regeneration diff is expected and should be left in place.)

Do **not** run `prisma migrate deploy` or touch a live database. Migrations run
in GitHub Actions per `CLAUDE.md`.

## 2. Transport: a new header

`packages/widgets/src/server/request.ts` currently sends `x-internal-key`,
`x-876-actor-user-id`, and conditionally `x-876-widget-role`. Add an optional
host header.

- Add `host?: WidgetHost` to `CreateWidgetsClientOptions` (import the type from
  `../catalog`).
- Return it from `resolveConfig` (fall back to `process.env.WIDGETS_HOST` if
  unset, then `undefined`).
- In `requestJson`, send `'x-876-widget-host': config.host` **only when
  defined** — same conditional-spread style already used for the admin role
  header.

In `apps/widgets-api/src/lib/auth/service-key.ts`, read the header and return
it on the `ServiceAuth` success shape as `sourceHost: WidgetHost | null`.
**Validate it against the known host list** — an unrecognised value becomes
`null`, never a stored free-text string. Keep the error shape of the failure
branches exactly as it is (they return `actorUserId: null`); add `sourceHost:
null` to those branches so the union stays consistent.

## 3. Write path

- `apps/widgets-api/src/lib/service/notes/create.ts`: accept
  `sourceHost?: string | null` in the params and write it to
  `prisma.notepadNote.create({ data: { ... sourceHost: params.sourceHost ?? null } })`.
- `apps/widgets-api/src/app/api/v1/notes/route.ts` `POST`: pass
  `sourceHost: auth.sourceHost` into `service.notes.createNote(...)`.
- **Do not** let a client set the host in the JSON body. It comes from the
  authenticated header only — the same reasoning as `ownerAccountId`, which is
  taken from `auth.actorUserId` and never from the body.
- Note updates must **not** rewrite `sourceHost`. A note is attributed to where
  it was created, not where it was last edited. Leave `update.ts` alone except
  to confirm it does not clobber the column.

## 4. Serialization + types

- `apps/widgets-api/src/lib/service/notes/serialize.ts`: add
  `source_host: row.sourceHost ?? null` to `serializeNote`. Snake_case on the
  wire, matching every other field.
- `apps/widgets-api/src/lib/service/notes/types.ts`: add
  `source_host: string | null` to `NotepadNoteResource`.
- `packages/widgets/src/types/notes.ts`: add
  `source_host: z.string().nullable()` to `notepadNoteSchema`. Read the file
  first and match the existing style (it uses `z.object`, not `z.strictObject`
  — stay consistent with its neighbours).

Adding a field to the response schema is backwards-compatible for readers but
**will fail validation for any existing test fixture that omits it**. Update
every fixture you break; do not relax the schema to `.optional()` to dodge that.

## 5. Tests

Follow `.claude/rules/testing.md` — every assertion must be able to fail.

- `create.ts`: a note created with `sourceHost: 'couriers'` persists it —
  assert with `toHaveBeenCalledWith` on the exact Prisma `data` object, not a
  partial match.
- `create.ts`: omitted host persists `null`.
- `service-key.ts`: a valid `x-876-widget-host: billing` header yields
  `sourceHost: 'billing'`; an **unknown** value (`'evil'`) yields `null`; a
  missing header yields `null`. These three are the security-relevant cases.
- `serialize.ts`: `source_host` round-trips, including the null case.
- Confirm the existing notes tests still pass with the new field present.

## 6. Verify — all must pass, report the real output

```
pnpm --filter @876/widgets-api typecheck
pnpm --filter @876/widgets-api test
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
```

## 7. Report back

State explicitly:

1. The migration SQL you wrote.
2. Every call site that must now pass `host` when constructing a widgets client
   (i.e. what Console/Couriers/Billing will need to set) — **describe only, do
   not edit those apps.**
3. Any test fixture you had to update because of the new field.
4. Whether you added an index and why.

## 8. Rules to read first

- `.claude/rules/sdk-conventions.md` — service layering, verb vocabulary,
  the two-layer app-local datastore rule
- `.claude/rules/types.md` — where types live
- `.claude/rules/testing.md` — assertion standard
- `.claude/rules/platform-services.md` — why this stores a host enum and not a
  core app ID

## 9. Honesty requirement

If a verification command fails and you cannot fix it inside your file scope,
say so plainly and stop. Do not report success you have not observed, and do
not widen your file scope to make a check pass.
