# Implementation Plan: 876 Projects Phase 12 — Custom Fields & Layouts

- **Run ID:** `2026-09-16-projects-phase-12` · **Branch:** `feature/projects-phase-12-layouts` · **Status:** `PLANNED`

## Existing (do not rebuild)
Work-item custom fields (`CustomField`, `CustomFieldOnType`, `CustomFieldValue`) and phase custom fields (`MilestoneCustomField` + values) already exist.

## Binding decisions
1. **Project custom fields** reuse the same field-type vocabulary and value columns as work-item fields: new `projects_project_custom_fields` + `projects_project_custom_field_values`. The value validator is **one shared module** (extract the existing work-item validator into `src/modules/custom-fields/field-values.ts` and make all three entities use it — no third copy).
2. **Layouts** (`projects_layouts`): tenant, `entity` ∈ `project|phase|work-item`, optional `workItemTypeId` (work-item only; null = default for entity), `name`, `definition` JSONB, `version`, soft delete. Exactly one default per (tenant, entity, workItemTypeId).
3. **Layout definition v1**: `sections[] { key, title, columns: 1|2, fields: { fieldKey, width: 1|2, visible: boolean }[] }` plus `rules[]`. `fieldKey` is either a system key (`title`, `description`, `state`, `priority`, `assignee`, `dueDate`, `startDate`, `estimate`, `labels`, `phase`, `taskList`) or `cf:<customFieldKey>`. Unknown keys are rejected on save.
4. **Layout rules** are declarative and evaluated by one **pure** evaluator shared by server and browser (`packages/projects/src/layout-rules.ts`, exported): `{ when: { fieldKey, op: 'equals'|'not-equals'|'in'|'is-empty'|'is-not-empty', value? }[] (AND), then: { fieldKey, effect: 'show'|'hide'|'require'|'disable' }[] }`. Server enforces `require` on create/update (registered error listing missing fields); `hide`/`disable` are presentation, except a disabled field cannot be changed via API when its rule is active.
5. **Resolution**: `GET /layouts/resolve?entity&workItemTypeId` returns the type-specific layout, else entity default, else a built-in default generated from system fields + active custom fields in `position` order. Never 404.
6. Field ordering = layout order; field visibility per layout.

## Contracts
```ts
type LayoutField = { fieldKey: string; width: 1 | 2; visible: boolean }
type LayoutSection = { key: string; title: string; columns: 1 | 2; fields: LayoutField[] }
type LayoutCondition = { fieldKey: string; op: 'equals' | 'not-equals' | 'in' | 'is-empty' | 'is-not-empty'; value?: string | string[] }
type LayoutEffect = { fieldKey: string; effect: 'show' | 'hide' | 'require' | 'disable' }
type LayoutRule = { key: string; when: LayoutCondition[]; then: LayoutEffect[] }
type Layout = { object: 'projects.layout'; id: string | null; entity: 'project' | 'phase' | 'work-item'; workItemTypeId: string | null; name: string; version: number; isDefault: boolean; builtIn: boolean; sections: LayoutSection[]; rules: LayoutRule[] }
type FieldState = { visible: boolean; required: boolean; disabled: boolean }
// evaluateLayoutRules(layout: Layout, values: Record<string, string | string[] | null>): Record<string, FieldState>
```
Rule conflict precedence: `hide` beats `show`; `require` on a hidden field is ignored; `disable` independent.

## Lanes
12a API (Codex muse) · 12b projects-ui `layout-renderer` + `layout-editor` (Command Code) · 12c app (Command Code) · 12d Console read-only layouts + project custom fields (Codex muse)
