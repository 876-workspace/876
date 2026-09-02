# CRM: remove `Request.description`, make it the first request note

## Why

A CRM request is an inbound thing (an email, a phone call, a manually logged
customer issue). It should not carry a free-text `description` column of its
own. Zoho Desk's model is the target: the ticket's opening message **is the
first entry in the note thread**, and everything after it is an ordinary note.

So: delete `Request.description` entirely, and represent the opening message as
a `RequestNote` with `kind = DESCRIPTION`. Every other note is `kind = NOTE`.

The CRM Next.js app (`apps/crm/src/app/**`, `apps/crm/src/lib/client/**`,
`apps/crm/src/types/crm.ts`) is being rewritten **in parallel by another agent
against the contract below**. Do not touch any file under `apps/crm/`.

## Scope — you own exactly these files

- `apps/crm-api/prisma/schema/request.prisma`
- `apps/crm-api/prisma/migrations/20260826170000_request_description_notes/migration.sql` (new)
- `apps/crm-api/src/types/request.ts`
- `apps/crm-api/src/http/errors.ts`
- `apps/crm-api/src/modules/requests/requests.{schemas,service,repository,controller,routes}.ts`
- `packages/crm/src/types.ts`
- `packages/crm/src/resources/request-notes.ts`
- `packages/crm/src/index.ts`
- `packages/crm/src/client.test.ts`

Do **not** touch `apps/crm/**`, `packages/client/**`, or any other app.

## The contract (fixed — the frontend is being written against it)

### Prisma

`model Request`: **drop** the `description` column.

`model RequestNote`: add

```prisma
enum RequestNoteKind {
  DESCRIPTION
  NOTE
}

  kind     RequestNoteKind @default(NOTE)
  editedAt DateTime?       @map("edited_at")
```

Add a partial unique index so a request can never have two description notes:

```prisma
@@unique([tenantId, requestId, kind])   // NO — see below
```

Prisma cannot express a partial unique index, so declare it **only in the
migration SQL** as:

```sql
CREATE UNIQUE INDEX "crm_request_notes_description_unique"
  ON "crm_request_notes" ("tenant_id", "request_id")
  WHERE "kind" = 'DESCRIPTION' AND "deleted_at" IS NULL;
```

and leave a comment in the schema saying the index lives in the migration.

### Migration SQL (`20260826170000_request_description_notes`)

In this order, one file:

1. `CREATE TYPE "RequestNoteKind" AS ENUM ('DESCRIPTION', 'NOTE');`
2. Add `kind` (NOT NULL DEFAULT 'NOTE') and `edited_at` (nullable) to
   `crm_request_notes`.
3. **Backfill**: for every `crm_requests` row whose `description` is non-null
   and non-blank, insert a `crm_request_notes` row with
   `kind='DESCRIPTION'`, `internal=false`, `author_id = r.created_by`,
   `body = r.description`, and `created_at = updated_at = r.created_at`.
   Generate the id as `'crm_note_' || replace(gen_random_uuid()::text, '-', '')`
   to match the application's id format.
4. Create the partial unique index above.
5. `ALTER TABLE "crm_requests" DROP COLUMN "description";`

The backfill must run **before** the drop. Do not lose data.

### `src/types/request.ts`

- `RequestNoteKind = 'DESCRIPTION' | 'NOTE'`
- `CrmRequest`: remove `description`.
- `CrmRequestNote`: add `kind: RequestNoteKind` and `editedAt: number | null`.
- `CreateRequestInput`: **keep** `description?: string | null`, but it now means
  "the opening message", and the service turns it into the DESCRIPTION note. Add
  a doc comment saying exactly that.
- `UpdateRequestInput`: remove `description`.
- `CreateRequestNoteInput`: unchanged (`body`, `authorId`, `internal?`). It
  **never** accepts `kind` — a caller cannot create a description note.
- New: `UpdateRequestNoteInput { body: string; editedBy: string }`.

### Errors

Add one registry entry:

```ts
'crm/description-note-immutable': {
  message: 'A request’s opening note cannot be deleted.',
  httpStatus: 409,
},
```

### Service behaviour

- `create(organizationId, input)`: inside the **same `prisma.$transaction`** as
  the request insert (move the note write into the repository's existing
  transaction), when `input.description?.trim()` is non-empty, also insert the
  DESCRIPTION note (`internal: false`, `authorId: input.createdBy`). Return the
  serialized request as before (no `description` field).
- `createNote`: always writes `kind: 'NOTE'`.
- New `updateNote(organizationId, requestId, id, input: UpdateRequestNoteInput)`:
  returns `null` when the note does not exist (controller answers 404); sets
  `body` and `editedAt = now()`. **Editing a DESCRIPTION note is allowed.**
- `removeNote`: if the note's `kind === 'DESCRIPTION'`, throw
  `crmError('crm/description-note-immutable')`. Deleting a normal note is
  unchanged.
- `listNotes` keeps `orderBy: { createdAt: 'desc' }`. The frontend pins the
  description itself; do not special-case ordering here.
- The note serializer gains `kind` and `editedAt` (Unix **seconds**, or null).

### Routes / schemas

- Add `PATCH /:id/notes/:noteId` → `controller.updateRequestNote`, guarded by
  `requireInternal` exactly like its neighbours, declared **after** the existing
  notes routes.
- `updateRequestNoteBodySchema`: `{ body: string().trim().min(1).max(10_000),
  editedBy: string().min(1) }`.
- `createRequestBodySchema`: keep `description` (same constraints).
- `updateRequestBodySchema`: drop `description`. Keep the "at least one field"
  refine.

### `packages/crm`

- `types.ts`: add `requestNoteKindSchema`; add `kind` + `editedAt` to
  `crmRequestNoteSchema`; **remove `description` from `crmRequestSchema`**;
  remove `description` from `UpdateRequestInput`; keep it on
  `CreateRequestInput` with the same doc comment; add `UpdateRequestNoteInput`.
- `resources/request-notes.ts`: add
  `update(organizationId, requestId, noteId, input, options?)` →
  `PATCH {root}/{noteId}`, validated with `crmRequestNoteSchema`.
- `index.ts`: export `RequestNoteKind` and `UpdateRequestNoteInput`.
- `client.test.ts`: follow the file's existing style and
  `.claude/rules/testing.md`. Add coverage for: the note update call (exact
  method, exact path, exact body, full response shape asserted, `error` asserted
  null) and the create-request payload no longer carrying a stored description.
  Update any existing fixture that still sets `description` on a request.

## Rules that apply

Read and follow `.claude/rules/express-api.md` (layer boundaries — controllers
never touch prisma, services never touch `req`/`res`, only the repository
imports the prisma client), `.claude/rules/stripe-api-pattern.md` (the `object`
discriminator, `{ data, error }` envelopes, Unix-second timestamps),
`.claude/rules/deletions.md`, and `.claude/rules/testing.md`.

## Verify before reporting done — all in the foreground

```
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api boundaries
pnpm --filter @876/crm-api test
pnpm --filter @876/crm db:validate 2>/dev/null || npx prisma validate --schema apps/crm-api/prisma/schema
pnpm --filter @876/crm-client typecheck   # or whatever packages/crm's workspace name is — check its package.json
pnpm --filter <packages/crm workspace name> test
```

Report exactly which commands you ran and their real results. Do not commit.
