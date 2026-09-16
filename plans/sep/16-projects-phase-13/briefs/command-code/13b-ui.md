# Brief 13b — projects-ui automation and blueprint components

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**`.

## Contracts (write to `packages/projects-ui/src/automation/types.ts`)
```ts
type Transition = { id: string | null; fromStateKey: string | null; toStateKey: string; name: string; requiredPermission: string | null; requiredFieldKeys: string[]; requiresComment: boolean }
type Blueprint = { object: 'projects.blueprint'; workItemTypeId: string; transitions: Transition[]; updatedAt: number }
type AutomationTrigger = 'work-item.created' | 'work-item.updated' | 'work-item.state-changed' | 'phase.completed' | 'due-date.approaching' | 'time-entry.submitted' | 'budget.threshold-reached'
type AutomationActionType = 'set-field' | 'assign' | 'add-label' | 'remove-label' | 'create-reminder' | 'create-event' | 'notify' | 'call-webhook' | 'create-sub-item'
type AutomationAction = { type: AutomationActionType; params: Record<string, string | number | boolean | null> }
type AutomationRule = { object: 'projects.automation-rule'; id: string; projectId: string | null; name: string; enabled: boolean; trigger: AutomationTrigger; conditions: { fieldKey: string; op: string; value?: string | string[] }[]; actions: AutomationAction[]; hasWebhookSecret: boolean; updatedAt: number }
type AutomationRun = { object: 'projects.automation-run'; id: string; ruleId: string; eventId: string; status: 'succeeded' | 'failed' | 'skipped'; errorCode: string | null; attempt: number; startedAt: number; finishedAt: number | null }
```
## Read budget
`packages/projects-ui/src/layouts/layout-editor.tsx` (serialize-to-hidden-input pattern) + test, `packages/projects-ui/src/templates/template-list.tsx`, package.json exports.

## Deliver `packages/projects-ui/src/automation/`
- `blueprint-editor.tsx` — state columns with transitions; add/remove/edit transition rows (from any/state, to, name, required fields multi-select from `availableFieldKeys`, requires comment, permission select from `permissionOptions`); serializes to hidden `transitions` JSON input.
- `automation-rule-list.tsx` — name (link via `hrefBase`), trigger label, enabled badge, action count, updated.
- `automation-rule-editor.tsx` — trigger select, conditions rows, actions rows with per-type param fields; serialize to hidden `rule` JSON input; webhook secret as a password input named `webhookSecret` shown only for `call-webhook` (blank = keep existing).
- `automation-run-table.tsx` — status badge, error code muted, attempt, times.
- `notification-list.tsx` — unread emphasis, subject link via `hrefFor` **string map** prop `{ [subjectType]: baseHref }`.
- Trigger/action label maps exported from `labels.ts`. Explicit subpath exports.
- Tests floor **50 `it()`**.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-13/reports/command-code/13b-ui.md`.

Report path override: write the report to `plans/sep/16-projects-phase-13/reports/opencode/13b-ui.md`.
