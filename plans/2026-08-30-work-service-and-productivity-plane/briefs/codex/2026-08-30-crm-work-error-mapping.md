# Codex brief — CRM must stop collapsing every Work failure into one code

**Branch:** `feature/work-phase-2-productivity-plane` (checked out; do not switch).
**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`.

## Why this exists — a real incident, not a hypothetical

Console showed a user `crm/work-unavailable — "The shared Work service could not be
reached."` on every request Tasks and Reminders tab. The service was reachable and
healthy the whole time. The actual cause was that the CRM app held **no Work connection
carrying the required scopes** for that organization, and Work was correctly answering
`403 work/connection-forbidden`.

Nobody could tell, because `apps/crm-api` maps **every** Work error — 401, 403, 404,
422, a 500, and a genuine network outage alike — onto the single code
`crm/work-unavailable`, and logs nothing. Diagnosing it took a packet-level
reproduction against the Work service by hand.

That is the defect. `.claude/rules/error-handling.md` requires expected failures to
travel as values that say what happened; a bridge that flattens six distinct causes into
"could not be reached" is actively misleading, because in five of the six cases the
service *was* reached and answered clearly.

## Scope — exactly these files

```
apps/crm-api/src/modules/reminders/reminders.service.ts     7 blanket mappings
apps/crm-api/src/modules/tasks/tasks.service.ts             7
apps/crm-api/src/modules/events/events.service.ts          13
apps/crm-api/src/modules/priorities/priorities.service.ts   1
apps/crm-api/src/providers/work.ts                          the client factory
packages/core/src/lib/errors/crm.ts                         the error registry
```

Do not touch anything else. In particular do not modify `apps/work-api`,
`packages/work`, the CRM Next app, or any test outside crm-api.

## What to build

### 1. New registered CRM error codes

`packages/core/src/lib/errors/crm.ts` currently registers only `crm/work-unavailable`
(502). Keep it — it is correct for a genuine outage — and add the causes it is currently
swallowing. Follow the file's existing shape exactly (`message`, `httpStatus`, sorted
placement, user-safe wording, message ends with a period):

| Code | Meaning | Suggested status |
| --- | --- | --- |
| `crm/work-not-connected` | the org has a Work tenant but this app holds no connection, or the connection lacks the scope | 403 |
| `crm/work-workspace-missing` | the organization was never provisioned into Work at all | 404 |
| `crm/work-forbidden` | the acting user is not permitted for this Work operation | 403 |

Wording matters — these strings reach an operator in Console. "The shared Work service
could not be reached." must no longer be shown when Work answered. Say what is actually
wrong and what would fix it, in one sentence, without naming internal env vars.

If you conclude a different code set is better, use your judgement and **explain the
choice in your report** — but the non-negotiable requirement is that a
connection/scope problem is distinguishable from an outage.

### 2. One shared mapper, used everywhere

Add a single helper — `apps/crm-api/src/providers/work.ts` is the natural home, beside
`workClient()` — that takes the Work `{ data, error }` result's error and returns the
CRM error value. Something of this shape (names are yours):

```ts
export function workErrorToCrm(error: AppErrorValue | null | undefined) { … }
```

Mapping, at minimum:

- `work/connection-forbidden` → `crm/work-not-connected`
- `work/tenant-not-found` → `crm/work-workspace-missing`
- `work/session-forbidden`, `work/unauthorized`, `work/invalid-api-key` → the
  appropriate forbidden/not-connected code (decide which, and say why)
- `work/identity-unavailable`, `work/internal`, anything unrecognized, and a transport
  failure with no code at all → `crm/work-unavailable`

**Read `apps/work-api/src/http/...` and `packages/core/src/lib/errors/work.ts` for the
real Work code list before you write the mapping.** Do not guess the codes from this
brief; it may be incomplete.

Then replace all 28 blanket `getError('crm/work-unavailable')` call sites that are
mapping an upstream error with `workErrorToCrm(result.error)`.

**Careful — not every one of the 28 is an upstream error.** Some are guard clauses for
a local condition, for example the pagination-exhausted branch in
`reminders.service.ts` (`for (let page = 0; page < 20; …)` falling through) and the
`if (!lastReminder)` branch. Those are *not* Work failures — they are CRM defending
against a malformed page. Give them their own honest treatment (a distinct registered
code, or at minimum a comment explaining why `work-unavailable` is right there). Read
each site; do not blind-replace.

### 3. Log what the upstream actually said

crm-api has no logging layer at all — no request id, no request lifecycle, nothing —
which is the other half of why this was undiagnosable.

`apps/work-api/src/platform/logger.ts` and
`apps/work-api/src/http/middleware/request-context.ts` were added on this branch as a
port of the API service's pino setup. **Port the same two files into `apps/crm-api`**
(same structure, same event names, `logger: 'crm-api'`-appropriate naming), wire
`requestContext` into `apps/crm-api/src/application.ts` immediately after
`compression`, configure logging at the top of `apps/crm-api/src/server.ts`, and make
the crm-api error handler log `unhandled_error` with the real error name/message/stack
exactly as work-api's now does.

Then, in the mapper, log the upstream Work error at `warn` — its code, its message, and
the CRM code you mapped it to — so the next occurrence is one grep instead of a manual
reproduction. Never log the API key.

Add `pino` and `pino-pretty` to `apps/crm-api/package.json` at the same versions
work-api uses.

### 4. Tests

Minimum floors, and they must be able to fail:

- **12** cases over the mapper itself: every upstream code you map, an unrecognized
  code, a `null`/`undefined` error, and an error with a code but no message. Assert the
  **complete** returned error object (`code`, `message`, `httpStatus`), not just `.code`.
- **6** cases proving a service surfaces the distinguished code — e.g. reminders `list`
  returns `crm/work-not-connected` when the Work client answers
  `work/connection-forbidden`, and still returns `crm/work-unavailable` on a transport
  failure with no code. Assert the repository/Work client was called exactly once.
- **1** case asserting the pagination-exhaustion branch returns whatever you decided it
  should, so that decision is pinned.

Follow `.claude/rules/testing.md`: factories inside `it()`, exact call counts, both
sides of `{ data, error }`, no `try/catch` in a test body.

## Absolute constraints

- **Do not commit.** Leave the tree dirty; the orchestrator stages and commits.
- **Do not create, switch, rename, merge, or rebase a branch. Do not touch `main`.**
- **No `eslint-disable`. No `as any`** (`as unknown as T` only where a deliberate type
  violation is the point of a test).
- **Do not weaken a production signature to make a test compile.**
- **Do not change any existing registered error code's string, message, or status** —
  they are contracts (`.claude/rules/naming.md`). Only add.
- **Do not touch a database, run a migration, or start a service.**
- Do not reformat files you are not otherwise changing.

## Verification — foreground, and report the real final lines

```bash
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
npx prettier --write <only the files you changed>
grep -rn "eslint-disable\|as any" <only the files you changed>
```

The grep must return nothing. Check the **test count moved**, not merely that the suite
is green.

## Report

`.claude/reports/codex/2026-08-30-crm-work-error-mapping.md` (do not commit it):

- the final error-code set and **why**, especially anywhere you departed from this brief;
- the full upstream→CRM mapping table as implemented;
- how you classified each of the 28 call sites (upstream error vs local guard), and what
  you did with the local guards;
- the **counted** number of `it()` cases added per file;
- the verbatim final line of every verification command;
- anything you could not do, and why. A truthful "not done" beats a confident claim.
