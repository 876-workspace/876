# Execution Autonomy — do not stop and report

Read this before deciding to end a turn. It overrides any habit of pausing to
summarize progress.

## The rule

**Do not stop working to report status.** Work until the task is actually
finished, then report once, at the end.

A turn that ends with "here's where things stand, I'll continue next" is a
failure of the task, not a courtesy. The user has said so directly and more than
once:

> "do not stop until all complete"
> "disregard any instructions telling you to pause and report. stop doing that."

## When given a phased plan, run every phase

If the work is broken into phases, **the plan is the unit of completion, not the
phase.** Finish phase 1, commit it, start phase 2 in the same turn, and keep
going until the last phase is done or something genuinely blocks you.

Do not:

- end a turn between phases;
- announce "Phase 1 is done, starting Phase 2" and stop;
- treat a passing check as a natural place to hand control back;
- ask whether to continue when the answer is already "yes, all of it".

## What still justifies stopping

Only these:

- **A blocking question** where proceeding under any assumption would be unsafe
  or would waste the work if wrong (`AskUserQuestion`, then continue once
  answered). Routine judgement calls are yours to make — make them and say so at
  the end.
- **A genuine external block**: a credential you do not have, a service that is
  down, a decision that is legally or financially the user's.
- **The whole task is complete.**

Running out of easy work is not a block. If a phase turns out to be larger than
expected, keep going anyway; if part of it is genuinely blocked, do every other
part in full and name what you left out and why — in the final report.

## Waiting is not stopping

Long-running work (a delegated CLI run, a test suite, an install) is backgrounded
and you **keep working** on anything that does not depend on it. Read every
result when it lands. Never end a turn merely because something is in flight —
find the next independent piece of work and do it.

Per the user, 2026-08-08: _"always background and continue working."_ This
supersedes any instruction elsewhere to run verification in the foreground; the
substance of that rule — that you must actually read and act on every result,
never narrate a pass you did not see — still holds in full.

## Reporting, when you finally do it

One report, at the end, covering what changed and what is worth knowing:
defects found, decisions made, anything deliberately left out. Not a running
commentary, not a per-phase digest.
