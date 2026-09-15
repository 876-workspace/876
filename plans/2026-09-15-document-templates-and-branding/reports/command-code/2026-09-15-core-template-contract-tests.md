# `@876/core` document-template and branding contract tests

- Date: 2026-09-15
- Agent: command-code
- Scope: **tests only** — no source file was modified, no commit/branch/worktree action taken. Nothing outside `packages/core/src/lib/{document-templates,branding}` was touched.
- Source files under test (read-only): `schema.ts`, `layouts.ts`, `resolve.ts`, `placeholders.ts`, `branding/index.ts`.

## Files created

| Test file                                        | `it()` declarations | Vitest cases (`it.each` rows counted) | Brief minimum | Result |
| ------------------------------------------------ | ------------------- | ------------------------------------- | ------------- | ------ |
| `document-templates/schema.test.ts`              | 16                  | 56                                    | 14            | pass   |
| `document-templates/layouts.test.ts`             | 17                  | 29                                    | 10            | pass   |
| `document-templates/resolve.test.ts`             | 14                  | 18                                    | 14            | pass   |
| `document-templates/placeholders.test.ts`        | 12                  | 15                                    | 9             | pass   |
| `branding/index.test.ts`                         | 23                  | 39                                    | 12            | pass   |
| **Total**                                        | **82**              | **157**                               | **59**        |        |

Case counts come from the Vitest JSON reporter (`assertionResults.length` per file), so every `it.each` row counts as its own case. The `it()` declaration counts also clear each file's minimum on their own: 16 ≥ 14, 17 ≥ 10, 14 ≥ 14, 12 ≥ 9, 23 ≥ 12.

## Verification

### `pnpm --filter @876/core exec vitest run src/lib/document-templates src/lib/branding`

```
 RUN  v4.1.11 /root/projects/876-invoice-branding/packages/core

 Test Files  5 passed (5)
      Tests  157 passed (157)
   Start at  02:54:16
   Duration  983ms (transform 433ms, setup 0ms, import 1.08s, tests 220ms, environment 1ms)
```

Pass/fail per file: `branding/index.test.ts` 39/39, `document-templates/schema.test.ts` 56/56, `document-templates/layouts.test.ts` 29/29, `document-templates/resolve.test.ts` 18/18, `document-templates/placeholders.test.ts` 15/15. Zero failures, zero skips.

### `pnpm --filter @876/core typecheck`

`tsc --noEmit` — clean, no output.

### `pnpm --filter @876/core exec eslint src/lib/document-templates src/lib/branding`

Exit status 0. The only output is the shared Next.js preset notice:

```
Pages directory cannot be found at /root/projects/876-invoice-branding/packages/core/pages or .../src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
```

That notice is emitted by `eslint-config-next` for every non-Next package and is not a rule violation. No `as any`, no `eslint-disable`, no snapshots, no `it.fails`/`it.skip` anywhere in the new files.

## Source bugs found

**None.** All 157 cases passed on the first run against the source as written, so no test is currently asserting correct-behaviour-that-fails. Specifically, the following highest-risk contracts were probed and held:

- `documentTemplateSettingsSchema.parse(layoutDefaults(layout, type))` round-trips `toEqual` the input for **all 18** supported layout × document-type pairs (strict objects, so any stray key in `layoutDefaults` would fail).
- Keyed-list merging in `resolveDocumentTemplate`: an override for `tax` restyles only that column (`widthPercent` stays `null`), an unknown key (`profit`/`subtotal`) adds nothing, order and membership always come from the layout default, and a non-array `columns` value falls back to the defaults.
- Section-level fallback: a malformed `general` (`fontSize: 'big'`) discards only that section while a valid sibling (`header: { show: true }`) still applies, and the result always passes `documentTemplateSettingsSchema.parse` even for a messy overrides object.
- `resolveDocumentTemplate` does not mutate its `overrides` argument — verified with a deep-freeze helper (a write would throw in ESM strict mode) plus a `structuredClone` snapshot comparison.
- `renderTemplateContent` treats every value as plain text (`<script>…`, quote-breakout, U+202E RTL override, 10,000-char value all land byte-identical) and never re-expands a token found inside a substituted value.
- `resolveBranding` degrades per field rather than per object; `contrastRatio`/`relativeLuminance`/`accentForeground` match the WCAG formulas (`#2563eb` → white, `#fde047` → `#111827`).

## Behavioural observations (not bugs, no action requested)

1. `renderTemplateContent` trims whitespace only at the end of a line, so a token that renders empty mid-line leaves its surrounding spaces (`'Tel: %organization.phone% ext'` → `'Tel:  ext'`). This matches the documented rule (only lines that become empty are dropped), but product may eventually want interior space collapsing.
2. Fallback granularity in `resolveDocumentTemplate` is the section, not the field: one malformed field in `general` discards every otherwise-valid field in that same stored `general` object. This is explicitly documented in `resolve.ts`, and the tests pin it so a future change to per-field fallback will be a visible test change.
3. `layoutDefaults(layoutKey, documentType)` does not validate that the layout supports the document type (`layoutDefaults('retail', 'invoice')` returns settings). The `documentTypes` list constrains gallery selection, not this function; the tests only exercise supported pairs, per the layout contract.
