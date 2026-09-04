# C3: Projects work-structure settings and issue-create wiring

## Goal

Finish the human-facing layer for the committed configurable work structure. A
workspace administrator needs to manage types, states, milestones, and custom
fields. New issues must use the active structure, including typed custom-field
values. The owning API and `@876/projects` client already exist; extend them
only through the Projects host application.

## Scope and safety

You may change only `apps/projects/**` plus the report specified below. Do not
modify `apps/projects-api/**`, `packages/projects/**`, `apps/projects-mcp/**`,
`packages/ui/**`, `packages/projects-ui/**`, `apps/console/**`, `docs/**`,
`plans/**` (apart from the report), lockfiles, or package manifests. Do not
commit, reset, rebase, checkout, stash, or delete any unrelated work.

Read `AGENTS.md`, `.agents/rules/{ai-code-quality,types,code-style,data-fetching,api-access,app-api-routing}.md`,
and `.claude/rules/shared-product-ui.md` before editing. Read the live source of
truth before coding:

- `apps/projects-api/src/modules/work-structure/{work-structure.routes.ts,work-structure.schemas.ts,work-structure.serializers.ts,work-structure.service.ts,presets.ts}`
- `packages/projects/src/{types.ts,contracts.ts,client.ts}` and its new resource
  files for work item types, workflow states, milestones, custom fields,
  custom-field values, and presets
- Existing Projects patterns: `src/app/api/{issues,comments}`,
  `src/lib/client/{index.ts,projects.ts}`, `src/lib/services/projects.ts`, and
  `src/features/projects/components/{new-issue-form.tsx,create-resource-form.tsx}`.

## Work to implement

### Browser adapters

Add only thin, same-origin typed resource routes and matching `src/lib/client`
methods for these browser resource families:

| Route family                         | Verbs               | Typed service root        |
| ------------------------------------ | ------------------- | ------------------------- |
| `/api/work-item-types`, `/[typeId]`  | POST, PATCH, DELETE | `projects.workItemTypes`  |
| `/api/workflow-states`, `/[stateId]` | POST, PATCH, DELETE | `projects.workflowStates` |
| `/api/milestones`, `/[milestoneId]`  | POST, PATCH, DELETE | `projects.milestones`     |
| `/api/custom-fields`, `/[fieldId]`   | POST, PATCH, DELETE | `projects.customFields`   |

Each handler must use the narrowest existing permission found in the existing
grant/catalog code, `requireApiPermission`, strict local Zod transport parsing,
one matching `projects.<resource>` call, and `apiJson` response envelopes. No
domain logic or raw browser `fetch`. Do not add a preset route or standalone
custom-value route.

Extend the existing `/api/issues` POST schema and `issuesClient.create` to pass
the API-supported `typeKey`, `status`, `milestoneId`, and `customFields` values
unchanged. Retain title/description/project/priority behavior exactly.

### Settings UI

Create linked, server-rendered setting pages at:

- `/settings/work-item-types`
- `/settings/workflow-states`
- `/settings/milestones`
- `/settings/custom-fields`

Add all to the existing Settings navigation as available. Load initial data in
the RSC through `@/lib/services/projects` at the current organization authority;
use client components only for mutations through the new typed host client. Do
not construct a service client in pages/components.

Each page must include an accessible heading/explanation, empty state, inline
create form, list of existing records (name/key/category/type/status), archive
action via the service `del` contract, and local `AppError` handling. For
milestones, load projects once in the RSC, require a project at creation, and
present project-scoped milestones in a phone-usable list. For custom fields,
support exactly the field types in the existing contract; render select options
only for select/multi-select and do not build a JSON/options-schema editor.

Reuse existing `@876/ui` primitives (`FormRow`, `Input`, `Textarea`,
`NativeSelect`, `Button`, `AppError`). Do not build a generic settings engine or
put product UI in `@876/ui`.

### New issue form

Keep `CreateResourceForm` unchanged: it owns the simple name/description
contract. Replace `NewIssueForm` with a dedicated form and add a server data
adapter (`new-issue-data.tsx`) used by `/issues/new`. The adapter passes plain
RSC-loaded active types/states, projects, milestones, and custom fields as
props. The client form submits through `issuesClient.create` and provides:

1. required title and markdown description;
2. active work-item type and state, both defaulting to the API default;
3. optional project and milestones restricted to the selected project;
4. inputs for text, textarea, number/decimal, boolean, date, select,
   multi-select, URL, and user custom fields;
5. client-side required-field UX (API remains authoritative); and
6. existing pending/error/redirect/refresh behavior.

Use the SDK's field IDs and exact custom-value shape. Omit unset custom values.
Do not implement issue edit in this pass.

## Tests and quality gates

Add focused Vitest coverage beside the code. Assert each new route's auth
short-circuit and strict input rejection; same-origin browser-client calls;
settings empty/populated state; and exact issue payloads including omitted
optional values. Do not add random/fuzz/advanced duplicate test files,
snapshots, generic test harnesses, `any`, `@ts-ignore`, or `eslint-disable`.

Format only touched files. Do not run an install, migration, build, dev server,
or repo-wide formatter. Run and report:

```bash
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
```

Write `plans/2026-09-04-projects-app-redesign/reports/agy/2026-09-04-work-structure-settings-and-issue-form.md` with changed files/reasons,
actual test output/count, route permissions selected, incomplete requirements,
and known limitations. Be truthful; do not claim an unrun check passed.
