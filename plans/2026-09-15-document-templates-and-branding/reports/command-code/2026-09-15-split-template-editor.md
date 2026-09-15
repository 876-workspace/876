# Split `document-template-editor.tsx` into focused files

Date: 2026-09-15
Scope: `packages/billing-ui/src/documents/`
Change type: pure code move — no behavior, markup, label, or className changes.

## Resulting layout and file sizes

| File | Lines |
| --- | ---: |
| `src/documents/document-template-editor.tsx` (public entry, unchanged export name/path) | 291 |
| `src/documents/template-editor/types.ts` | 11 |
| `src/documents/template-editor/fields.tsx` | 380 |
| `src/documents/template-editor/general-tab.tsx` | 246 |
| `src/documents/template-editor/header-footer-tab.tsx` | 164 |
| `src/documents/template-editor/details-tab.tsx` | 264 |
| `src/documents/template-editor/table-tab.tsx` | 200 |
| `src/documents/template-editor/totals-tab.tsx` | 193 |
| `src/documents/template-editor/other-tab.tsx` | 145 |
| **Total** | **1894** (was 1821 in one file) |

Every file is well under the 450-line target (largest: `fields.tsx`, 380).

### Move map

- `document-template-editor.tsx` keeps `DocumentTemplateEditor`, `DocumentTemplateEditorInitial`,
  `DocumentTemplateEditorSubmit`, `DocumentTemplateEditorProps` and the RSC-boundary comment.
- `template-editor/fields.tsx` gets `ToggleRow`, `NumberField`, `ColorField`, `NullableColorField`,
  `UploadComingSoon`, `PlaceholderMenu`, `ContentField`, `AccentField`, plus `FONT_LABELS`,
  `PAPER_LABELS`, `ORIENTATION_LABELS`, `IMAGE_POSITION_LABELS` and the module-private
  `INVALID_HEX_MESSAGE`.
- `template-editor/types.ts` holds the two aliases that were local to the editor (`Patch`,
  `ReportInvalid`) and the shared `TemplateTabProps` (`settings`, `patch`, `onInvalid`) that all six
  tabs now import. `GeneralTab` takes `TemplateTabProps & { documentType: DocumentTemplateType }`,
  matching its previous extra prop; no per-tab props type is duplicated.
- One tab per file: `general-tab.tsx`, `header-footer-tab.tsx`, `details-tab.tsx`, `table-tab.tsx`,
  `totals-tab.tsx`, `other-tab.tsx`.

Every moved function is a named export of its new file; each new `.tsx` starts with `'use client'`.
No barrel `index.ts`, no new abstractions, no `package.json` export changes, and no test file was
modified.

## Verification (run from `packages/billing-ui`, final formatted state)

```console
$ npx tsc --noEmit
tsc: 0 errors

$ NODE_ENV=test npx vitest run src/documents
 Test Files  6 passed (6)
      Tests  77 passed (77)

$ npx eslint src/documents
✖ 7 problems (0 errors, 7 warnings)

$ npx prettier --write src/documents
src/documents/template-editor/fields.tsx 37ms
src/documents/template-editor/table-tab.tsx 41ms
src/documents/template-editor/totals-tab.tsx 24ms
(everything else: unchanged)

$ npx prettier --check src/documents
All matched files use Prettier code style!

$ wc -l src/documents/document-template-editor.tsx src/documents/template-editor/*.tsx
  291 src/documents/document-template-editor.tsx
  264 src/documents/template-editor/details-tab.tsx
  380 src/documents/template-editor/fields.tsx
  246 src/documents/template-editor/general-tab.tsx
  164 src/documents/template-editor/header-footer-tab.tsx
  145 src/documents/template-editor/other-tab.tsx
  200 src/documents/template-editor/table-tab.tsx
  193 src/documents/template-editor/totals-tab.tsx
 1894 total
```

The whole package suite was also run once and passed: `Test Files 67 passed (67)`,
`Tests 693 passed (693)`.

## Notes and caveats

- **`NODE_ENV` must be `test` for this suite.** The host shell exports
  `NODE_ENV=production`, under which React resolves to a production build and every render-based
  test fails with `TypeError: React.act is not a function` — including tests in files this change
  never touched (`branding-settings-form.test.tsx`, `document-template-gallery.test.tsx`,
  `templated-document.test.tsx`). This is a pre-existing environment artifact, not a regression
  from the split; `NODE_ENV=test npx vitest run src/documents` is green.
- **Test-count expectation.** The brief expected 103 tests for `src/documents`; the suite actually
  collects **77** there (6 files) and **693** for the whole package. No test file was edited by this
  change, so the collected count is identical to before the split — all of them pass.
- **Lint warnings.** `0 errors`; the 7 warnings are the 6 pre-existing ones plus
  `'onInvalid' is defined but never used` in the new `other-tab.tsx`. That binding was already
  unused on `OtherTab` in the original file, so the directory's warning count is unchanged.
- **Fidelity.** All moved functions/markup were reviewed against the original text after the split:
  ids, `aria-label`s, labels, `min`/`max`/`step` values, classNames, and element order are
  identical. The only edits outside the move itself are the `export` keywords, `'use client'`,
  rebuilt import blocks, and the shared `TemplateTabProps` type.
