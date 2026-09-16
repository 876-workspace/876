# Orchestrator review — phase 2 (issues, labels, comments)

**Date:** 2026-09-03. Delegated to `agy` on `gemini-3.8-flash-high`, verified in
the foreground, not accepted on its report.

## Verification actually run

| Command | Result |
| --- | --- |
| `pnpm --filter @876/projects-api typecheck` | pass |
| `pnpm --filter @876/projects-api lint` | pass, no disables |
| `pnpm --filter @876/projects-api test` | pass — 5 files, **83** tests |
| escape-hatch grep | clean |
| files touched outside `apps/projects-api/` | none |

Test count moved 34 → 83; the brief's floor for this phase was 34 new cases.

## The defect that mattered

`getProjectForUpdate` allocated the issue number by reading the project row and
then incrementing it. Three compounding problems, none of which the test suite
could see because the repository is mocked:

1. The read went through `$queryRaw` with `SELECT *`, which returns **physical**
   column names. `nextIssueNumber` is `@map("next_issue_number")`, so the field
   the service read was `undefined` and every identifier on that path would have
   been `CONSOLE-undefined`, failing the `NOT NULL` on insert.
2. The raw query was wrapped in a bare `catch {}` that silently fell back to an
   **unlocked** `findUnique` — discarding the `FOR UPDATE` that was the entire
   point, so any transient error would have turned a locked allocation into a
   race between concurrent creates.
3. It carried an `as unknown as ProjectRow | null` cast that hid (1) from the
   type checker.

Fixed by deleting both methods and replacing them with a single
`allocateIssueNumber`, where the atomic `UPDATE … increment` **is** the
allocation and returns the post-increment value with the project key. That
removes the raw SQL, the swallowed error, the unlocked fallback and the cast at
once, and it is correct under concurrency without an explicit lock.

A regression anchor was added — *"takes the issue number from the allocation,
never from a project row read outside the transaction"* — which fails against
the previous implementation.

Also removed the import this refactor orphaned (`ProjectRow`, a lint warning).

## Accepted as written

- Every object discriminator is kebab-case, including `projects.issue-event` —
  agy followed the brief correction made earlier in the run.
- Create and update each run in one transaction, with the event trail written
  inside it; no events are written when nothing changed.
- Comments are transitively tenant-scoped: every operation resolves the issue
  through the tenant-scoped issue lookup first, and a create against an unknown
  issue never reaches the comment repository.
- Soft-deleted issues and comments are excluded from lists by default.
- Errors are values; the only `throw` in the service layer is still phase 1's
  rethrow of an unexpected driver error after handling the `P2002` create race.

## Known deviation, not fixed in this phase

**Cross-module imports reach into other modules' repositories.** Thirteen sites
across five modules import `../<other>/<other>.repository.js`.
`.claude/rules/express-api.md` requires cross-module calls to go through the
module's public `index.ts`, and `apps/crm-api` — the reference implementation —
crosses modules through the other module's **service**, never its repository. A
repository is the module's data layer, so this is the real violation rather than
a stylistic one.

It was **not** fixed here on purpose. The pattern originates in phase 1, spans
every module, and the services return `{ data, error }` envelopes while the
repositories return rows, so the migration is not mechanical. A partial
migration — some modules through services, some through repositories — is worse
than a consistent one, which is the same reasoning `error-handling.md` applies
to its own throw/value migration.

**Remediation, as one scoped pass before the run merges:** give the `tenants`
module a public row-returning `resolveTenant(organizationId)` on its service,
export it from `index.ts`, and route the four `tenantsRepository` importers
through it; then do the same for the `issues` → `projects`/`labels` and
`comments` → `issues` edges. Type-only imports of another module's serializer
types are fine and are not part of this.
