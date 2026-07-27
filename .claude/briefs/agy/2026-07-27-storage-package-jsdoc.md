# Brief: Stripe-style JSDoc for `@876/storage`

## Why

`@876/storage` is the typed server-only client for the 876 Storage service.
Only one consumer exists today (`apps/couriers/src/lib/storage.ts`); the team is
about to start integrating it in other apps. The package's JSDoc is currently
one terse line per export, which is not enough for someone wiring it into a new
app from editor hover alone. Bring it up to the repo's Stripe-inspired
documentation standard.

## Authoritative standard

Read `.claude/rules/stripe-api-pattern.md`, section **JSDoc Rules**, before
writing anything. In short:

- Methods get: one-line summary, blank line, any necessary prose, `@param` per
  parameter, `@returns` describing the result shape, `@see` for the stable API
  route, and `@example` where it earns its place.
- Properties/fields get a short `/** ... */` explaining the field.
- Repetitive and editor-friendly beats clever. Keep comments succinct; do not
  document obvious assignments or restate the type in words.

## Reference implementation — match this voice exactly

`packages/storage/src/client.ts` and `packages/storage/src/resources/uploads.ts`
are **already done** in this branch. Read them first and match their tone,
depth, and structure.

**Do not modify those two files.**

## Files in scope

1. `packages/storage/src/resources/files.ts` — `retrieve`, `createReadUrl`,
   `delete`. Full method-level treatment like `resources/uploads.ts`.
2. `packages/storage/src/types/files.ts` — per-field docs inside the Zod
   schemas, and richer docs on the exported types.
3. `packages/storage/src/types/uploads.ts` — same.
4. `packages/storage/src/types/common.ts` — `StorageResult`, `AppError`, the
   error-code enums, and `StorageClientOptions`.
5. `packages/storage/src/index.ts` — expand the `@module` docblock into a
   short quick-start: what the package is, the secret-key/server-only
   constraint, and the three-step upload flow in one `@example`.
6. `packages/storage/src/request.ts` and `packages/storage/src/runtime.ts` —
   internal plumbing; a light pass only.

## Domain facts you must get right (do not invent alternatives)

- **Server-only, secret-key tier.** The client authenticates with
  `STORAGE_INTERNAL_KEY` via the `x-internal-key` header. It must never reach
  browser code. `index.ts` imports `server-only`.
- **Every method returns `StorageResult<T>` = `{ data, error }` and never
  throws.** Errors are values with a stable `code` and a client-safe `message`.
  There is no `httpStatus` on a client-facing error, by design.
- **Upload flow is three steps**: `uploads.create()` on your server → the
  **browser** `PUT`s bytes directly to R2 with the returned `upload_url` and
  exact `headers` → `uploads.complete()`, where Storage `HEAD`s the object and
  verifies it itself.
- **`category` vs `audience`** (from `.claude/rules/storage-architecture.md` —
  read the "Classification" section):
  - `category` = how the file is managed and whether 876 Drive will ever list
    it (`library` browsable; `attachment` reachable only via its resource
    link; `system` internal).
  - `audience` = who may read the bytes (`private`, `organization`, `app`,
    `public`).
  - Both are **server-assigned from the upload route**, never client-supplied,
    never editable by an end user. Say so where it matters.
  - Never use the word "visibility" for either axis.
- **Delivery derives from `audience`**: only a `ready` + `public` file carries
  a stable CDN `url`; everything else is null there and needs
  `files.createReadUrl()` for a short-lived signed URL. `fileSchema` enforces
  exactly this with a `superRefine` — document the invariant, do not restate
  the refinement code.
- **`files.delete()` is a soft delete** returning a tombstone
  (`{ object: 'file', id, deleted: true }`), per `.claude/rules/deletions.md`.
- Timestamps (`expires_at`, `created_at`, `updated_at`) are **Unix seconds**.
- `expires_in` on `createReadUrl` is seconds, optional, max 3600.

## Hard constraints

- **JSDoc and comments only.** Do not change a single line of runtime
  behavior: no renames, no reordering, no import changes, no type changes, no
  new exports, no new files. If you think code should change, say so in your
  final response instead of doing it.
- Do not touch any `*.test.ts` file.
- Do not touch `client.ts` or `resources/uploads.ts`.
- Do not invent API routes, error codes, or parameters. The real error codes
  are the enum in `types/common.ts`; the real routes are `/v1/uploads`,
  `/v1/uploads/{session_id}/complete`, `/v1/files/{file_id}`,
  `/v1/files/{file_id}/read-url`.
- Do not commit. Leave changes in the working tree; the orchestrator commits.

## Verify before you finish

```bash
pnpm --filter @876/storage typecheck
pnpm --filter @876/storage test
pnpm --filter @876/storage lint
npx prettier --write "packages/storage/src/**/*.ts"
```

All three must pass, and prettier must leave the files unchanged on a second
run. Report the exact command output in your final response.
