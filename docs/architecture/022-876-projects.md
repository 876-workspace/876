# 022 — 876 Projects

**Status:** implemented on `feat/876-projects`, 2026-09-03.

876 Projects is a Linear-style tracker: an organization plans work as
**projects**, tracks it as **issues**, and organizes it with **labels**. It runs
as a standalone app on port 3008 and is administered from Console, both over the
same data service on port 4030.

## Placement

Projects is a bounded context with its own datastore, not part of the identity
core. It stores the 876 organization it belongs to as an opaque `organization_id`
with **no cross-database foreign key**, and resolves names, members and
entitlements through the Workspace and Platform clients.

| Concern                                      | Owner                                |
| -------------------------------------------- | ------------------------------------ |
| who the organization and its members are     | `apps/api` (identity core)           |
| whether the org may open 876 Projects        | `subscriptions` in the identity core |
| projects, issues, labels, comments, events   | `apps/projects-api`                  |
| the operator view of another org's workspace | `apps/console`                       |

## The issue key lives on the project

Linear hangs the issue prefix and counter off a **team**. 876 Projects hangs
them off the **project** (`projects_projects.key`, `next_issue_number`), so an
identifier reads `CONSOLE-12` and a project is the only thing that has to exist
before an issue can.

Two consequences follow, and both are deliberate:

- **Every issue belongs to a project.** A per-tenant **Triage** project (key
  `TRI`) is created with the tenant and absorbs work that arrives without one, so
  "file it now, sort it later" never needs a null project.
- **An issue keeps its identifier when it moves.** `CONSOLE-12` stays
  `CONSOLE-12` in another project. The identifier is a name people paste into
  chat and commit messages; renumbering on a move would break every reference to
  it, so `identifier` is written once at creation and never recomputed.

## Allocating an issue number

The number comes from a single atomic increment that returns the post-increment
value, inside the transaction that creates the issue:

```ts
const updated = await tx.project.update({
  where: { id: projectId },
  data: { nextIssueNumber: { increment: 1 } },
  select: { id: true, key: true, nextIssueNumber: true },
})
// the allocated number is the value the row held before this update
return {
  projectId: updated.id,
  key: updated.key,
  number: updated.nextIssueNumber - 1,
}
```

`UPDATE … RETURNING` takes the row lock and hands back the new value in one
statement, so two concurrent creates in the same project can never be given the
same number.

**Reading the counter and then incrementing it is a race**, and it is a race that
the unit tests cannot see because they mock the repository. An earlier
implementation did exactly that, additionally through a raw `SELECT *` — which
returns physical column names, so the `@map`ped `next_issue_number` never
deserialized to `nextIssueNumber` and every identifier on that path would have
been `KEY-undefined`. It was caught by creating ten issues concurrently against a
real database. Keep the allocation as the increment.

## Storage conventions

| Convention                                                                        | Reason                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| timestamps are `BigInt` Unix seconds in the database, `number` in JSON            | the platform contract; `DateTime` appears nowhere              |
| enum-like columns are `TEXT` + a `CHECK` constraint                               | a new status is a migration, not a lock-taking type alteration |
| physical columns stay `snake_case`, application fields are `camelCase` via `@map` | the database boundary rule in `naming.md`                      |
| object discriminators are namespaced kebab-case (`projects.project-member`)       | new multiword 876-owned symbolic values are kebab-case         |

## Errors are values

Services return `{ data, error }` from day one; the only `throw` on a service
path is a rethrow of an unexpected driver error after a `P2002` create race is
handled. This service therefore never needs the throw-to-value migration the
older services still carry.

## Caller tiers

A capability is implemented once by `apps/projects-api` and routed at more than
one principal rather than reimplemented.

| Caller                                            | Entrypoint               | Credential                                               |
| ------------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| Console, administering any organization           | `@876/projects/operator` | internal key, server-only                                |
| the standalone app, acting for a signed-in member | `@876/projects/service`  | internal key, server-only, org resolved from the session |

The app uses the **service** tier rather than `session` because the data service
currently exposes only internal-key routes. The app resolves the organization
from the sealed session itself and scopes every call by it — the same shape as
`apps/crm`. Adding a session tier later is a routing and guard change in the
owning service, not a second implementation.

## Module boundaries

Modules live at `src/modules/<name>/` and cross only through each other's public
`index.ts`. A module owns its own tables, so nothing outside its directory may
import its `*.repository.ts`, and `src/modules/__tests__/module-boundaries.test.ts`
fails if that import returns.
