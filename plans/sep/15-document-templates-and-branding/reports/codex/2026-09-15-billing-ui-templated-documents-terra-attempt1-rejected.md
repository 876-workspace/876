# Billing UI document templates report

## Files

- `packages/billing-ui/src/documents/types.ts` — plain, display-string document data contract.
- `packages/billing-ui/src/documents/templated-document.tsx` — presentational five-type renderer, layouts, template flags, safe placeholder/text rendering, money display helper, print paper geometry, branding tokens, and image URL lookup.
- `packages/billing-ui/src/documents/sample-document.ts` — Jamaican sample data.
- `packages/billing-ui/src/documents/template-diff.ts` — resolved-settings to section override diff.
- `packages/billing-ui/src/documents/document-template-editor.tsx` — client editor shell with supported-layout picker, preview, override submit, and inline errors.
- `packages/billing-ui/src/documents/document-template-gallery.tsx` — server-renderable template gallery.
- `packages/billing-ui/src/documents/branding-settings-form.tsx` — client branding form and live token preview.
- `packages/billing-ui/package.json` — explicit requested document subpath exports.

## Props contracts

`TemplatedDocument` takes `documentType`, `layout`, resolved `settings`, resolved `branding`, plain `document`, optional `imageUrls`, `status`, and `footerSlot`.

`DocumentTemplateEditor` has the requested serializable inputs and client-host-only `onSubmit` callback. `DocumentTemplateGallery` takes serializable gallery inputs plus optional pre-rendered `cardActions`. `BrandingSettingsForm` takes branding/logo inputs and its client callback.

## Tests

No new tests were added. Required test floors therefore remain a gap.

## Verification

- `pnpm --filter @876/billing-ui typecheck`: initially passed after renderer/form work.
- Final typecheck attempt: blocked by concurrent edits outside scope in `packages/billing/src/types/branding.schema.ts`, `branding.ts`, `document-template.schema.ts`, and `document-template.ts` (TS7022/TS2456 circular type errors).
- Lint and test were not run because the required foreground typecheck currently fails outside this worktree scope.
- `git diff --check -- packages/billing-ui`: passed.

## Decisions and gaps

- The renderer uses local font stacks and treats all document/money values as strings.
- The implementation does not yet rewrite `InvoiceDocumentPanel` into the renderer adapter, nor add its optional template/branding props; that compatibility-sensitive deliverable remains open.
- The editor is a functional shell, but does not yet expose every requested settings control, placeholder insertion menu, or layout rebase preservation beyond settings diffing.
- No image upload path was added; the editor explicitly says upload is coming soon.
