# Codex brief — Push local user name edits back to WorkOS (@876/api)

## Context & why

WorkOS is the identity source of record; users are created in WorkOS and synced into
the core identity DB. But `updateUser` (`apps/api/src/modules/users/users.controller.ts`,
handler starts at line ~347) only updates the **local** row — it never pushes the change
to WorkOS. So an admin who edits a user's first/last name locally sees it silently
reverted the next time WorkOS is the source of a sync. This closes the outbound half:
after a successful local update, best-effort push the changed name to WorkOS.

**Design is already decided below — implement it exactly, do not re-derive.** Follow
`.agents/rules/git.md` (no AI attribution), `.claude/rules/express-api.md`, and
`.claude/rules/code-style.md`. DO NOT COMMIT — the orchestrator commits.

### The decided semantics (do not change these)

- **Push `firstName` / `lastName` only.** Do NOT push `email` — a WorkOS email change
  carries verification semantics and is a separate flow (leave a one-line `// Follow-up:`
  comment noting email push is deferred). Do NOT push username, status, avatar, etc.
- **Only push when a name field was actually part of this update** (`updateData.firstName`
  or `updateData.lastName` was set) AND the local save succeeded AND the user has a
  `workosUserId`. If neither name field changed, do nothing — no WorkOS call.
- **Best-effort, never fails the request.** Mirror the existing best-effort WorkOS call in
  this same file (the `sendRecovery` try/catch around line ~298: `catch (error) { log(...) }`).
  A WorkOS outage must not fail the update — the response already reflects local truth, and
  inbound WorkOS webhooks (a separate change) provide eventual reconciliation. Log a warning
  with `{ err, user_id, workos_user_id }` on failure; never rethrow.
- **Send only the fields that changed** to WorkOS (if only lastName changed, send only
  lastName), so a partial edit never clobbers the other WorkOS field.

## File scope (only these)

- `apps/api/src/providers/workos/client.ts`
- `apps/api/src/providers/workos/adapter.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/providers/workos/__tests__/` OR the existing adapter/client test location
  (find where `adapter.ts` / `client.ts` are tested and add cases there; if none exists,
  add `apps/api/src/providers/workos/adapter.test.ts` colocated)
- `apps/api/src/modules/users/__tests__/users-update.test.ts` (find the existing update
  test file for `updateUser`; if none, add one colocated in the module's `__tests__/`)

Do NOT touch config, routes, or any other module.

---

## Part 1 — WorkOS client (`client.ts`)

The client has private `send`, `post` (line ~150), `get`, `del` — but no `put`. WorkOS
updates a user with **PUT `/user_management/users/:id`**. Add a private `put` helper
mirroring `post` exactly (same signature/return, method `'PUT'`), then a public
`updateUser`:

```ts
private put(path: string, body: Payload): Promise<Record<string, unknown>> {
  // mirror `post` verbatim, method 'PUT'
}

updateUser(
  userId: string,
  params: { firstName?: string | null; lastName?: string | null }
): Promise<Record<string, unknown>> {
  // WorkOS User Management expects snake_case body keys.
  const body: Payload = {}
  if (params.firstName !== undefined) body.first_name = params.firstName
  if (params.lastName !== undefined) body.last_name = params.lastName
  return this.put(`/user_management/users/${userId}`, body)
}
```

Match the exact `Payload` type and `post`'s body-serialization style used in this file
(look at how `createUser` builds and passes its body). If `post` maps camelCase→snake_case
itself, follow the same convention rather than double-mapping.

## Part 2 — adapter (`adapter.ts`, class `WorkOsAuthProvider`)

Add an `updateUser` method mirroring `register`/`deleteUser` (same try/catch via
`this.rethrow(error)` on failure, returns `toProviderUser(...)`):

```ts
async updateUser(
  userId: string,
  params: { firstName?: string | null; lastName?: string | null }
): Promise<ProviderUser> {
  try {
    return toProviderUser(await this.client.updateUser(userId, params))
  } catch (error) {
    this.rethrow(error)
  }
}
```

There is no separate `AuthProvider` interface (the adapter is a plain class), so no
interface to update — but grep to confirm nothing else declares the provider's method set.

## Part 3 — wire the push in `updateUser` (`users.controller.ts`)

After the local save block (the `if (Object.keys(updateData).length > 0) { ... }` that sets
`updated`), and before `res.json(...)`, add the best-effort push. `getAuthProvider` is
already imported; `settings` is available the same way the createUser handler obtains it
(`getAuthProvider(settings)` — resolve `settings` exactly as createUser does in this file).

```ts
// Push name edits back to WorkOS (source of record) so a later sync does not revert
// them. Best-effort: a WorkOS hiccup must not fail an update the DB already applied;
// inbound WorkOS webhooks reconcile eventually.
// Follow-up: email changes are deferred — they carry WorkOS verification semantics.
const namePushed =
  updateData.firstName !== undefined || updateData.lastName !== undefined
if (namePushed && updated.workosUserId) {
  try {
    const authProvider = getAuthProvider(settings)
    await authProvider.updateUser(updated.workosUserId, {
      ...(updateData.firstName !== undefined
        ? { firstName: updateData.firstName as string | null }
        : {}),
      ...(updateData.lastName !== undefined
        ? { lastName: updateData.lastName as string | null }
        : {}),
    })
  } catch (error) {
    log.warn(
      { err: error, user_id, workos_user_id: updated.workosUserId },
      'users.workos_profile_push_failed'
    )
  }
}
```

Confirm the logger binding name in this file (it may be `log` or `logger`) and use it.
Confirm `updated.workosUserId` is the field name on the row (it is —
`users.repository.ts` selects `workosUserId`). Use the same `settings` resolution the
createUser handler uses; do not invent a new import.

---

## Part 4 — tests

**Adapter/client test** — assert `adapter.updateUser('user_x', { firstName: 'A', lastName: 'B' })`
calls the client's `updateUser` with those args and returns the mapped `ProviderUser`;
and that a client throw is rethrown as the normalized error (mirror the existing
`register`/`deleteUser` tests' harness in the same file).

**Controller test** (`updateUser`) — mirror the existing update test harness. Cover:

- Updating `first_name` pushes to WorkOS: `authProvider.updateUser` called once with
  `{ firstName: '<new>' }` (lastName NOT included when unchanged) and the correct
  `workosUserId`; response is the serialized updated user.
- Updating only `last_name` pushes only `{ lastName }`.
- Updating a NON-name field (e.g. `status`) does **NOT** call `authProvider.updateUser`
  (`.not.toHaveBeenCalled()`).
- A WorkOS push failure (mock `updateUser` rejects) still returns 200 with the updated
  user and does not throw — assert the response, and that the local save still happened.
- A user with no `workosUserId` is not pushed (`.not.toHaveBeenCalled()`).

Follow `.claude/rules/testing.md`: exact call args, both-sides result assertions, no weak
`toBeDefined()`-only checks. Mock the auth provider (`getAuthProvider`) rather than hitting
WorkOS.

---

## Verify (run all, must pass)

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
```

The @876/api suite emits ~5 Prisma-Accelerate "fetch failed: bad port" unhandled
rejections in the sandbox (no DB) — environmental, not test failures.

Do NOT commit. Report exactly which files you changed and any deviations from this brief.
