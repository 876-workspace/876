# Brief: `@876/billing-ui` — template-driven document renderer, template editor, gallery, branding form

Working directory: `/root/projects/876-invoice-branding`. **Do not commit, switch branches, create worktrees, push, or open PRs.** Another Codex run is concurrently editing `apps/billing-api/` and `packages/billing/` — **do not touch those, nor any `apps/*` directory.** Your file scope is `packages/billing-ui/` only (plus `packages/billing-ui/package.json` exports). If you need something outside it, stop and report.

## Rules to read first (binding)

`.claude/rules/finance-app-parity.md` (panels: render, never fetch; hrefs/callbacks as props; own empty/loading/error states), `.claude/rules/shared-product-ui.md`, `.claude/rules/production-render-errors.md` (Rule 1: no required function props on components a **server** host renders), `.claude/rules/app-layout.md` §10a (`FormRow`, `Label`, hints as tooltips, `Tabs` for long forms, `RadioGroup` for ≤3 options), root `CLAUDE.md` UI Copy + "No green buttons", `.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`, `.claude/rules/naming.md`.

## The contract (consume, do not restate)

- `packages/core/src/lib/document-templates/schema.ts`, `layouts.ts`, `resolve.ts`, `placeholders.ts` → import from `@876/core/document-templates`.
- `packages/core/src/lib/branding/index.ts` → import from `@876/core/branding` (`brandTokens`, `BRAND_ACCENT_PRESETS`, `DEFAULT_BRANDING`, `Branding`).

Add `@876/core` is already a dependency of `@876/billing-ui`.

## Current code to build on

- `packages/billing-ui/src/panels/invoice-document-panel.tsx` (+ its test) — the only template-less document renderer today; used by `apps/billing` and `apps/invoice` invoice detail pages (you must keep its **public props backward-compatible**, adding only optional props).
- `packages/ui/src/components/document-view.tsx` — layout primitives.
- UI primitives available: `@876/ui/tabs`, `@876/ui/radio-group`, `@876/ui/switch`, `@876/ui/slider`, `@876/ui/select`, `@876/ui/textarea`, `@876/ui/form-row`, `@876/ui/input`, `@876/ui/button` (check each file's exports before importing).

## Deliverables

### 1. `src/documents/templated-document.tsx` — the one renderer

A presentational component (no `'use client'` needed unless required) that renders **any** of the five document types from:

```ts
interface TemplatedDocumentProps {
  documentType: DocumentTemplateType
  settings: DocumentTemplateSettings        // already resolved
  branding: Branding                        // already resolved
  document: TemplatedDocumentData
  /** Resolved image URLs keyed by Storage file id (background, signature…). Missing → image not rendered. */
  imageUrls?: Record<string, string>
  status?: ReactNode                        // e.g. the existing status ribbon
  footerSlot?: ReactNode
}
```

Define `TemplatedDocumentData` in `src/documents/types.ts`: seller (name, logoUrl, email, phone, website, taxId, address parts), recipient (name, email, phone, billing address parts, shipping address parts), `details: Partial<Record<DocumentDetailFieldKey, string | null>>`, `lines` (id, name, description, quantity string, unit, rate, discount, tax, amount — all display strings; **money is never a JS number**), totals (subtotal, discount, shipping, adjustment, tax, total, amountPaid, amountCredited, balanceDue, amountInWords — display strings or null), taxSummary rows, notes, terms, paymentOptions (labels), bankDetails (label/value rows), qrCodeUrl.

Rendering rules — every rule is driven by `settings`, never hard-coded:

- Apply `brandTokens(branding)` as inline CSS custom properties on the root; `settings.general.accentColor ?? var(--brand-accent)` is the accent. Colors from settings are applied via inline `style` (they are validated `#rrggbb` values). No `dangerouslySetInnerHTML` anywhere.
- Fonts: map `DOCUMENT_TEMPLATE_FONTS` keys to local CSS font stacks (no network font loading).
- Paper: root width/aspect from `paperSize` + `orientation`; margins in inches as padding; `@media print` keeps it; `receipt-80mm` renders a narrow column.
- Layout variants by `layout` key: `standard` (logo/org left, title right), `european` (title/details left, org right), `spreadsheet` (bordered grid), `elegant` (colored header band), `retail` (single narrow column). Pass `layout` as a prop too (add it to the props above).
- Sections honour every flag: header/footer show + content (via `renderTemplateContent`) + `firstPageOnly`/`showPageNumber` (single-page preview: render "Page 1 of 1" when on); organization logo/name/address (+ `logoHeight`, `addressFormat`); customer name style, Bill To / Ship To with their labels and formats; document title show/text/style; detail fields in configured order, hidden ones omitted, empty values omitted; table columns in order with labels, `widthPercent`, borders, header/row/description styles, `showItemDescription`; totals show / payment details / amount in words / currency symbol is already inside display strings (when `showCurrencySymbol` is false strip a leading non-digit currency prefix from display strings via one small pure helper, unit-tested); tax summary; notes/terms show + label + fontSize; payment options; bank details; QR code; signature (image via `imageUrls`, label). `includePaymentStub` renders a dashed-top remittance stub (org name, document number, balance due, "Amount enclosed" line) for invoices only.
- Text content renders as text nodes; newline → line breaks.

### 2. `InvoiceDocumentPanel` on top of the renderer

Rewrite the panel as a thin adapter that maps its existing props onto `TemplatedDocumentData` and renders `TemplatedDocument`. Add optional props `template?: { layout: DocumentTemplateLayoutKey; settings: DocumentTemplateSettings }` and `branding?: Branding`; when absent use `resolveDocumentTemplate(DEFAULT_DOCUMENT_TEMPLATE_LAYOUT, 'invoice', {})` and `DEFAULT_BRANDING`. Preserve today's behavior that discount/tax columns only appear when a line uses them (hide those columns when no line has a value, even if the template shows them). Keep the status ribbon. Update its existing test for label changes (e.g. "Bill to" → template default "Bill To") and keep every behavioral assertion.

### 3. `src/documents/sample-document.ts`

`sampleDocumentFor(documentType, seller?)` → realistic Jamaican sample data (JMD amounts as display strings, e.g. `JMD 12,500.00`; Kingston address) used by the editor preview and gallery thumbnails. Pure; unit-tested.

### 4. `src/documents/document-template-editor.tsx` (`'use client'`)

Zoho-style editor, two panes: settings (left) and live `TemplatedDocument` preview (right, scaled to fit; stacks below on narrow screens).

Props (all serializable except the callback, which is fine because this is only rendered by client host adapters — say so in a comment):

```ts
{
  documentType: DocumentTemplateType
  initial: { name: string; layout: DocumentTemplateLayoutKey; settings: DocumentTemplateOverrides }
  branding: Branding
  seller?: TemplatedDocumentData['seller']
  submitLabel?: string                       // default 'Save'
  onSubmit: (value: { name: string; layout: DocumentTemplateLayoutKey; settings: DocumentTemplateOverrides }) => Promise<{ error: { message: string } | null }>
  cancelHref: string
}
```

- Top bar: template name input, layout select (only layouts supporting the type), accent color control ("Brand color" = null vs custom hex, with `BRAND_ACCENT_PRESETS` swatches).
- Tabs, exactly: **General** (paper size, orientation, margins ×4, font, font size, font color, label color, background color, background image position; payment stub switch for invoices), **Header & Footer**, **Transaction Details** (organization, customer, document details — field list with show toggles + label inputs), **Table** (column list with show/label/width, borders, item description, header/row/description styles), **Total** (all totals flags, three labels, total & balance-due styles, tax summary), **Other Details** (notes, terms, payment options, bank details, QR code, signature show + label). Image file-id fields render a disabled "Upload coming soon" control — do not invent an upload path.
- Placeholder help: a small insert-placeholder menu next to each content textarea listing `DOCUMENT_TEMPLATE_PLACEHOLDERS`.
- The form edits a full resolved settings object in local state, and on submit computes **overrides only** (a pure `diffTemplateSettings(defaults, edited): DocumentTemplateOverrides` in `src/documents/template-diff.ts` — section-level partials containing only changed fields; for keyed lists include the whole list when any entry differs). Switching layout re-bases on the new layout's defaults while preserving the user's changed fields.
- Color inputs: `<input type="color">` paired with a hex text input, validated with `hexColorSchema` inline.
- Errors: keep the form mounted and show `AppError`-style inline notice (look for `@876/ui/app-error`); no error toasts. Submit button `variant="info"` (never green), disabled while submitting.

### 5. `src/documents/document-template-gallery.tsx`

Server-renderable (no required function props). Props: `documentType`, `templates: Array<{ id; name; layout; isDefault; settings: DocumentTemplateSettings }>`, `branding`, `newHref: string`, `editHrefBase: string` (renders `${editHrefBase}/${id}`), and `cardActions?: Record<string, ReactNode>` keyed by template id — the host passes already-rendered action elements (its own client component for set-default/delete), because a render-function prop cannot cross the RSC boundary. Cards show a scaled thumbnail (`TemplatedDocument` with sample data, `pointer-events-none`, `aria-hidden`), name, layout label, "Default" badge. When `templates` is empty, show the built-in Standard card as the default with a "Customize" link to `newHref`.

### 6. `src/documents/branding-settings-form.tsx` (`'use client'`)

Props: `initial: Branding`, `logoUrl: string | null`, `logoHref: string | null` (link to where the logo is managed), `onSubmit(value: Branding) => Promise<{ error }>`. Fields: accent color (preset swatches as a radio group with accessible names + "Custom" hex input/color picker), appearance (`RadioGroup`: System, Light, Dark), sidebar tone (`RadioGroup`: Light, Dark). A small live preview strip showing a primary button and a document header band using `brandTokens`. No subheading paragraphs.

### 7. Exports

Add explicit subpath exports in `packages/billing-ui/package.json` for each new file (`./documents/templated-document`, `./documents/document-template-editor`, `./documents/document-template-gallery`, `./documents/branding-settings-form`, `./documents/sample-document`, `./documents/template-diff`, `./documents/types`). No barrel.

## Tests (floors, counted `it()`), jsdom + Testing Library

- `templated-document.test.tsx` ≥ 24: each layout renders; hidden detail field absent; renamed label shown; column order + hidden column; discount/tax suppression via the invoice adapter; header content placeholder substitution; footer page number on/off; logo hidden; bill-to label; ship-to hidden by default; totals hidden; payment details on/off; amount in words; tax summary; notes/terms labels; signature image only when URL present; payment stub invoice-only; accent CSS var present on root; `settings.general.accentColor` overrides brand; security corpus — `<script>` in header content and in a line name renders as literal text and no `script` element exists.
- `template-diff.test.ts` ≥ 10: no changes → `{}`; single field; nested style object; keyed list change includes full list; round-trip `resolveDocumentTemplate(layout, type, diff(defaults, edited))` deep-equals `edited` for several edits (property-style `it.each`).
- `document-template-editor.test.tsx` ≥ 12: tabs present; editing title updates preview; hiding a column updates preview; submit sends overrides-only payload (exact `toHaveBeenCalledWith`); error keeps entered values; submit disabled while pending; layout select limited to supported layouts; invalid hex shows inline error and blocks submit.
- `document-template-gallery.test.tsx` ≥ 5; `branding-settings-form.test.tsx` ≥ 7 (no green among preset swatch names; custom hex validation; exact submit payload); `sample-document.test.ts` ≥ 4; existing `invoice-document-panel.test.tsx` still passes (updated labels only).

## Verification — ONE at a time, foreground

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui lint
pnpm --filter @876/billing-ui test
```

Never add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.

## Report (required)

`plans/2026-09-15-document-templates-and-branding/reports/codex/2026-09-15-billing-ui-templated-documents.md`: files, counted tests per file, verification numbers, props contracts as implemented, decisions not settled by this brief, and gaps.

## Attempt 2 notes (read before starting)

- A previous attempt was **rejected and deleted**: it compressed components onto single 400-character lines, left five of six editor tabs as placeholder sentences, skipped the `InvoiceDocumentPanel` adapter, and wrote zero tests. Do the full brief. Format code normally (run `npx prettier --write packages/billing-ui/src/documents` before finishing).
- Another agent is still editing `packages/billing/src/**` concurrently. If `pnpm --filter @876/billing-ui typecheck` fails **only** with errors located in `packages/billing/src`, still run lint and tests, and record the exact foreign errors in your report. Errors in `packages/billing-ui` are yours to fix.
- Order of work: `types.ts` → `templated-document.tsx` → `invoice-document-panel.tsx` adapter → tests for those two → `template-diff.ts` + tests → editor + tests → gallery, branding form, sample document + tests. Write each test file right after its component so a stalled run still leaves verified work.
