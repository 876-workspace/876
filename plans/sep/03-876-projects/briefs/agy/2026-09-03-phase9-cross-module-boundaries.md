# Brief — Phase 9: fix cross-module boundaries in `apps/projects-api`

You are fixing a recorded architectural deviation. Read
`plans/2026-09-03-876-projects/reports/orchestrator/2026-09-03-phase2-review.md`
→ "Known deviation" first; it states the problem and the intended remedy.

**Repository root:** `/root/projects/876`
**Branch:** `feat/876-projects` (already checked out — do NOT create, switch, or
merge any branch, and do NOT commit. The orchestrator commits.)

**Scope: `apps/projects-api/src/modules/**` only.** Other agents are working in
`apps/projects` and `apps/projects-mcp` right now. Touch nothing outside
`apps/projects-api`.

---

## 1. The problem

Sibling modules import each other's **repositories**:

```
issues.service.ts    → ../projects/projects.repository.js
issues.service.ts    → ../labels/labels.repository.js
comments.service.ts  → ../issues/issues.repository.js
issues.repository.ts → ../labels/labels.serializers.js   (serializeLabel, a value)
```

`.claude/rules/express-api.md` is explicit: *cross-module calls use public
`index.ts` exports*, and *only a module's own `*.repository.ts` may query its
tables*. A repository is the module's data layer, so reaching into it from
another module is the real violation — not a stylistic one.

`apps/crm-api`, the reference implementation, crosses modules through the other
module's **service**, never its repository. The `tenants` edge in this service
has already been fixed that way: `tenants.service.ts` exports `resolveTenant`,
and the four sibling services call `tenants.resolveTenant(...)` through
`../tenants/index.js`. **Copy that pattern exactly for the remaining edges.**

---

## 2. What to do

For each edge below, add a narrow, purpose-named function to the **owning**
module's service, export it from that module's `index.ts`, and change the caller
to import from `../<owner>/index.js`.

| Caller | Currently reaches | Add to the owner's service |
| --- | --- | --- |
| `issues.service.ts` | `projects.repository` (`retrieve`, `retrieveByKey`) | a resolver that takes a tenant id and a project id-or-key and returns the project row |
| `issues.service.ts` | `labels.repository` (`retrieve`, `retrieveByName`, `create`) | a resolver that takes a tenant id and a label id-or-name and returns or creates the label row |
| `comments.service.ts` | `issues.repository` (`retrieve`, `retrieveByIdentifier`) | a resolver that takes a tenant id and an issue ref (id or `KEY-12` identifier) and returns the issue row |
| `issues.repository.ts` | `labels.serializers` (`serializeLabel`) | see §3 |

Name each function for the intent, not the storage — `resolveProject`,
`resolveLabel` / `ensureLabel`, `resolveIssue` — exactly as `resolveTenant` is
named. Each returns the **row** the caller needs for tenant-scoped work, or
`null`, not a serialized resource and not a `{ data, error }` envelope.

Document each one with a short comment saying *why* it exists — that a module
owns its own tables, so nothing outside the directory may reach its repository.
`tenants.service.ts`'s `resolveTenant` comment is the model.

---

## 3. The serializer edge

`issues.repository.ts` imports `serializeLabel` from `labels.serializers.js` to
build the labels attached to an issue.

A **type-only** import of another module's serializer types is fine and stays.
Importing the serializer **function** into a repository is not: it puts another
module's wire representation inside this module's data layer.

Move that composition up into the issues **serializer**, which is where wire
representation belongs — the repository returns label rows, and
`issues.serializers.ts` maps them. `issues.serializers.ts` already imports
`serializeLabel`, so no new dependency is created.

---

## 4. Hard requirements

1. **Behaviour does not change.** No route, response shape, error code, status,
   or serialized field may differ. This is a boundary refactor only.
2. **No repository may be imported across module directories** when you are
   done. Verify with:
   ```bash
   grep -rn "from '\.\./[a-z-]*/[a-z-]*\.repository" apps/projects-api/src/modules --include=*.ts | grep -v __tests__
   ```
   That must print nothing.
3. **No `index.ts` may export a repository.** A module's public surface is its
   service, schemas and serializers.
4. Do not introduce a circular import. If two modules would need each other,
   stop and report it rather than adding a shim.
5. No `eslint-disable`, `as any`, `@ts-ignore`, or `@ts-expect-error`.
6. Do not add an abstraction with one call site beyond the resolvers named above.

---

## 5. Tests

The suite is currently **83 passing**. It must still be 83 or more, and the
existing tests must keep asserting the same behaviour — update the mock targets,
never the expectations. Mocking moves from the sibling repository to the sibling
module's public function.

Add at least **4** new cases:

- resolving a project by key and by id both reach the projects module's public
  resolver (assert exact arguments);
- resolving an issue by `KEY-12` identifier and by `iss_` id both reach the
  issues module's public resolver;
- an unknown project still returns the complete `projects/project-not-found`
  error object and the issue repository is `not.toHaveBeenCalled()`;
- an issue's labels still serialize identically after the serializer move.

---

## 6. Do NOT

- Do NOT create, switch, rebase, merge, or delete any git branch.
- Do NOT run `git commit`, `git add`, or `git push`.
- Do NOT run `pnpm install` or edit `pnpm-lock.yaml`.
- Do NOT touch `apps/projects/`, `apps/projects-mcp/`, `apps/console/`, or
  `packages/`.
- Do NOT change the Prisma schema or any migration.
- Do NOT change any route path, error code, or serialized field.
- Do NOT write a `README.md`.

---

## 7. Verify before you report

```bash
cd /root/projects/876
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
grep -rn "from '\.\./[a-z-]*/[a-z-]*\.repository" apps/projects-api/src/modules --include=*.ts | grep -v __tests__
```

Report the real output of each, including the grep (which must be empty).

---

## 8. Report

Write to
`plans/2026-09-03-876-projects/reports/agy/2026-09-03-phase9-cross-module-boundaries.md`
with every file changed and why, the **counted** test total before and after,
the exact output of §7, and anything you could not do. A truthful "not done" is
worth far more than a confident claim that turns out to be false.
