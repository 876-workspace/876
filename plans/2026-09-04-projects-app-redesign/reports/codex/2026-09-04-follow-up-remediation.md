# Projects redesign follow-up remediation report

## Scope

This report records the second remediation pass on
`feat/projects-comments-and-mobile-redesign`, performed after the post-closeout
review found remaining contract gaps between the Projects API, shared Projects
SDK, Projects MCP server, same-origin application routes, and alternate
custom-field mutation paths.

The implementation state described here was reached at commit
`4ecc81cb7fea14e48cdba1a3b7560fe215ae0085` before this report commit was added.
The local agent should treat the branch head after this report as the handoff
point, run the verification commands below, make any final compile/test fixes,
and then open the PR. This web pass intentionally does not open or merge a PR.

## What changed in this follow-up pass

### 1. Shared Projects SDK contract aligned with the redesigned API

The shared Projects issue contract now preserves the work-structure fields that
the owning API already serializes:

- `typeKey`
- `type`
- `state`
- `milestone`
- `customFields`

Issue `status` is no longer parsed as only the six legacy software-development
preset values at the API/client boundary. A dedicated workflow-state key schema
accepts tenant-defined non-empty keys while `ISSUE_STATUSES` remains available as
the legacy preset vocabulary for places that explicitly need those defaults.

The project contract now also includes `defaultWorkItemTypeId`.

SDK fixtures/tests were updated so they exercise the enriched issue/project
shapes instead of silently validating the pre-redesign resource contract.

### 2. Project default work-item type completed end to end

`Project.defaultWorkItemTypeId` was previously persisted and consumed by issue
creation, but there was no supported create/update/serialization contract for
configuring it. This pass wires it through:

- Projects create body
- Projects update body
- service validation
- repository writes
- project serialization
- shared SDK types
- MCP project create/update arguments

The Projects service validates that a non-null default type belongs to the same
tenant and is active before storing it. Updates may explicitly clear the project
default by sending `null`.

Prisma/schema/migration support was completed for the project-to-work-item-type
relation, including an index and a foreign key that uses `ON DELETE SET NULL` so
a removed type cannot leave an invalid project reference.

### 3. MCP no longer assumes the software-development workflow preset

Projects MCP issue list/create/update arguments now accept configured workflow
state keys rather than the fixed six-state enum.

Issue create/update MCP handling also exposes the redesigned work-structure
inputs:

- `typeKey`
- `milestoneId`
- `customFields`

Project create/update MCP handling exposes `defaultWorkItemTypeId`.

`workspace_get` no longer computes open work from hard-coded statuses. It reads
active workflow states and derives the open-state key set from workflow
categories, excluding `completed` and `canceled`. This keeps workspace summaries
correct for tenant-defined state names.

MCP comment creation now requires a configured default user. Without a verified
agent/user identity, it returns a configuration error instead of creating an
authorless comment that can never satisfy author ownership rules later.

### 4. Direct custom-field mutations now obey issue policy

The standalone custom-field value mutation paths are no longer a bypass around
issue-level validation.

Direct writes now:

- resolve the target issue and its effective work-item type;
- enforce custom-field applicability to that type;
- validate the value against the field type/options;
- enforce required-field invariants before a clear/delete; and
- reject fields that are not valid for the issue's current type.

This makes the owning Projects API authoritative regardless of whether a caller
updates fields through the issue mutation contract or through the dedicated
custom-field-value endpoints.

### 5. Custom-field definition PATCH invariants tightened

Custom-field updates now validate the resulting merged configuration rather than
only the supplied fragment.

The service prevents invalid states such as:

- converting a field to `select`/`multi-select` without usable options;
- attaching options to non-option field types; and
- duplicate option keys.

Duplicate custom-field value inputs for the same field are also rejected instead
of relying on last-write-wins map behavior.

### 6. Type changes clean up stale scoped custom-field values

Issue type changes now have an explicit pruning path for stored custom-field
values that no longer apply to the new work-item type. The pruning runs in the
same transaction as the issue mutation.

Issue structure reads also filter returned custom-field values against the
current effective type, so stale/inapplicable data is not exposed even if older
data exists from before this invariant was enforced.

### 7. Comment ownership moved to the authenticated boundary

The previous implementation passed `actorUserId` through the internal Projects
SDK/API and compared ownership against that caller-supplied value. Because the
owning Express service authenticates an internal service key rather than an end
user, that field was spoofable by any trusted service caller.

This pass removes `actorUserId` from the internal comment PATCH/DELETE transport
contract.

The ownership policy is now enforced in the Projects application's authenticated
same-origin route, which has the verified session user. That route retrieves the
comment through the internal service, verifies `comment.authorUserId ===
auth.userId`, then performs the privileged internal update/delete.

The internal Projects API is therefore treated consistently as a trusted service
plane rather than pretending a request body/query user ID is independently
authenticated.

The shared Projects comments SDK was updated accordingly:

- `comments.retrieve(...)` added;
- `comments.update(...)` accepts only the update body;
- `comments.delete(...)` no longer carries an actor query parameter.

Projects route tests, SDK tests, and API comment tests were updated to the new
boundary contract.

## Important behavior contracts after this pass

### Issue defaults

Workflow state resolution on issue creation:

1. explicit configured `status` key;
2. tenant default workflow state;
3. `projects/workflow-state-not-found` when no usable state exists.

Work-item type resolution on issue creation:

1. explicit `typeKey`;
2. `Project.defaultWorkItemTypeId` when configured;
3. tenant default work-item type;
4. `projects/work-item-type-not-found` when no usable type exists.

### Custom fields

- Required applicable fields are API-enforced on create and update.
- A required field cannot be cleared through the dedicated value endpoint.
- A field scoped to another work-item type cannot be written to the issue.
- Type changes prune values that cease to apply.
- Reads expose only values applicable to the current effective type.
- Select/multi-select definitions must retain valid option sets.

### Comments

- Browser/session-facing ownership is author-only.
- The host route requires the appropriate comment permission and verifies the
  authenticated session user is the comment author before mutation.
- The internal Projects API remains a privileged service contract and does not
  accept a caller-asserted end-user identity for ownership decisions.
- MCP comment creation requires a configured default user so comments have an
  attributable author.

## Tests and fixtures changed during this pass

The follow-up included updates to tests/fixtures across:

- `packages/projects` SDK issue/project resources;
- Projects comment same-origin route tests;
- Projects API comment module tests;
- Projects API project module tests;
- Projects MCP handler fixtures;
- Projects MCP formatting tests;
- Projects MCP handler/tool-schema tests.

These changes are intended to make tests assert the redesigned contracts rather
than preserving the old fixed-state/old-resource assumptions.

## Verification status

No claim is made here that the current branch head is green. This web environment
can modify the GitHub branch but cannot run the repository's pnpm commands.

The previous local run that reported Projects API `292/292` passing occurred
before this follow-up contract pass and must not be used as verification for the
new commits.

The local agent must run at least:

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test

pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test

pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test

pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp test

node scripts/check-app-structure.mjs
```

If the exact workspace package name differs for an app, use its actual
`package.json` name rather than weakening or skipping the check.

## Final local-agent checklist before opening the PR

1. Pull `feat/projects-comments-and-mobile-redesign` at the latest branch head.
2. Run the full verification matrix above.
3. Fix any remaining compile/test failures without weakening assertions or
   restoring legacy fixed workflow-state assumptions.
4. Specifically confirm tests cover:
   - project default type validation and nullable clearing;
   - direct required-field clearing rejection;
   - inapplicable direct custom-field writes;
   - pruning when `typeKey` changes;
   - filtered custom-field reads;
   - merged `fieldType/options` PATCH validation; and
   - authenticated comment ownership at the host route.
5. Sweep for stale call sites that still pass `actorUserId` into comment
   update/delete SDK calls.
6. Sweep typed `Issue` and `Project` fixtures for the enriched required shape.
7. Review the remaining P2 items separately: milestone fan-out performance,
   existing-record editing UX, richer milestone editing, cycles UI/API, and any
   intentionally deferred project-default settings UI.
8. Update the existing `2026-09-04-remaining-work.md` if final local verification
   changes what remains.
9. Open the PR only after the current branch head is green.

## Branch-history note

During the GitHub connector write setup, `packages/projects/src/types.ts` was
briefly replaced with a placeholder and immediately restored before the real SDK
contract patch. The working tree content was repaired, but the restoration/no-op
commits remain in branch history. They do not change the final file contents.
The local agent may leave the history intact or consolidate it only if repository
git policy and the intended PR workflow allow that operation.

## Handoff

This report is a follow-up to
`plans/2026-09-04-projects-app-redesign/reports/codex/2026-09-04-remaining-work.md`.
Where the older report describes comment ownership as being enforced inside the
Projects API using a supplied actor ID, this follow-up report supersedes that
specific description: ownership is now enforced at the authenticated same-origin
route and the internal actor parameter has been removed.
