# Brief — Build `packages/storage` (876 Storage client)

**Tool:** `codex exec`, model `gpt-5.6-sol`, `model_reasoning_effort=high`.
**Branch:** `feat/876-storage-service` (already checked out — do **not** switch
branches, do **not** commit, do **not** push. The orchestrator commits.)

## Goal

Ship `@876/storage`, the typed server-only client that 876 apps use to talk to
the 876 Storage service. When you are done, a Next.js route handler must be able
to write:

```ts
import { $storage } from '@/lib/storage'

const { data, error } = await $storage.uploads.create({ ... })
```

and get a fully typed, validated result with a `{ data, error }` envelope.

## Critical: you are working in parallel with another agent

Another agent is building the service (`apps/storage-api`) **at the same time**
against the same frozen contract. You must therefore:

- **Never read, create, or modify anything under `apps/storage-api/`.** It will
  be half-written while you work; looking at it will mislead you.
- Build **only** against
  `.claude/briefs/sub-agent/2026-07-25-storage-api-contract.md`, which is
  authoritative and immutable.
- If the contract seems wrong or ambiguous, implement it exactly as written and
  flag it in your report. Do not "fix" it — the other side is being built to
  match it.

Your blast radius is **`packages/storage/` only**, plus adding the workspace
dependency where required. Do not modify `apps/**` or other packages.

## Read first

1. `.claude/rules/sdk-conventions.md` — **the most important one.** The
   `$<client>.<resource>.<verb>()` surface, the verb vocabulary, the resource
   factory-module pattern, tier packaging, and the banned prefixes
   (`findBy*`/`getBy*`/`fetchBy*`/bare `get()`).
2. `.claude/briefs/sub-agent/2026-07-25-storage-api-contract.md` — the contract.
3. `.claude/rules/storage-architecture.md` — terminology and the classification
   model the types must encode.
4. `.claude/rules/stripe-api-pattern.md` — `object` discriminators,
   `{ data, error }` envelopes, client-safe errors (**no `httpStatus` on
   client-facing errors**), Zod conventions.
5. `.claude/rules/types.md`.

## Study the real precedents before writing

Read these and match their structure rather than inventing a new shape:

- `packages/billing/src/integration/` — `client.ts`, `runtime.ts`, `request.ts`.
  This is the closest analogue: a server-side integration client for a separate
  FastAPI service, with credential-header selection and env-based base-URL
  resolution.
- `packages/admin/src/` — `client.ts` composition, `request.ts`,
  `resources/*.ts` factory modules, `types.ts`.
- `packages/core/src/client/` — the shared runtime: base-URL resolution, query
  building, and `sendClientRequest`. **Build on this rather than writing new
  transport.**

## What to build

### Package shape

`packages/storage/` — name `@876/storage`, private, matching the
`package.json` / `tsconfig.json` / build setup of `packages/billing`.

```
src/
  client.ts          # create876StorageClient — pure composition
  runtime.ts         # base URL + credential resolution
  request.ts         # credential header + error shaping over @876/core/client
  resources/
    uploads.ts
    files.ts
  types/
    files.ts         # Zod schemas + inferred types
    uploads.ts
  index.ts
```

`client.ts` builds the runtime once and passes it to each resource factory —
composition only, no method bodies.

### Client construction

```ts
export const $storage = create876StorageClient({
  baseUrl: process.env.STORAGE_API_URL,
  internalKey: process.env.STORAGE_INTERNAL_KEY,
  requestId, // optional, forwarded as x-request-id
})
```

Base URL resolves from `STORAGE_API_URL` with a `http://localhost:4005`
development default, following `resolveClientBaseUrl`'s per-tier env-key
precedence in `@876/core/client`.

**Server-only.** Add `import 'server-only'` at the package entry, and make the
credential requirement explicit: if `internalKey` is absent, every request must
fail fast with `storage/not-configured` rather than sending an unauthenticated
request. The service key must never be bundled for the browser.

### Surface

Exactly these methods, matching the contract:

```ts
$storage.uploads.create(params)        // POST /v1/uploads
$storage.uploads.complete(sessionId)   // POST /v1/uploads/{id}/complete
$storage.files.retrieve(fileId)        // GET  /v1/files/{id}
$storage.files.createReadUrl(fileId, params?) // POST /v1/files/{id}/read-url
$storage.files.delete(fileId)          // DELETE /v1/files/{id}
```

Every method returns `Promise<{ data: T; error: null } | { data: null; error: AppError }>`.
No method throws for an expected failure. `delete` (never `del`) per the current
vocabulary.

### Types

One file per category under `src/types/`, each holding the Zod schema and the
type inferred from it via `z.infer`. Model the contract exactly:

- `file` with its `object: 'file'` literal discriminator, and **string-literal
  unions** for `owner_type`, `visibility`, `delivery`, and `status` — not
  `string`. These unions are the whole point: a consumer must not be able to
  invent a visibility.
- `upload_session` with `object: 'upload_session'`.
- `read_url` with `object: 'read_url'`.
- The deleted tombstone `{ object: 'file', id, deleted: true }`.

Validate every response with its schema; a malformed payload is an error, not a
silently-passed-through `any`.

### Error handling

Map the contract's error codes to a typed union. Client-facing errors carry
`code` and `message` only — **never an HTTP status field**. A non-JSON or
unparseable response becomes `storage/provider-error`. A network failure becomes
a typed error, never an unhandled rejection.

### Tests

Vitest, per `.claude/rules/testing.md`. Mock at the `fetch`/transport boundary —
**do not** call a real service. Cover: each method's URL, HTTP method, headers,
and body are exactly right; success envelope shape; each error code mapped
correctly; malformed response rejected; missing `internalKey` fails before any
network call (assert `fetch` was **not** called); schema rejects an invalid
`visibility` value.

Assert exact values and complete shapes — no `toBeDefined()`-only assertions,
and use `toHaveBeenCalledWith(...)` with exact arguments rather than bare
`toHaveBeenCalled()`.

## Verification commands (must pass before you report done)

```bash
pnpm --filter @876/storage typecheck
pnpm --filter @876/storage test
pnpm --filter @876/storage lint
```

## Constraints

- Do not read or touch `apps/storage-api/` or any `apps/**`.
- Do not commit, push, or switch branches.
- No bespoke flat wrappers (`createUpload()`, `getFile()`) — namespaced
  `<resource>.<verb>()` only.
- Do not add browser-safe exports; this tier is server-only by design.

## Report back

Files created; the exact public surface (every method signature); commands run
and their real output; anything in the contract you had to interpret; anything
unfinished and why. Report failures honestly.
