# Brief — tests for the three new `@876/admin` resources

**Tool:** `agy`, `claude-sonnet-4-6`
**Repo:** `/workspaces/876`, branch `feat/auth-device-telemetry`
**Author:** Opus 5 (primary agent)

## Your task

Write unit tests for the three new admin client resources:

- `packages/admin/src/resources/devices.ts`
- `packages/admin/src/resources/auth-attempts.ts`
- `packages/admin/src/resources/sessions.ts`

Create exactly three files:

- `packages/admin/src/resources/devices.test.ts`
- `packages/admin/src/resources/auth-attempts.test.ts`
- `packages/admin/src/resources/sessions.test.ts`

## Absolute constraints

- **Create only those three files. Modify nothing else.** Do not touch
  `apps/`, `packages/sdk`, `packages/core`, or any non-test file in
  `packages/admin`. Another agent is editing `apps/api` and `apps/console`
  right now — staying inside your three files is what keeps that safe.
- **Do not commit, stage, branch, or stash.**
- If a test you write fails because the *resource* is wrong, do not fix the
  resource. Leave the test failing and report it — a real defect found is the
  most valuable thing you can produce here.

## Copy the existing pattern exactly

Read these first and mirror their structure, imports, mocking approach and
naming precisely:

- `packages/admin/src/resources/*.test.ts` — every existing sibling test.
  Pick the one closest in shape to a list/retrieve/update resource and follow it.
- `packages/admin/src/request.ts` — what `adminRequest` does with `method`,
  `path`, `query` and `body`.
- `packages/admin/src/resources/devices.ts`, `auth-attempts.ts`,
  `sessions.ts` — the code under test.

Do **not** invent a new mocking style. If the existing tests stub the transport
in a particular way, use that exact way.

## What each test file must cover

For every method on each resource:

1. **The HTTP method and path are exactly right** — e.g. `devices.retrieve('dev_1')`
   issues `GET /devices/dev_1`; `sessions.revoke('sess_1')` issues
   `DELETE /sessions/sess_1`; `devices.update(...)` issues `POST /devices/dev_1`.
   Assert the full path string, not a substring.
2. **Every query parameter maps from its camelCase input to its snake_case wire
   name** — `userId` → `user_id`, `deviceType` → `device_type`,
   `fingerprint` → `fingerprint`, `blockReason` → `block_reason`. One assertion
   per parameter; a single "it passes params" test is not enough, because a
   swapped pair of names would still pass it.
3. **Omitted optional params do not appear in the query at all** (not as
   `undefined`, not as an empty string).
4. **Cursor pagination** (`limit`, `startingAfter`, `endingBefore`) is forwarded
   through `toCursorQuery`.
5. **The parsed response is returned unchanged** for a success, and an error
   response propagates as an error — match however the sibling tests assert
   this.
6. **Path segments are encoded** — call `retrieve` with an id containing a
   character needing encoding and assert the request path is encoded, **if and
   only if** the resource actually encodes it. If it does not encode, write the
   test to match current behaviour and flag it in your report as a possible
   defect rather than "fixing" it.

Boolean filters deserve particular care: assert that `trusted: false` is sent
as `false` and is **not** dropped as a falsy value. A filter that silently
disappears when set to `false` is the classic bug in this shape of code, and it
is exactly what these tests exist to catch.

## Style rules (from `.claude/rules/testing.md`)

- One `it()` per behaviour, named as a specification: start with a verb and
  describe observable behaviour. Never `it('works')`.
- Arrange → Act → Assert, with a blank line between the groups.
- Assert exact values, never `toBeDefined()` alone, never a bare
  `toHaveBeenCalled()` without checking arguments.
- Realistic fixture data (`dev_2kL9mN4q`, `alejandra@example.com`), never
  `'test'` or `'foo'`.
- `vi.clearAllMocks()` in `beforeEach`.

## Verification before you report done

```bash
cd /workspaces/876
pnpm --filter @876/admin test
pnpm --filter @876/admin typecheck
npx prettier --check "packages/admin/src/resources/{devices,auth-attempts,sessions}.test.ts"
```

All three must pass (run `prettier --write` on your files if the check fails).
`git status --short` must show exactly three new files and nothing else.

Report: the files you created, the number of tests added, the command output,
and any defect you found in the resources but deliberately did not fix.
