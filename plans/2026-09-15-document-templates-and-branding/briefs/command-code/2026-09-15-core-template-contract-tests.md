# Brief: tests for the `@876/core` document-template and branding contracts

Working directory: `/root/projects/876-invoice-branding`. **Do not commit, switch branches, or create worktrees.** Another agent is editing `apps/couriers/` right now — do not touch anything outside the files listed below.

## Read budget

Read ONLY these five source files (they are short), then write tests:

- `packages/core/src/lib/document-templates/schema.ts`
- `packages/core/src/lib/document-templates/layouts.ts`
- `packages/core/src/lib/document-templates/resolve.ts`
- `packages/core/src/lib/document-templates/placeholders.ts`
- `packages/core/src/lib/branding/index.ts`

**Do not modify any of those source files.** If a test exposes what looks like a bug, leave the test asserting the *correct* behavior, mark it with `it.fails(...)`? — NO: instead write the test for the correct behavior, let it fail, and describe the bug precisely in your report. The orchestrator fixes source.

Test style: Vitest 4, `environment: 'node'`, import `describe/it/expect` from `vitest` explicitly. One behavior per `it()`. Full-shape assertions (`toEqual`), exact values. No `as any`, no `eslint-disable`, no snapshots.

## Files to create and minimum `it()` counts

### 1. `packages/core/src/lib/document-templates/schema.test.ts` — at least 14

- `hexColorSchema` accepts `#1f6feb`, normalizes `#1F6FEB` and `'  #1f6feb '` to `#1f6feb`; rejects `#fff`, `red`, `#12345g`, `''`, `'rgb(0,0,0)'`, and `123 as unknown as string` (use `it.each`).
- `templateFileIdSchema` accepts `file_abc123`, rejects `file_`, `abc`, `file_../../x`, `https://x/y.png`.
- `documentTemplateSettingsSchema` accepts `layoutDefaults('standard','invoice')` unchanged (parse result `toEqual` input) — do this for **every** layout × every document type the layout supports (`it.each` over `DOCUMENT_TEMPLATE_LAYOUTS`).
- rejects an extra unknown key at the top level and inside `general` (strict objects).
- rejects a `header.content` of 2001 characters and accepts 2000.
- rejects a label longer than 60 characters in `documentDetails.fields[0].label`.
- rejects `general.fontSize` of 5 and 37; accepts 6 and 36.
- `documentTemplateOverridesSchema` accepts `{}` and `{ general: { paperSize: 'letter' } }`; rejects `{ general: { paperSize: 'a3' } }` and `{ unknownSection: {} }`.
- Security corpus: `header.content` accepts `'<script>alert(1)</script>'` as plain text (it is data, rendering escapes it) — assert parse succeeds and the value is byte-identical.

### 2. `packages/core/src/lib/document-templates/layouts.test.ts` — at least 10

- layout keys in `DOCUMENT_TEMPLATE_LAYOUTS` equal `DOCUMENT_TEMPLATE_LAYOUT_KEYS` (same set, no duplicates).
- every layout supports at least one document type; every document type in `DOCUMENT_TEMPLATE_TYPES` is supported by at least one layout, and by `DEFAULT_DOCUMENT_TEMPLATE_LAYOUT`.
- `findDocumentTemplateLayout('nope')` is `undefined`; `findDocumentTemplateLayout('retail')` returns the retail entry (full `toEqual`).
- `layoutSupportsDocumentType('retail','invoice')` false; `('retail','sales-receipt')` true.
- `layoutDefaults('standard','invoice').documentDetails.title` is `'INVOICE'`; for `quote` is `'QUOTE'`; payment receipt `billToLabel` is `'Received From'`.
- invoice detail fields keys equal `['number','date','terms','due-date','reference','salesperson','subject']` in order.
- `retail` defaults: `paperSize` `'receipt-80mm'`, visible table columns are exactly `['item','quantity','amount']`.
- calling `layoutDefaults` twice returns deep-equal but **not the same** object references (mutating one result must not affect the next call — mutate `general.margins.top` then call again).
- no layout default contains a green-ish button color: skip this — do NOT write it.

### 3. `packages/core/src/lib/document-templates/resolve.test.ts` — at least 14

- `overrides` of `undefined`, `null`, `'x'`, `42`, `[]` each resolve to `layoutDefaults(...)` (`it.each`).
- `{}` resolves to defaults.
- a valid partial `{ general: { paperSize: 'letter' } }` changes only `general.paperSize`; every other field equals the default.
- nested object merge: `{ table: { header: { backgroundColor: '#000000' } } }` → header keeps default `fontSize` and `fontColor`, `backgroundColor` becomes `#000000`.
- a malformed section (`{ general: { fontSize: 'big' } }`) falls back to that section's default while a valid sibling section in the same overrides object (`header: { show: true }`) still applies.
- keyed list: overrides `{ table: { columns: [{ key: 'tax', show: true, label: 'GCT' }] } }` → the `tax` column becomes visible with label `GCT`, all other columns and their **order** are unchanged, and `widthPercent` stays `null`.
- keyed list: an unknown key `{ key: 'profit', show: true, label: 'x' }` does not add a column (column count unchanged).
- keyed list: a stored entry trying to change its key cannot (`{ key: 'tax', ... }` never produces a column keyed anything else).
- keyed list: non-array `columns: 'x'` keeps default columns.
- detail fields: hiding `due-date` via overrides works and order preserved.
- an unknown top-level section key is ignored.
- the result always passes `documentTemplateSettingsSchema.parse` (for a messy overrides object mixing valid and invalid sections).
- does not mutate the `overrides` input (deep-freeze it with a small helper, or compare with a `structuredClone` taken before).
- `accentColor: '#ABCDEF'` is normalized to `#abcdef` in the resolved result.

### 4. `packages/core/src/lib/document-templates/placeholders.test.ts` — at least 9

- substitutes `%organization.name%` → value.
- leaves an unknown token `%organization.slogan%` untouched.
- a line whose only content is a token with a null/missing value is dropped.
- a line with literal text and an empty token is kept (e.g. `'Tel: %organization.phone%'` → `'Tel:'`).
- a line with no tokens that is empty (`''` between lines) is **kept** (only token-emptied lines are dropped).
- multi-line address format with missing `address.line2` renders without a blank line (full string `toEqual`).
- trailing whitespace from an empty token at end of line is trimmed.
- values containing `%customer.name%` are not re-expanded (substitute value `'%customer.name%'` for organization.name and assert output literal).
- security corpus (`it.each`): values `'<script>alert(1)</script>'`, `"' OR '1'='1"`, `'‮'`, `'a'.repeat(10_000)` are inserted verbatim.
- empty format `''` returns `''`.

### 5. `packages/core/src/lib/branding/index.test.ts` — at least 12

- `brandingSchema` accepts `DEFAULT_BRANDING`; rejects appearance `'sepia'`, sidebarTone `'blue'`, accent `'blue'`.
- `resolveBranding(undefined|null|'x')` → `DEFAULT_BRANDING` (`toEqual`).
- `resolveBranding({ accentColor: '#E11D48', appearance: 'dark', sidebarTone: 'dark' })` → normalized full object.
- a malformed single field degrades only that field (`{ accentColor: 'nope', appearance: 'dark' }` → default accent, `dark`, default tone).
- `BRAND_ACCENT_PRESETS`: unique keys, unique colors, every color passes `hexColorSchema`.
- no preset is green: for every preset, assert NOT (green channel > red channel + 40 AND green channel > blue channel + 40). Compute channels with `parseInt(color.slice(3,5),16)` etc.
- `contrastRatio('#ffffff','#000000')` ≈ 21 (`toBeCloseTo(21, 5)`); `contrastRatio(x, x)` is 1; symmetric `contrastRatio(a,b) === contrastRatio(b,a)`.
- `relativeLuminance('#000000')` 0, `('#ffffff')` 1 (toBeCloseTo).
- `accentForeground('#2563eb')` is `'#ffffff'`; `accentForeground('#fde047')` is `'#111827'`.
- `brandTokens(DEFAULT_BRANDING)` `toEqual` the exact three-key object; its keys equal `BRAND_TOKEN_NAMES`.

## Verification — one command at a time, foreground

```bash
pnpm --filter @876/core exec vitest run src/lib/document-templates src/lib/branding
pnpm --filter @876/core typecheck
pnpm --filter @876/core exec eslint src/lib/document-templates src/lib/branding
```

## Report (required)

Write `plans/2026-09-15-document-templates-and-branding/reports/command-code/2026-09-15-core-template-contract-tests.md`: counted `it()` per file, pass/fail output summary, and a precise description of every failing test you believe is a source bug.
