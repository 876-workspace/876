# Brief: surface storage-quota rejections in the Couriers uploader

## Context

The 876 Storage service now enforces per-organization storage quotas. It can
reject an upload with two new error codes that the Couriers app does not yet
know about:

- `storage/quota-exceeded` — HTTP **409**. The organization (or the member's
  cap) has no room for this file. The server builds a message that already
  names the real figures, e.g.
  "This upload needs 12 MB but only 3.1 MB of the organization's 5 GB storage
  remains."
- `storage/quota-suspended` — HTTP **403**. Storage uploads for that subject
  are administratively suspended. Reads and deletes still work.

Couriers maps storage error codes to user-facing definitions in
`apps/couriers/src/lib/errors/storage.ts`. Any code missing from that registry
falls through to a generic message, which would throw away the useful figures
the server computed.

## Your task

### 1. `apps/couriers/src/lib/errors/storage.ts`

Add the two codes to the `STORAGE_ERRORS` object, following the existing
entries exactly (same shape, same `HttpStatus` import, alphabetical position
consistent with how the file is already ordered).

- `storage/quota-exceeded` → `HttpStatus.CONFLICT`
- `storage/quota-suspended` → `HttpStatus.FORBIDDEN`

Write fallback messages that make sense when no server message is available.
Keep them short and non-technical. Do not mention bytes or plans in the
fallback — the specific figures only exist in the server's message.

### 2. `apps/couriers/src/lib/errors/storage.test.ts`

Extend the existing test file, matching its current style. Assert for each new
code: that it exists in the registry, that its `httpStatus` is exactly the
number above, and that its message is user-safe (no stack traces, no file
paths, no internal identifiers). If the existing file has a snapshot or
exhaustive list of codes, update it.

### 3. Verify the uploader surfaces the server message verbatim

Read
`apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/organization-logo-upload.tsx`.
When the start request fails, it calls `fail(startResult.error.message)`. That
is already correct behavior for a quota rejection — the server message carries
the figures.

**Only if** you find it does NOT use the server's message, fix it so it does.
Do not otherwise restructure that component: it was recently redesigned, and
its progress ring, drag state, transport seam (`putDirectToStorage`), and test
mocks must be preserved exactly.

## Constraints

- Touch only the three files named above. Nothing under `apps/storage-api`,
  `apps/api`, `packages/`, or `apps/console`.
- **Do not run `git commit`, `git push`, or open a pull request.** Leave the
  changes in the working tree.
- No AI attribution anywhere.
- Verify before you finish:
  `pnpm --filter @876/couriers typecheck`
  `pnpm --filter @876/couriers test`
  `pnpm --filter @876/couriers lint`
  All three must pass. Fix anything you break.
