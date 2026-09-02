# RESUME — service workspaces, Console `/requests`, CRM access control

This supersedes nothing. Read
`.claude/briefs/codex/2026-08-29-service-workspaces-crm-access.md` **in full
first** — it is still the specification. This file records what changed since
your previous run and corrects two things that went wrong.

## What happened on the previous run

You stopped after Phase 1 because a second Codex process was editing the same
worktree, and you asked for a single writer before committing. **That was the
right call** and the concurrency is now resolved — you are the only writer.

Two corrections:

1. **You made zero commits.** The brief asked for an atomic commit after each
   phase and you preserved everything uncommitted instead. That is fragile: an
   interrupted run loses the work. This time, **commit after every phase**, even
   if a later phase is unfinished. A phase that is committed and green is worth
   more than five phases in the working tree.
2. **The other agent's tests are not noise to be cleaned up — they are part of
   the deliverable.** See below.

## The other agent's tests are protected work

A second agent was deliberately tasked by the user with adding test coverage,
and the user has explicitly instructed: **keep them.** These files are now on
the branch:

```
apps/console/src/lib/auth/access-context.advanced.test.ts
apps/console/src/lib/auth/access-context.comprehensive.test.ts
apps/console/src/lib/auth/access-context.legacy-attack.test.ts
apps/console/src/lib/auth/access-context.weird.test.ts
apps/console/src/lib/auth/guards.comprehensive.test.ts
apps/console/src/lib/auth/route-permissions.comprehensive.test.ts
apps/console/src/lib/permissions.comprehensive.test.ts
apps/console/src/lib/service/team/validation.extra.test.ts
packages/core/src/access/catalogs.legacy-comprehensive.test.ts
packages/core/src/access/catalogs.massive.test.ts
packages/core/src/access/context.massive.test.ts
packages/core/src/access/context.security.test.ts
packages/core/src/access/fuzz.legacy.test.ts
packages/core/src/access/index.security.test.ts
packages/core/src/access/navigation.massive.test.ts
packages/core/src/access/navigation.security.test.ts
packages/crm/src/workspace.comprehensive.test.ts
```

Plus modifications to `access-context.test.ts`, `catalogs.test.ts`,
`request-paths.test.ts`, and `tenant-state.test.ts`.

Rules for them:

- **Do not delete any of these files. Do not revert them. Do not fold them into
  your own test files and remove the originals.**
- You reported that some of them break Core typecheck and contain weak
  assertions. **Fix them in place — do not remove them.** A `toBeDefined()`
  that should be a full shape assertion gets strengthened; a type error gets
  the correct type (`as unknown as T`, never `as any`); an import of something
  that does not exist gets pointed at the real export. If a test asserts
  behaviour that contradicts the specification in the main brief, change the
  **assertion** to match the spec and say so in your report — do not delete the
  case.
- If one is genuinely unsalvageable (asserts something the architecture forbids,
  and cannot be rewritten to assert the correct thing), you may remove that
  single `it()` case — never the file — and you must list it in the report with
  the reason. This is an exception to be used once or twice, not a licence.
- **Commit them first, before your own Phase 1 work**, in their own commit, so
  they are safe in history no matter what happens to the rest of the run:
  `test(access): add access-control coverage`. Fix typecheck/lint in that same
  commit so the tree is green from the start.
- These count toward nothing in your own per-phase test floors. Your floors are
  additional.

## Order of work

0. Commit the other agent's tests (fixed to green), as above.
1. Reconcile and commit your Phase 1 work — the `console:requests` rename
   sweep, the `LEGACY_PERMISSION_ALIASES` one-way read alias, and the ADR
   correction. Several of the protected tests already exercise the legacy alias
   (`catalogs.legacy-comprehensive`, `access-context.legacy-attack`,
   `fuzz.legacy`), so make your implementation satisfy **their** expectations
   where those expectations are correct, rather than rewriting them to match a
   different design.
2. Phases 2 → 5 exactly as the main brief specifies, committing each.
3. Phase 6 report at
   `.claude/reports/codex/2026-08-29-service-workspaces-crm-access.md`, with the
   per-phase counted `it()` totals, and a separate section listing every
   protected test file you touched and what you changed in it.

## Unchanged from the main brief

No AI attribution in commits. No branches, PRs, merges, or rebases. No
`eslint-disable`, no `as any`. Do not weaken production code for testability.
Migrations may be written, validated, diffed, and the client regenerated — never
applied to a remote database. Run the verification commands in the foreground at
the end of every phase and fix what breaks before moving on. Do not report a
check you did not run.
