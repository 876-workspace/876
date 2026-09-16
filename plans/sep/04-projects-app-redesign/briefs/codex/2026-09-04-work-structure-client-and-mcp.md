# Brief: Phase 2 C2 — `@876/projects` client resources + MCP exposure for work structure

## Context

876 Projects (`apps/projects-api`) just landed a configurable work-structure
layer: per-tenant `WorkItemType`, `WorkflowState`, `Milestone`, `CustomField`,
and `CustomFieldValue` rows, seeded from a preset catalog
(`software-development` / `business-operations` / `general`). The Express
module is fully built, routed, and tested:
`apps/projects-api/src/modules/work-structure/`. Do not change anything under
`apps/projects-api/**` — this brief is client + MCP only.

The gap: **nothing outside `apps/projects-api` can reach this module yet.**
`packages/projects` (`@876/projects`, the typed server-side SDK every app and
the MCP server import) has no resource file for it, so
`apps/projects/src/lib/services/projects.ts` cannot expose it, and
`apps/projects-mcp` cannot read it. This brief adds exactly that: the SDK
resources, and read-only MCP tools so an agent can discover what values are
valid before creating/updating an issue.

Read `.claude/rules/sdk-conventions.md` and `.claude/rules/stripe-api-pattern.md`
before writing — this SDK already follows both closely; match the existing
files' shape, do not invent a new one.

## What already exists — read these first, verbatim, before writing anything

- `apps/projects-api/src/modules/work-structure/work-structure.routes.ts` —
  the exact paths and HTTP methods.
- `apps/projects-api/src/modules/work-structure/work-structure.schemas.ts` —
  the exact request body shapes (Zod, camelCase).
- `apps/projects-api/src/modules/work-structure/work-structure.serializers.ts`
  — the exact response shapes (`SerializedWorkItemType`,
  `SerializedWorkflowState`, `SerializedMilestone`, `SerializedCustomField`,
  `SerializedCustomFieldValue`). Copy these field-for-field into
  `packages/projects/src/types.ts` as new Zod schemas — do not paraphrase a
  field name.
- `apps/projects-api/src/modules/work-structure/presets.ts` — the preset
  catalog shape, for `GET /presets`.
- `packages/projects/src/resources/labels.ts` and
  `packages/projects/src/resources/issues.ts` — the resource-factory pattern
  to copy exactly (`request(runtime, { method, path, body, signal }, schema)`).
- `packages/projects/src/types.ts` — where existing Zod schemas
  (`labelSchema`, `deletedSchema`, etc.) live; add the new ones beside them.
- `packages/projects/src/client.ts` and `packages/projects/src/service-client.ts`
  — where resources are wired onto the client object.
- `apps/projects/src/lib/services/projects.ts` — the app's server-only
  bounded client; it lazily exposes each resource as a getter. Add the new
  resources the same way.
- `apps/projects-mcp/src/tools.ts` and `apps/projects-mcp/src/handlers.ts` —
  the MCP tool-definition + handler pattern. `issues_list`, `labels_list`,
  `label_create` are the closest precedents.
- `apps/projects-mcp/README.md` and `docs/projects/mcp-agent-guide.md` — the
  agent-facing docs; update both for the new tools (short additions, matching
  the existing style — do not restructure either doc).

## Exact routes to cover (all already live in `apps/projects-api`)

Base: `/v1/organizations/:organizationId`

```
GET    /work-item-types
POST   /work-item-types
GET    /work-item-types/:id
PATCH  /work-item-types/:id
DELETE /work-item-types/:id

GET    /workflow-states
POST   /workflow-states
GET    /workflow-states/:id
PATCH  /workflow-states/:id
DELETE /workflow-states/:id

GET    /milestones?projectId=...&status=...
POST   /milestones
GET    /milestones/:id
PATCH  /milestones/:id
DELETE /milestones/:id

GET    /custom-fields
POST   /custom-fields
GET    /custom-fields/:id
PATCH  /custom-fields/:id
DELETE /custom-fields/:id

GET    /presets
POST   /presets/apply           body: { key: 'software-development' | 'business-operations' | 'general' }

# mounted under issues, not organizations directly:
GET    /issues/:issueRef/custom-field-values
PUT    /issues/:issueRef/custom-field-values      body: { fieldId, value, updatedBy? }
DELETE /issues/:issueRef/custom-field-values/:id
```

`DELETE` on work-item-types/workflow-states/custom-fields is an **archive**
(soft, sets `archivedAt`), matching the serializer's `archivedAt` field — name
the SDK method `delete` anyway, to match `labels`/`issues`' existing
`delete`/`del` convention in this package (check which one `labels.ts`
actually uses and match it, don't introduce a third verb spelling).

## Task 1 — `packages/projects` SDK resources

Add to `packages/projects/src/types.ts`:

- `workItemTypeSchema`, `workItemTypeListSchema`
- `workflowStateSchema`, `workflowStateListSchema`
- `milestoneSchema`, `milestoneListSchema`
- `customFieldSchema`, `customFieldListSchema`
- `customFieldValueSchema`, `customFieldValueListSchema`
- `presetSchema`, `presetListSchema` (for `GET /presets`)
- Input types: `CreateWorkItemTypeInput`, `UpdateWorkItemTypeInput`,
  `CreateWorkflowStateInput`, `UpdateWorkflowStateInput`,
  `CreateMilestoneInput`, `UpdateMilestoneInput`, `MilestoneListParams` (for
  the required `projectId` + optional `status` query),
  `CreateCustomFieldInput`, `UpdateCustomFieldInput`,
  `SetCustomFieldValueInput`, `ApplyPresetInput` — mirror the Zod request
  schemas' fields exactly (camelCase, same optionality).

Add new files under `packages/projects/src/resources/`:

- `work-item-types.ts` → `createWorkItemTypesResource(runtime)`:
  `list`, `create`, `retrieve`, `update`, `delete`.
- `workflow-states.ts` → `createWorkflowStatesResource(runtime)`: same five.
- `milestones.ts` → `createMilestonesResource(runtime)`: same five, `list`
  takes `(organizationId, projectId, options?)` — fold `projectId` and the
  optional `status` filter into the query string the same way an existing
  resource builds one (check `issues.ts` for the query-string pattern used
  there; match it, do not invent a second query-building helper).
- `custom-fields.ts` → `createCustomFieldsResource(runtime)`: same five.
- `custom-field-values.ts` → `createCustomFieldValuesResource(runtime)`:
  `list(organizationId, issueRef, options?)`,
  `set(organizationId, issueRef, input, options?)` (PUT),
  `delete(organizationId, issueRef, valueId, options?)`.
- `presets.ts` → `createPresetsResource(runtime)`: `list(organizationId, options?)`,
  `apply(organizationId, input, options?)` (POST `/presets/apply`).

Wire all six new resources onto `packages/projects/src/client.ts` under keys
`workItemTypes`, `workflowStates`, `milestones`, `customFields`,
`customFieldValues`, `presets` — exactly those camelCase keys, they are what
every downstream caller (app service module, MCP) will use.

Add matching tests: `packages/projects/src/resources/*.test.ts` for each new
file, following `packages/projects/src/resources/issues.test.ts`'s or
`labels.ts`'s co-located test as the template (mock `request`, assert method +
path + body/query + schema passed, assert error passthrough). Do not skip
error-path tests — `.claude/rules/testing.md` applies to this package.

## Task 2 — app-local server client

In `apps/projects/src/lib/services/projects.ts`, add lazy getters for
`workItemTypes`, `workflowStates`, `milestones`, `customFields`,
`customFieldValues`, `presets` — same pattern as the existing five getters
(`tenants`, `projects`, `issues`, `labels`, `comments`). No new browser-facing
`/api/...` routes in this brief — nothing in the UI calls these yet (that is
Phase 2 C3, a separate brief). Do not add unused route handlers.

## Task 3 — MCP tools (read-only)

An agent's actual need here is narrow: **know what type/state/milestone keys
are valid before filing or updating an issue**, and see a project's
milestones. Do not add MCP tools for creating/editing/archiving
types/states/custom-fields/milestones — that is deliberately a human,
settings-UI action (Phase 2 C3), not something to hand an agent write access
to yet.

Add exactly these tools to `apps/projects-mcp/src/tools.ts` +
`apps/projects-mcp/src/handlers.ts`, matching `issues_list`/`labels_list`'s
existing shape (workspace-scoped, same input/description style, same
`format.ts` rendering conventions — check `format.ts` for how lists are
rendered as text and extend it rather than inventing a second output style):

- `work_item_types_list` — org-scoped, no params beyond the existing
  workspace-resolution the other list tools already use. Returns the
  active (non-archived) types.
- `workflow_states_list` — same shape, active states only.
- `milestones_list` — takes `projectId` (required — matches the API's
  required query param) and optional `status`.

Update `apps/projects-mcp/README.md` and `docs/projects/mcp-agent-guide.md`
with a short section documenting the three new tools — mirror the existing
entries' format exactly (one short paragraph + example call), do not restructure
either file.

Add tests: `apps/projects-mcp/src/tools.test.ts` (tool definitions exist, have
the right required params) and `apps/projects-mcp/src/handlers.test.ts` (each
new handler calls the right SDK method with the right args, formats the
result, propagates an SDK error). Match the existing tests for `labels_list`
as the template.

## Explicit "do not"

- Do not touch anything under `apps/projects-api/**` — it is done and tested.
- Do not add write MCP tools for types/states/custom-fields/milestones.
- Do not add browser-facing `/api/...` routes in `apps/projects/src/app/api/**`
  — no UI consumes these yet.
- Do not add settings-page UI, issue-form wiring, or issue-detail rendering of
  custom fields/milestones — that is Phase 2 C3, out of scope here.
- Do not rename any existing SDK resource, method, or exported type.
- Do not use `as any`, `eslint-disable`, or `@ts-ignore`.
- Do not write narrative comments explaining obvious code.

## Verification (run all, in this order, before reporting done)

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp test
pnpm --filter @876/projects-mcp lint
```

Report exact test counts (before/after), not just "tests pass." List every
new file created and every existing file touched, with a one-line reason for
each existing-file touch.
