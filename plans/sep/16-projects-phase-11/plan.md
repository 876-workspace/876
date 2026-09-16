# Implementation Plan: 876 Projects Phase 11 — Templates & Cloning

- **Run ID:** `2026-09-16-projects-phase-11` · **Branch:** `feature/projects-phase-11-templates` · **Status:** `IN_PROGRESS`

## Binding decisions
1. **A template is an immutable, versioned JSON snapshot** (`projects_project_templates`: tenant, `key` kebab-case unique per tenant, name, description, `version` int, `definition` JSONB validated by a Zod schema, `sourceProjectId` nullable, soft delete, created/updated). Editing a template writes a new version row (`projects_project_template_versions`); the template points at `currentVersion`.
2. **Definition shape** (`TemplateDefinition`, schema version 1): project settings (lead-less: no user ids), `phases[]`, `taskLists[]`, `workItems[]` (title, description, typeKey, stateKey, priority, estimate, labels by name, `phaseRef`/`taskListRef`/`parentRef` local refs), `dependencies[]` (from/to refs, type, lagDays), `customFieldDefinitions[]`, `budgetDefaults`, `billingMethod`. **Dates are relative offsets in whole days** from a project start (`startOffsetDays`, `durationDays`). **No user ids, no attachments, no time entries, no comments** are ever captured.
3. **Create-from-template and clone share one materializer** (`templates.materialize.ts`, pure planning + one repository transaction). Clone = capture a definition from the live project in memory, then materialize it. No second copy path.
4. Instantiation takes `{ name, key, startDate (unix seconds), includeWorkItems, includeDependencies, includeBudgets }`; missing work-item types/states/labels in the target tenant resolve by key/name, and an unresolved key is a registered error listing the missing keys — never silently dropped.
5. Idempotent create: `idempotencyKey` → same project returned on replay.
6. Console gets read-only template list/detail; the Projects app gets list, detail, save-project-as-template, create-from-template, clone.

## Contracts
```ts
type ProjectTemplate = { object: 'projects.project-template'; id: string; key: string; name: string; description: string | null; currentVersion: number; sourceProjectId: string | null; counts: { phases: number; taskLists: number; workItems: number; dependencies: number }; createdAt: number; updatedAt: number }
type TemplatePreview = { object: 'projects.template-preview'; startDate: number; phases: { ref: string; name: string; start: number | null; end: number | null }[]; workItems: { ref: string; title: string; start: number | null; due: number | null }[]; missing: { workItemTypes: string[]; workflowStates: string[]; labels: string[] } }
```
Routes (org scoped like siblings): `GET/POST /project-templates`, `GET/PATCH/DELETE /project-templates/:id`, `GET /project-templates/:id/versions`, `POST /projects/:id/save-as-template`, `POST /project-templates/:id/preview`, `POST /project-templates/:id/instantiate`, `POST /projects/:id/clone`.

## Briefs
| Brief | Delegate |
| --- | --- |
| briefs/codex/11a-api.md | Codex muse — schema, migration, module, client |
| briefs/command-code/11b-ui.md | Command Code — projects-ui template components |
| briefs/command-code/11c-app.md | Command Code — Projects app (after 11a) |
| briefs/codex/11d-console.md | Codex muse — Console views (after 11a) |
