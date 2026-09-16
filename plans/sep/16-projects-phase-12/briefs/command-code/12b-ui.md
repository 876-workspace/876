# Brief 12b — projects-ui layout renderer and editor

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**` (another agent edits `apps/projects-api/**` and `packages/projects/**`).

## Contracts
Copy the types from `plans/sep/16-projects-phase-12/plan.md` "Contracts" verbatim into `packages/projects-ui/src/layouts/types.ts`. Also implement `evaluateLayoutRules` there as `packages/projects-ui/src/layouts/evaluate-rules.ts` **temporarily** following the precedence rules in the plan exactly, with a header comment `// Mirrors packages/projects/src/layout-rules.ts; replaced by that import once 12a lands.` (the orchestrator will swap the import).

## Read budget
`packages/projects-ui/src/templates/instantiate-options.tsx` + test, `packages/projects-ui/package.json` exports, `@876/ui/form-row` props (read `packages/ui/src/form-row.tsx` top only). Then write.

## Deliver `packages/projects-ui/src/layouts/`
- `layout-renderer.tsx` — client component: given `layout`, `fields: { fieldKey, label, control: ReactNode-free descriptor { kind: 'text'|'textarea'|'number'|'date'|'select'|'multi-select'|'boolean', options?: {value,label}[] } }[]`, `values`, and `namePrefix` string, renders sections (1/2 columns, width 2 spans), each field in `FormRow` with `required` from rule evaluation, hides hidden fields, sets `disabled`. Uses named native inputs so a surrounding `<form>` submits values; re-evaluates rules on change from local state. No function props required.
- `layout-editor.tsx` — client component: edit sections (add/rename/remove/reorder with up/down buttons), move fields between sections, toggle visible/width, add/remove rules with condition/effect rows; serializes the whole definition into a hidden `<input name="definition">` JSON so a form posts it. Props: `initial: Layout`, `availableFields: { fieldKey, label }[]`.
- `layout-summary.tsx` — read-only section/field/rule overview (for Console).
- Explicit subpath exports `./layouts/<name>`.
- Tests floor **45 `it()`** incl. every precedence case (hide beats show, require-on-hidden ignored, AND conditions, `in`, empty checks) and the editor's serialized output.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-12/reports/command-code/12b-ui.md`.
