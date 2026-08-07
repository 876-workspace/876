# Brief — port authentication risk scoring to TypeScript

**Tool:** `agy --model=claude-sonnet-4-6` (no `--effort` flag — it is rejected
for this model and kills the run).

**Scope:** exactly one unit. Do not start anything else.

## Working directory

`/workspaces/876/apps/api`

## The single task

Port `core/risk.py` (148 lines) to `src/platform/risk.ts`, and write its test
suite at `src/platform/__tests__/risk.test.ts`.

This module is **pure, deterministic, and synchronous — no I/O of any kind.**
If you find yourself importing a database client, a logger, or `fetch`, you have
misread the task.

**Create exactly these two files. Create or modify nothing else.**

**Files you must NOT touch** (another agent owns them):

- `src/platform/pin.ts`, `src/platform/session.ts`, `src/platform/permissions.ts`
- `src/platform/rate-limit.ts` and `src/platform/__tests__/rate-limit.test.ts`
- anything under `src/providers/`, `src/modules/`, `src/http/`, `src/config/`
- any `.py` file
- `package.json`, `pnpm-lock.yaml` — **install nothing.** Use `Math` only.

## Read these first

- `apps/api/core/risk.py` — the source of truth. Port every comment's *intent*;
  the docstrings explain decisions worth keeping.
- `apps/api/src/platform/user-agent.ts` — the worked example of a ported pure
  platform module in this codebase. Match its style: file-level JSDoc, named
  exports, `readonly` interface fields, `const` lookup tables.

## Translation rules

| Python                          | TypeScript                                      |
| ------------------------------- | ----------------------------------------------- |
| `@dataclass(frozen=True)`       | `interface` with `readonly` fields              |
| dataclass field defaults        | an exported `DEFAULT_RISK_INPUT` const, spread  |
| `snake_case` fields             | `camelCase` fields                              |
| `math.inf`                      | `Number.POSITIVE_INFINITY`                      |
| `math.radians(x)`               | `(x * Math.PI) / 180`                           |
| `float \| None`                 | `number \| null`                                |
| `int \| None`                   | `number \| null`                                |
| `list[str]`                     | `string[]`                                      |

**The reason strings are a contract** — they are written to `auth_attempts` and
rendered in Console. Reproduce them character for character, in this exact
order: `new_device`, `new_country`, `bot_user_agent`, `untrusted_context`,
`identifier_failure_burst`, `ip_failure_burst`, `shared_device`,
`impossible_travel`. Every points constant and threshold keeps its exact value
and its exported name (`NEW_DEVICE_POINTS`, `IMPOSSIBLE_TRAVEL_KMH`, …).

Export: `MAX_SCORE`, every `*_POINTS` and `*_THRESHOLD` constant,
`EARTH_RADIUS_KM`, `RiskInput`, `RiskAssessment`, `DEFAULT_RISK_INPUT`,
`haversineKm`, `distanceBetween`, `impliedSpeedKmh`, `assessRisk`, `shouldBlock`.

`assessRisk` should take `RiskInput` where every field is optional, and apply
the defaults internally — a caller supplying only `{ isBot: true }` must score
exactly 30.

## The expected values — these came from running the Python

Your test suite must assert **all** of these. They were produced by executing
`core/risk.py`; they are the oracle, not a guess. If your port disagrees with
any row, your port is wrong.

### `assessRisk`

| Input                                                             | score | reasons                          |
| ----------------------------------------------------------------- | ----- | -------------------------------- |
| all defaults                                                      | 0     | `[]`                             |
| `isNewDevice: true`                                               | 15    | `['new_device']`                 |
| `isNewDevice: true, isNewCountryForUser: true`                    | 35    | `['new_device','new_country']`   |
| `isBot: true`                                                     | 30    | `['bot_user_agent']`             |
| `contextTrusted: false`                                           | 10    | `['untrusted_context']`          |
| `recentFailuresForIdentifier: 3`                                  | 20    | `['identifier_failure_burst']`   |
| `recentFailuresForIdentifier: 2`                                  | 0     | `[]`                             |
| `recentFailuresForIp: 10`                                         | 25    | `['ip_failure_burst']`           |
| `distinctUsersOnDevice: 3`                                        | 25    | `['shared_device']`              |
| `kmFromLastAttempt: 5000, minutesSinceLastAttemptElsewhere: 60`   | 35    | `['impossible_travel']`          |
| `kmFromLastAttempt: 5000, minutesSinceLastAttemptElsewhere: 0`    | 35    | `['impossible_travel']`          |
| `kmFromLastAttempt: 100, minutesSinceLastAttemptElsewhere: 60`    | 0     | `[]`                             |

Every signal at once (`isNewDevice`, `isNewCountryForUser`, `isBot` true,
`contextTrusted` false, `recentFailuresForIdentifier: 99`,
`recentFailuresForIp: 99`, `distinctUsersOnDevice: 99`,
`minutesSinceLastAttemptElsewhere: 0`, `kmFromLastAttempt: 20000`) scores
**exactly 100** — clamped, not 180 — with all eight reasons in the order above.

### `haversineKm` / `distanceBetween`

- `haversineKm(18.0179, -76.8099, 51.4700, -0.4543)` → `7512.37168` (assert with
  `toBeCloseTo(7512.37168, 4)`; Kingston → Heathrow).
- `distanceBetween('18.0179','-76.8099','51.4700','-0.4543')` → the same value.
- `distanceBetween('18.0', null, '51.4', '-0.45')` → `null`.
- `distanceBetween('abc','-76.8','51.4','-0.45')` → `null` — **a malformed
  coordinate must never throw**; a junk geo lookup may not fail a login.
- An empty string in any position → `null`.

### `impliedSpeedKmh(km, minutes)`

| km     | minutes | result     |
| ------ | ------- | ---------- |
| `null` | 5       | `null`     |
| 100    | `null`  | `null`     |
| 0      | 5       | `null`     |
| -5     | 5       | `null`     |
| 100    | 0       | `Infinity` |
| 100    | -1      | `Infinity` |
| 100    | 60      | `100`      |

Zero elapsed minutes with real distance is **infinite speed, not a division
error** — two attempts from different continents in the same minute is the
clearest possible signal.

### `shouldBlock(score, threshold)`

`(0,0)→false`, `(100,0)→false`, `(50,60)→false`, `(60,60)→true`,
`(61,60)→true`, `(100,-1)→false`.

A threshold of `0` — the default and the only supported production value today
— **never blocks, whatever the score.** Write a test that says so, and keep the
docstring's reasoning as a comment.

## Test requirements

Follow `.claude/rules/testing.md`. Concretely:

- `import { describe, expect, it } from 'vitest'` — this project does not use
  globals in new test files.
- One `it()` per row above. Declarative names ("scores a new device at 15",
  not "works").
- Assert the **whole** `RiskAssessment` (`{ score, reasons }`) with `toEqual`,
  never just the score.
- Use `it.each` for the tabular cases.

## Verification — run all four, in the foreground, before reporting done

```bash
cd /workspaces/876/apps/api
pnpm node:typecheck
pnpm node:lint
pnpm node:test -- src/platform/__tests__/risk.test.ts
npx prettier --check "src/platform/risk.ts" "src/platform/__tests__/risk.test.ts"
```

If prettier complains, run `npx prettier --write` on those two paths and
re-check. **Do not commit anything** — the orchestrating agent commits.

## Report back

State: the two files with line counts, the output of each verification command,
and any row above your port could not reproduce.
