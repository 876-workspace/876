# Brief: split `document-template-editor.tsx` into focused files (no behavior change)

Working directory `/root/projects/876-invoice-branding`. Do not commit, switch branches, or create worktrees. You are the only agent running; the host is memory-constrained — run one command at a time.

## Read budget

Read only `packages/billing-ui/src/documents/document-template-editor.tsx` (1821 lines) and skim `packages/billing-ui/src/documents/document-template-editor.test.tsx` imports.

## Task

Move code, do not rewrite it. Target layout (all under `packages/billing-ui/src/documents/`):

| New file | Contents moved from the editor |
| --- | --- |
| `document-template-editor.tsx` | `DocumentTemplateEditor` only (+ its props type) — stays the public entry; keep its export name and path |
| `template-editor/fields.tsx` | `ToggleRow`, `NumberField`, `ColorField`, `NullableColorField`, `UploadComingSoon`, `PlaceholderMenu`, `ContentField`, `AccentField`, and the label constant maps (`FONT_LABELS`, `PAPER_LABELS`, `ORIENTATION_LABELS`, `IMAGE_POSITION_LABELS`, `INVALID_HEX_MESSAGE`) |
| `template-editor/general-tab.tsx` | `GeneralTab` |
| `template-editor/header-footer-tab.tsx` | `HeaderFooterTab` |
| `template-editor/details-tab.tsx` | `DetailsTab` |
| `template-editor/table-tab.tsx` | `TableTab` |
| `template-editor/totals-tab.tsx` | `TotalsTab` |
| `template-editor/other-tab.tsx` | `OtherTab` |

Rules:

- Every moved function becomes a named export of its new file; import it where used. Add `'use client'` at the top of each new `.tsx` that uses hooks or event handlers (all of them, since they are client editor pieces).
- If the tabs share a props type (e.g. settings + an update callback), put it in `template-editor/types.ts` and import it; do not duplicate it.
- No logic, markup, className, label, or text changes. No new abstractions. No barrel `index.ts`.
- Do not touch `package.json` exports (only `document-template-editor` is public).
- Do not change any test file unless an import path must change.

## Verification — one at a time, foreground, from `packages/billing-ui`

```bash
npx tsc --noEmit
npx vitest run src/documents
npx eslint src/documents
npx prettier --write src/documents
wc -l src/documents/document-template-editor.tsx src/documents/template-editor/*.tsx
```

Expected: 0 type errors, 103 tests passing (same as before), 0 lint errors, every file under 450 lines.

## Report (required)

`plans/2026-09-15-document-templates-and-branding/reports/command-code/2026-09-15-split-template-editor.md` — resulting file sizes and the verification output.
