# Brief 12b — projects-ui layout renderer, editor, summary

- **Lane:** 12b (Command Code) · **Branch:** `feature/projects-phase-11-templates` (working tree only)
- **Scope:** `packages/projects-ui/**` + this report. No commit, no branch, no push.
- **Status:** complete · typecheck clean · 133 new tests green

## Delivered

| File | Purpose |
| --- | --- |
| `src/layouts/types.ts` | Plan §Contracts copied verbatim (`LayoutField`, `LayoutSection`, `LayoutCondition`, `LayoutEffect`, `LayoutRule`, `Layout`, `FieldState`) plus `LayoutValues` (the `Record<string, string \| string[] \| null>` the evaluator takes). |
| `src/layouts/evaluate-rules.ts` | **Temporary** mirror of `packages/projects/src/layout-rules.ts`, carrying the required header comment. Exports `evaluateLayoutRules` and `DEFAULT_FIELD_STATE`. |
| `src/layouts/layout-renderer.tsx` | Client form body: sections → `FormRow` per placed field, named native controls, rule-driven visible/required/disabled, local state re-evaluation. No function props. |
| `src/layouts/layout-editor.tsx` | Client editor: section add/rename/remove/up-down, field move between sections + within a section, visible/width toggles, rule condition/effect rows, `serialize → <input type="hidden" name="definition">` JSON. |
| `src/layouts/layout-summary.tsx` | Read-only section/field/rule overview for the Console. |
| `src/layouts/fixtures.ts` | Shared test builders (`layoutFixture`, `layoutSection`, `layoutField`, `layoutRule`, `layoutCondition`, `layoutEffect`). |
| `package.json` | Explicit subpath exports: `./layouts/types`, `./layouts/evaluate-rules`, `./layouts/layout-renderer`, `./layouts/layout-editor`, `./layouts/layout-summary`. |

## Rule semantics implemented (the parts the swap must preserve)

- A rule applies when **every** condition holds (AND); a rule with no conditions always applies.
- `equals` / `in` are one membership test: the condition's value(s) against the field's value — for a list value, **any** member matching counts. `not-equals` is its negation.
- `is-empty` matches missing key, `null`, `''`, and `[]`; `is-not-empty` is its negation.
- Baseline visibility comes from `section.fields[].visible`, so a `show` effect reveals an authored-hidden field.
- **`hide` beats `show`** regardless of rule order; **`require` on a hidden field is ignored**; **`disable` is independent** of both.
- The result is seeded for every field a section places, so the renderer can read `states[fieldKey]` without merging defaults.

## Renderer notes

- `fields` are descriptors (`{ fieldKey, label, control: { kind, options? } }`); a placed key with no descriptor is skipped, and a descriptor the layout does not place is not rendered.
- Kinds: `text` / `textarea` / `number` / `date` / `select` (native `<select>`, always with an empty option) / `multi-select` (checkbox group sharing one name) / `boolean` (`value="true"` + `uncheckedValue="false"`, matching `InstantiateOptions`).
- Input names are `${namePrefix}${fieldKey}`, ids are the same string with non-alphanumerics replaced by `-`; `required` is applied both to `FormRow` (asterisk) and the native control. Hidden and disabled fields stay out of `FormData` because they are not rendered / are disabled.
- Width 2 adds `sm:col-span-2` to the `FormRow`; `columns === 2` adds `sm:grid-cols-2` to the section grid.

## Editor notes

- Conditions keep their value as **text** while editing (so typing a comma works) and are converted at serialization: `in` → split on `,` and trimmed, `is-empty` / `is-not-empty` → no `value` key, everything else → the literal string.
- The hidden `definition` field carries `{ sections, rules }` — exactly the JSONB the API stores — and is recomputed on every render, so a surrounding `<form>` always posts current state.
- New section/rule keys are generated against the current key set, so a removed key is never handed out twice.

## Verification

```
NODE_ENV=test pnpm --filter @876/projects-ui typecheck   # tsc --noEmit, clean
NODE_ENV=test pnpm --filter @876/projects-ui test        # 37 files, 494 tests passed
```

New tests: **133 `it()`** — `evaluate-rules.test.ts` 35, `layout-renderer.test.tsx` 41, `layout-editor.test.tsx` 44, `layout-summary.test.tsx` 13. The evaluator suite covers each precedence case (hide beats show in both rule orders, require-on-hidden ignored for authored *and* rule-hidden fields, AND conditions, `in`, all four empty shapes) and the editor suite asserts the full serialized definition, including an edit round-trip and a `FormData` post.

`NODE_ENV`: this shell exports `NODE_ENV=production`, which makes Vite resolve React's production build and breaks `React.act` for **every** jsdom test file in the package, pre-existing ones included (`src/templates/instantiate-options.test.tsx` fails identically on `main`). Prefixing `NODE_ENV=test` is the only difference; no repo config was touched.

## For the orchestrator

- Swap `import { DEFAULT_FIELD_STATE, evaluateLayoutRules } from './evaluate-rules'` in `layout-renderer.tsx` for the 12a import of `@876/projects` / `packages/projects/src/layout-rules.ts`, then delete `evaluate-rules.ts` and its package export. The semantics above are what the tests assert against.
- `src/layouts/fixtures.ts` is test-only (not exported from `package.json`).
