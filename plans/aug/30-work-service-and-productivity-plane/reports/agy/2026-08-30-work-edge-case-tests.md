# Work Service Edge-Case Test Pass Report

## Files Created

- `packages/work/src/types.adversarial.test.ts` (22 `it()` cases)
- `apps/work-api/src/modules/tasks/tasks.service.edge.test.ts` (13 `it()` cases)
- `apps/work-api/src/modules/reminders/reminders.service.edge.test.ts` (10 `it()` cases)
- `apps/crm-api/src/modules/tasks/__tests__/tasks.work-adapter.edge.test.ts` (9 `it()` cases)

## Verification Output

### `pnpm --filter @876/work test`

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/work


 Test Files  3 passed (3)
      Tests  97 passed (97)
   Start at  03:04:36
   Duration  430ms (transform 234ms, setup 0ms, import 575ms, tests 62ms, environment 0ms)
```

### `pnpm --filter @876/work-api test`

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/work-api

 ❯ src/modules/reminders/reminders.service.edge.test.ts (10 tests | 5 failed) 31ms
       × SCHEDULED -> SENT: sentAt stamped 18ms
       × SENT -> DISMISSED: dismissedAt stamped 3ms
       × SENT -> SCHEDULED: invalid backwards move 1ms
       × DISMISSED -> SENT: invalid backwards move 1ms
       × CANCELLED -> SCHEDULED: invalid backwards move 1ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/modules/reminders/reminders.service.edge.test.ts > Reminders Service - Edge Cases > Completion stamping state machine > SCHEDULED -> SENT: sentAt stamped
AssertionError: expected "vi.fn()" to be called with arguments: [ 'rem_123', { status: 'SENT', …(1) } ]

Received:

  1st vi.fn() call:

  [
    "rem_123",
    {
-     "sentAt": 2026-01-01T12:00:00.000Z,
      "status": "SENT",
    },
  ]


Number of calls: 1

 ❯ src/modules/reminders/reminders.service.edge.test.ts:73:33
     71|       await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SE…
     72|       expect(repository.update).toHaveBeenCalledTimes(1)
     73|       expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
       |                                 ^
     74|         status: 'SENT',
     75|         sentAt: FAKE_TIME,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/modules/reminders/reminders.service.edge.test.ts > Reminders Service - Edge Cases > Completion stamping state machine > SENT -> DISMISSED: dismissedAt stamped
AssertionError: expected "vi.fn()" to be called with arguments: [ 'rem_123', …(1) ]

Received:

  1st vi.fn() call:

  [
    "rem_123",
    {
-     "dismissedAt": 2026-01-01T12:00:00.000Z,
      "status": "DISMISSED",
    },
  ]


Number of calls: 1

 ❯ src/modules/reminders/reminders.service.edge.test.ts:83:33
     81|       await remindersService.update(ORG_ID, REMINDER_ID, { status: 'DI…
     82|       expect(repository.update).toHaveBeenCalledTimes(1)
     83|       expect(repository.update).toHaveBeenCalledWith(REMINDER_ID, {
       |                                 ^
     84|         status: 'DISMISSED',
     85|         dismissedAt: FAKE_TIME,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  src/modules/reminders/reminders.service.edge.test.ts > Reminders Service - Edge Cases > Completion stamping state machine > SENT -> SCHEDULED: invalid backwards move
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times

Received:

  1st vi.fn() call:

    Array [
      "rem_123",
      Object {
        "status": "SCHEDULED",
      },
    ]


Number of calls: 1

 ❯ src/modules/reminders/reminders.service.edge.test.ts:102:37
    100|       vi.mocked(repository.retrieve).mockResolvedValue(createMockRemin…
    101|       await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SC…
    102|       expect(repository.update).not.toHaveBeenCalled()
       |                                     ^
    103|     })
    104|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  src/modules/reminders/reminders.service.edge.test.ts > Reminders Service - Edge Cases > Completion stamping state machine > DISMISSED -> SENT: invalid backwards move
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times

Received:

  1st vi.fn() call:

    Array [
      "rem_123",
      Object {
        "status": "SENT",
      },
    ]


Number of calls: 1

 ❯ src/modules/reminders/reminders.service.edge.test.ts:108:37
    106|       vi.mocked(repository.retrieve).mockResolvedValue(createMockRemin…
    107|       await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SE…
    108|       expect(repository.update).not.toHaveBeenCalled()
       |                                     ^
    109|     })
    110|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  src/modules/reminders/reminders.service.edge.test.ts > Reminders Service - Edge Cases > Completion stamping state machine > CANCELLED -> SCHEDULED: invalid backwards move
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times

Received:

  1st vi.fn() call:

    Array [
      "rem_123",
      Object {
        "status": "SCHEDULED",
      },
    ]


Number of calls: 1

 ❯ src/modules/reminders/reminders.service.edge.test.ts:114:37
    112|       vi.mocked(repository.retrieve).mockResolvedValue(createMockRemin…
    113|       await remindersService.update(ORG_ID, REMINDER_ID, { status: 'SC…
    114|       expect(repository.update).not.toHaveBeenCalled()
       |                                     ^
    115|     })
    116|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  1 failed | 4 passed (5)
      Tests  5 failed | 49 passed (54)
   Start at  03:05:00
   Duration  1.56s (transform 1.32s, setup 0ms, import 3.07s, tests 389ms, environment 1ms)
```

### `pnpm --filter @876/crm-api test`

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/crm-api


 Test Files  54 passed (54)
      Tests  679 passed (679)
   Start at  03:04:44
   Duration  7.77s (transform 2.58s, setup 0ms, import 10.73s, tests 2.01s, environment 8ms)
```

## Exposed Bugs

1. **Bug**: The Reminders service does not stamp `sentAt` when transitioning a reminder from `SCHEDULED` to `SENT`.  
   **Failing Test**: `SCHEDULED -> SENT: sentAt stamped`

2. **Bug**: The Reminders service does not stamp `dismissedAt` when transitioning a reminder from `SENT` to `DISMISSED`.  
   **Failing Test**: `SENT -> DISMISSED: dismissedAt stamped`

3. **Bug**: The Reminders service fails to prevent the invalid backwards status transition from `SENT` to `SCHEDULED`.  
   **Failing Test**: `SENT -> SCHEDULED: invalid backwards move`

4. **Bug**: The Reminders service fails to prevent the invalid backwards status transition from `DISMISSED` to `SENT`.  
   **Failing Test**: `DISMISSED -> SENT: invalid backwards move`

5. **Bug**: The Reminders service fails to prevent the invalid backwards status transition from `CANCELLED` to `SCHEDULED`.  
   **Failing Test**: `CANCELLED -> SCHEDULED: invalid backwards move`

---

## Adjudication (orchestrator, 2026-08-30)

Two of the five reported findings were real. Three were invented rules. One of the
two real ones exposed a further defect in the first attempt at the fix.

### 1 & 2 — real, and fixed

`sentAt` and `dismissedAt` were never written by anything. The pre-extraction CRM
implementation did not stamp them either (`git show 3d9e22e0:apps/crm-api/src/modules/reminders/reminders.service.ts`),
so this is not a regression — it is a latent defect carried over faithfully. It is
worth fixing here because the extraction is precisely what moved reminder lifecycle
ownership into Work, and the tasks service already stamps `completedAt`/`completedBy`
on the same principle. A reminder in `SENT` with a null `sentAt` is incoherent.

Fixed by `lifecycleStamp()` in `apps/work-api/src/modules/reminders/reminders.service.ts`.

### 3, 4 & 5 — not bugs; the tests asserted a rule that does not exist

`SENT -> SCHEDULED`, `DISMISSED -> SENT`, and `CANCELLED -> SCHEDULED` were reported
as "invalid backwards moves" that the service fails to block. No such guard was ever
specified, and the transitions are legitimate product behaviour:

- `SENT -> SCHEDULED` is **snooze**.
- `DISMISSED -> SENT` is a reminder re-firing after being dismissed.
- `CANCELLED -> SCHEDULED` is reinstating a cancelled reminder.

Blocking them would be a product regression. The three tests were rewritten to assert
the behaviour that actually matters at those transitions — what happens to the
lifecycle stamps — rather than a fictional state machine. Two further cases were added
(`SENT -> SENT` idempotence, and a title-only update leaving both stamps untouched).

### The finding inside the finding

The first `lifecycleStamp()` used a blunt rule: leaving a state clears the stamp it
set. The rewritten `SENT -> DISMISSED` test failed against it, because that rule
cleared `sentAt` when a sent reminder was dismissed — dismissing a reminder does not
undo the fact that it fired.

The corrected rule, and the one now implemented:

- `sentAt` survives dismissal and cancellation. It is cleared **only** on a return to
  `SCHEDULED`, which is a reschedule — the reminder has not yet fired _again_.
- `dismissedAt` is cleared whenever the reminder leaves `DISMISSED`.
- Re-entering a state is idempotent and never moves a stamp that is already set.

### Test-quality corrections applied

- `overrides: any` in four factories replaced with typed `Partial<T>` and explicit
  return annotations; `as any` replaced with narrow `as unknown as T`.
- Two `@ts-expect-error` directives removed — `safeParse` takes `unknown`, so they
  were unused and the typecheck failed on them.
- `expect(result).toBeDefined()` plus a truthiness guard replaced with an `expectTask`
  helper that asserts the discriminator and narrows the error union.
- Placeholder data (`'Test task'`, `'Valid title'`, `'user1'`, `'prio_1'`) replaced
  with realistic domain values per `.claude/rules/testing.md`.
- `remindAt: Date.now()` (non-deterministic, and milliseconds where the contract is
  Unix seconds) replaced with a fixed second.
- The pre-epoch flooring assertion split out of the sub-second one, so a failure
  names which rounding rule broke.
- A fabricated error message (`'No request'`) replaced with `getError('crm/request-not-found')`,
  so the assertion tracks the registry instead of a copy of it.

### Final state

```
@876/work      97 tests passed
@876/work-api  57 tests passed
@876/crm-api  679 tests passed
@876/core     940 tests passed
```
