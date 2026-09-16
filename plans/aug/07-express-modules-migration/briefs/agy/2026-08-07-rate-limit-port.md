# Brief — port fixed-window auth rate limiting to TypeScript

**Tool:** `agy --model=claude-sonnet-4-6` (no `--effort` flag — it is rejected
for this model and kills the run).

**Scope:** exactly one unit. Do not start anything else.

## Working directory

`/workspaces/876/apps/api`

## The single task

Port `core/rate_limit.py` (87 lines) to `src/platform/rate-limit.ts`, and write
its test suite at `src/platform/__tests__/rate-limit.test.ts`.

**Create exactly these two files. Create or modify nothing else.**

**Files you must NOT touch** (another agent owns them):

- `src/platform/risk.ts` and `src/platform/__tests__/risk.test.ts`
- `src/platform/pin.ts`, `src/platform/session.ts`, `src/platform/permissions.ts`
- anything under `src/providers/`, `src/modules/`, `src/http/`, `src/config/`
- any `.py` file
- `package.json`, `pnpm-lock.yaml` — **install nothing.** Use `node:crypto`.

## Read these first

- `apps/api/core/rate_limit.py` — the source of truth. Its module docstring
  explains _why_ limits are keyed on the credential target rather than the
  client IP (all browser traffic arrives via each app's server-side auth bridge,
  so the API sees the Next.js server's IP and a per-IP limit would throttle
  every user at once). **Carry that reasoning into the TypeScript file-level
  JSDoc** — it is the decision most likely to be "corrected" by someone later.
- `apps/api/src/platform/secure-field.ts` — the worked example of a ported
  platform module that uses `node:crypto`. Match its style.

## Required imports and shapes

```ts
import { createHash } from 'node:crypto'

import { AppHttpError } from '@/http/errors' // new AppHttpError({ code, message, httpStatus })
import { getLogger } from '@/platform/logger' // getLogger('rate-limit')
```

The pino call form is `log.warn({ field: value }, 'event.name')` — **object
first, message second**.

## Translation rules

| Python                                     | TypeScript                                               |
| ------------------------------------------ | -------------------------------------------------------- |
| `dict[tuple[str, str], tuple[int, int]]`   | `Map<string, { startedAt: number; count: number }>`      |
| `hashlib.sha256(key.encode()).hexdigest()` | `createHash('sha256').update(key, 'utf8').digest('hex')` |
| `int(time.time())`                         | `Math.floor(Date.now() / 1000)`                          |
| `status.HTTP_429_TOO_MANY_REQUESTS`        | `429`                                                    |
| module-level `_windows`                    | a module-level `const windows = new Map(...)`            |

Because the Map key must be a single string, compose it as
`` `${scope}�${hashedKey}` `` — a NUL cannot appear in a scope name or a
hex digest, so no two distinct buckets can collide on one key.

Export exactly three things:

1. `enforceRateLimit(scope: string, key: string, opts: { maxAttempts: number; windowSeconds: number }): void`
2. `resetRateLimits(): void` — clears all window state (test isolation only)
3. `MAX_RATE_LIMIT_ENTRIES` — the `10_000` prune ceiling

## Behaviour that must be preserved exactly

1. **The raw key is hashed before storage.** Raw identifiers, emails, and reset
   tokens must never sit in process memory longer than the call. Do not keep the
   plaintext in the Map, in a log field, or in the error.
2. **Fixed window, not sliding.** A window whose age has reached
   `windowSeconds` resets to a fresh window with count 1.
3. **The attempt is counted first, then compared.** Attempt number
   `maxAttempts` is allowed; attempt `maxAttempts + 1` throws.
4. **Over the limit throws** `AppHttpError` with, exactly:
   - `code: 'auth/rate-limited'`
   - `message: 'Too many attempts. Please wait a moment and try again.'`
   - `httpStatus: 429`

   These strings are a contract — clients branch on the code. Character for
   character.

5. **Every rejection logs** `'auth.rate_limited'` at `warn` with the fields
   `scope`, `key_fp` (the **first 12 characters of the hex digest** — a
   non-reversible fingerprint), `attempts`, and `window_seconds`. Note those
   four log field names stay `snake_case`. **Never log the raw key.**
6. **Pruning**: once the Map holds more than `MAX_RATE_LIMIT_ENTRIES` entries,
   drop every window whose age is `>= 3600` seconds, so a scan across many
   distinct keys cannot grow memory without bound. Prune _after_ recording the
   attempt and _before_ the limit check, exactly as the Python does.
7. **Different scopes are independent.** The same key under `'login'` and under
   `'otp'` must not share a counter.

## Test requirements

Follow `.claude/rules/testing.md`. Concretely:

- `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`.
- Call `resetRateLimits()` in `beforeEach` — the module state is global and a
  leaked counter makes a later test fail for the wrong reason.
- **Use fake timers** (`vi.useFakeTimers()` / `vi.setSystemTime()`) to move
  through a window. Never `setTimeout`, never a real sleep. Restore with
  `vi.useRealTimers()` in `afterEach`.

Cover at least:

- Attempts 1..`maxAttempts` do not throw; attempt `maxAttempts + 1` throws with
  the exact code, message, and `httpStatus`.
- A separate `key` in the same scope has its own counter.
- A separate `scope` with the same key has its own counter.
- Advancing the clock by `windowSeconds` resets the counter, and the next
  attempt succeeds.
- Advancing by `windowSeconds - 1` does **not** reset it.
- The raw key never appears in the thrown error: assert
  `JSON.stringify(error.toClientError())` does not contain it.
- The logged `key_fp` is 12 characters and is not the raw key — spy with
  `vi.spyOn` on the logger, or assert the fingerprint indirectly.
- Exceeding `MAX_RATE_LIMIT_ENTRIES` distinct keys prunes stale windows: insert
  the ceiling plus one, advance the clock past 3600s, add one more, and assert
  the process does not retain the expired ones (expose nothing new for this —
  assert it behaviourally, e.g. an old key's counter has been forgotten).

## Verification — run all four, in the foreground, before reporting done

```bash
cd /workspaces/876/apps/api
pnpm node:typecheck
pnpm node:lint
pnpm node:test -- src/platform/__tests__/rate-limit.test.ts
npx prettier --check "src/platform/rate-limit.ts" "src/platform/__tests__/rate-limit.test.ts"
```

If prettier complains, run `npx prettier --write` on those two paths and
re-check. **Do not commit anything** — the orchestrating agent commits.

## Report back

State: the two files with line counts, the output of each verification command,
and anything in the Python source you could not translate faithfully and why.
