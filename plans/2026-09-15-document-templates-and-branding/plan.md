# Implementation Plan: Document Templates, Branding & Couriers Settings Navigation

- **Run ID:** `2026-09-15-document-templates-and-branding`
- **Worktree:** `/root/projects/876-invoice-branding`
- **Integration branch:** `develop-invoice-customization` (phases PR into it, merge commits; one final PR → `main`)
- **Status:** COMPLETED — phases merged into `develop-invoice-customization` (#588–#594); final PR to `main` open, not merged (migration unapplied)

## Overview

1. **Couriers settings navigation.** Modules become a sidebar group (one item per module) instead of a single "Modules" item opening a list page; the modules index page is removed; the "← Settings" back link is removed from every settings page.
2. **Document templates (Zoho-style PDF templates)** for invoices, quotes, sales receipts, credit notes and payment receipts — a layout gallery plus per-template customization — available to every organization in 876 Invoice, 876 Billing and 876 Couriers (invoices attach to packages there).
3. **Branding** (Zoho Settings → Branding): accent color + appearance, inherited by every finance app and document.
4. **App theming foundation only**: a CSS token contract (`--brand-*`) and resolver so apps can later apply an organization's colors from stored preferences. Not applied to app chrome yet.

## Research — what Zoho offers (Browserbase, 2026-09-15)

Sources: zoho.com/us/books/help/settings/pdf-templates/edit-templates.html, zoho.com/en-in/erp/help/.../pdf-templates/template-styles.html, zoho.com/us/invoice/kb/general/branding-themes.html.

- **Gallery categories:** Standard (Standard, European, Japanese, POS), Spreadsheet, Premium, Universal, Retail. Each module (invoice, quote, sales order, credit note, payment receipt…) has its own templates; one is **default** per module; templates can be **previewed**, **cloned**, **set as default**; a **color theme** dropdown per template.
- **General tab:** template name; paper size (A4/Letter); orientation; margins (inches); payment stub (invoices); PDF font; label color; font color; font size; background image + position; background color.
- **Header & Footer tab:** header background image/color, placeholder content, "apply to first page only"; footer font size/color, background image/position, show page number, placeholder content.
- **Transaction details tab:** show org logo + resize; show org name; show org address + address format (placeholders); customer name font size/color; Bill To / Ship To toggles with address formats; show document title + size/color; document information fields toggled on/off with renamable labels.
- **Table tab:** column labels on/off + rename; item name/description format; column widths; table header / item row / description font size, background color, font color.
- **Total tab:** show total section; show payment details (payments made, credits, balance due); amount in words; currency symbol; quantity; total & balance-due styling; tax summary table.
- **Other details tab:** notes label/size; payment options; bank details; invoice QR code; terms label/size; signature image + name; annexure content/documents.
- **HTML/CSS templates** (custom code).
- **Branding:** organization logo; accent color (presets + custom color) — "updates across all Zoho Finance apps, including the Customer Portal"; appearance (light/dark pane).

## Key design decisions

1. **Contract lives in `@876/core`** (`@876/core/document-templates`, `@876/core/branding`). It is consumed by `apps/billing-api` (which depends only on `@876/core`), `@876/billing` and `@876/billing-ui`. One schema, one resolver, one layout catalog.
2. **Storage in the financial plane (`apps/billing-api`).** Templates render customer-facing financial documents that Billing already owns (`DocumentPreference`, `InvoicePreference`). Branding here is *finance* branding, mirroring Zoho ("across all Finance apps"). Every org using Invoice, Billing or Couriers already has a Billing tenant. If a non-finance surface later needs brand colors, promote branding to Core — the `@876/core/branding` contract already allows that without renaming.
3. **Defaults are never stored.** An organization with no rows resolves to the built-in `standard` layout and `DEFAULT_BRANDING`, so the feature is enabled for *all* orgs with no backfill. A template row stores only overrides (`DocumentTemplateOverrides`) + `schemaVersion`.
4. **Resolution degrades per section.** `layout default → stored overrides → resolved`; a malformed section falls back to its default so a stale column never stops an invoice rendering (module-settings rule). Keyed lists (table columns, detail fields) keep default membership/order — a stored row can restyle a column, never invent one.
5. **No HTML/CSS templates.** Zoho's HTML editor is deliberately not copied: template text is plain text with `%token%` placeholders rendered as React text nodes. Custom HTML/CSS shown to an org's customers is an injection surface. Revisit only with a sanitizer.
6. **Images by Storage `fileId` only** (background, header/footer image, signature) per storage-architecture.md. The upload route is a follow-up phase; the schema already carries nullable file ids.
7. **Authorization reuses existing grants.** Tenant tier: templates/branding read `sales:read`, write `sales:write` (same as invoice preferences). Integration tier (Invoice, Couriers): `billing.invoices.read` / `billing.invoices.write`. No new permission or scope that nothing grants.
8. **No green accent preset** (green is status-only; the accent will fill buttons once theming lands).
9. **Theming foundation = contract only.** `brandTokens()` emits `--brand-accent`, `--brand-accent-foreground`, `--brand-accent-subtle`; renderers read CSS variables, never stored values. App chrome adoption is tracked as a TODO (876 Projects issue), not built.
10. **Couriers "general" module** is excluded from the new Modules sidebar group (user: "remove the general modules settings"); the Modules index page is deleted. Customer portal moves from Product into the Modules group so it is not listed twice.

## Model routing (for later review)

| Phase / task | Delegate | Model | Why |
| --- | --- | --- | --- |
| Research (Zoho templates + branding) | orchestrator | Claude Opus 5 + Browserbase | research, design input |
| Core contract (schema, layouts, resolver, branding tokens) | orchestrator | Claude Opus 5 | design-critical contract |
| P1 Couriers settings nav cleanup | opencode | `opencode/muse-spark-1.3-contributor-free` (`--variant max`) | copy-pattern UI; strongest free coder (Cline muse-spark hit its daily cap: `INFERENCE_CAP_ERROR`) |
| Core contract tests | Command Code | `deepseek/deepseek-v4.1-flash` (`--effort max`) | tests for stable code, prepaid pool |
| P3 Billing API templates + branding + SDK | Codex | `gpt-5.6-terra` high | migration + service + routes + SDK (spend remaining GPT quota) |
| P4 `@876/billing-ui` renderer + editor + branding form | Codex | `gpt-5.6-terra` medium | cross-component UI |
| P5 host integration (Billing, Invoice, Couriers) | Cline / opencode free, Codex `-p muse` fallback | see reports | copy of the reference host |
| P6 theming foundation CSS + rule | orchestrator | Claude Opus 5 | small, design-owned; done inline while delegates ran |

Actual finishing model per run is recorded in the Execution Reports table.

## Dispatched briefs

| Phase | Delegate | Brief |
| --- | --- | --- |
| P1 | opencode | [couriers-settings-module-nav](./briefs/opencode/2026-09-15-couriers-settings-module-nav.md) |
| P2 tests | command-code | [core-template-contract-tests](./briefs/command-code/2026-09-15-core-template-contract-tests.md) |
| P3 | codex | [billing-api-document-templates](./briefs/codex/2026-09-15-billing-api-document-templates.md), [continuation](./briefs/codex/2026-09-15-billing-api-document-templates-continue.md) |
| P4 | codex | [billing-ui-templated-documents](./briefs/codex/2026-09-15-billing-ui-templated-documents.md) (attempt 2 notes appended), [continuation](./briefs/codex/2026-09-15-billing-ui-templated-documents-continue.md) |
| P4 split | command-code | [split-template-editor](./briefs/command-code/2026-09-15-split-template-editor.md) |
| P5 shared | — | [shared-host-templates-spec](./briefs/shared-host-templates-spec.md) |
| P5 Billing | opencode | [billing-host-templates](./briefs/opencode/2026-09-15-billing-host-templates.md) |
| P5 Invoice | cline → command-code → opencode | [invoice-host-templates](./briefs/cline/2026-09-15-invoice-host-templates.md) |
| P5 Couriers | opencode | [couriers-host-templates](./briefs/opencode/2026-09-15-couriers-host-templates.md), [couriers-invoice-document](./briefs/opencode/2026-09-15-couriers-invoice-document.md) |

## Execution reports

| Phase | Delegate / finishing model | Report |
| --- | --- | --- |
| P1 | opencode `muse-spark-1.3-contributor-free` — accepted, merged #588 | [report](./reports/opencode/2026-09-15-couriers-settings-module-nav.md) |
| P2 tests | Command Code `deepseek-v4.1-flash` — 157 tests, accepted, merged #589 | [report](./reports/command-code/2026-09-15-core-template-contract-tests.md) |
| P3 attempt 1 | Codex `gpt-5.6-terra` high — stopped honestly on a real core typing defect (`noUncheckedIndexedAccess` in `contrastRatio`), fixed by orchestrator | [report](./reports/codex/2026-09-15-billing-api-document-templates.md) |
| P4 attempt 1 | Codex `gpt-5.6-terra` medium — **rejected**: 101 lines, one-line components, placeholder tabs, no tests; deleted | [report](./reports/codex/2026-09-15-billing-ui-templated-documents-terra-attempt1-rejected.md) |
| P4 attempt 2 | Codex `-p muse` (`muse-spark-1.3-contributor`, xhigh) — host OOM killed its wrapper; process finished without a report. Left renderer, types, sample data, invoice-panel adapter (22/26 tests passing) | — |
| P3 attempt 2 | Codex `gpt-5.6-terra` high — OOM-killed beside the user's dev server after writing service/repository/route tests | — |
| P3 attempt 3 | Codex `gpt-5.6-terra` high — ran ~6 min then **GPT usage limit reached** (resets 2026-09-19) | — |
| P3 attempt 4 | Codex `-p muse` — finished, 1136 billing-api tests, contract check clean; accepted, merged #590 | [report](./reports/codex/2026-09-15-billing-api-document-templates.md) |
| P4 attempt 3 | Codex `-p muse` — all components + 103 tests, no report written; orchestrator fixed 1 type error + 1 lint error; accepted | — |
| P4 split | Command Code `deepseek-v4.1-flash` — 1,821-line editor split into 8 files (<400 lines); accepted, merged #591 | [report](./reports/command-code/2026-09-15-split-template-editor.md) |
| P5 Billing host | opencode `muse-spark-1.3-contributor-free` — 346 tests, gates clean; orchestrator made gallery links nullable for read-only viewers; merged #592 | [report](./reports/opencode/2026-09-15-billing-host-templates.md) |
| P5 Invoice host attempt 1 | Cline `cline-free/deepseek-v4.1-flash` (`--thinking xhigh`) — 15 min reading, zero edits; stopped and rotated | — |
| P5 Invoice host attempt 2 | Command Code `deepseek-v4.1-flash` — refused at start: 5-hour usage limit (resets 07:51 UTC) | — |
| P5 Invoice host attempt 3 | opencode `muse-spark-1.3-contributor-free` — 198 tests; orchestrator fixed page guards (finance `sales:*` → app `settings.view/edit`); merged #593 | [report](./reports/opencode/2026-09-15-invoice-host-templates.md) |
| P5 Couriers host | opencode `muse-spark-1.3-contributor-free` — 272 tests, gates clean; correctly skipped invoice document (integration invoice type ≠ tenant helper) | [report](./reports/opencode/2026-09-15-couriers-host-templates.md) |
| P5 Couriers invoice document | opencode `muse-spark-1.3-contributor-free` — adapter + Document section, 41 invoice tests; merged #594 | [report](./reports/opencode/2026-09-15-couriers-invoice-document.md) |

## Checklist

- [x] Remove extra worktrees (uncommitted `billing-social-signin-fix` work stashed as `stash@{0}`), `pnpm clean`
- [x] Worktree + integration branch `develop-invoice-customization`
- [x] Zoho research
- [x] P2a Core contract (`@876/core/document-templates`, `@876/core/branding`)
- [x] P1 Couriers settings nav — #588 merged
- [x] P2b Core contract tests — #589 merged
- [x] P3 (#590) Billing API: `billing_document_templates`, `billing_branding_preferences`, routes (tenant + integration), `@876/billing` resources
- [x] P4 (#591) `@876/billing-ui`: template-aware `InvoiceDocumentPanel`, gallery, editor with live preview, branding form
- [x] P5 Hosts (#592 Billing, #593 Invoice, #594 Couriers): Billing settings, Invoice settings, Couriers settings (Templates + Branding) and document detail pages render the default template
- [x] P6 Theming foundation (`--brand-*` CSS layer, `app-theming.md` + mirror, ADR 027) — #589; TODO filed as **BILL-99** in 876 Projects
- [ ] Follow-up (not in this run unless time): Storage upload route for template images/signature; PDF generation
- [x] Final PR `develop-invoice-customization` → `main` opened (not merged)

## Verification commands

```bash
pnpm --filter @876/core test && pnpm --filter @876/core typecheck
pnpm --filter @876/billing-api typecheck lint boundaries test
pnpm --filter @876/billing-api db:validate && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing test typecheck
pnpm --filter @876/billing-ui test typecheck
pnpm --filter @876/couriers-app test typecheck lint
pnpm --filter @876/billing-app typecheck ; pnpm --filter @876/invoice-app typecheck
node scripts/check-app-structure.mjs && pnpm check:rsc-boundaries
```

## Handoff state

- **Migration `apps/billing-api/prisma/migrations/20260915120000_document_templates_and_branding` is not applied.** Dev and prod share Neon databases; apply with `prisma migrate deploy` (direct URL) only with explicit approval, **before** deploying billing-api or any host that calls the new routes.
- Pre-existing, unrelated: 2 failing cases in `packages/billing/src/types/__tests__/payment.schema.test.ts` (identical on `main`).
- App typechecks need `next typegen` in a fresh checkout (`RouteContext` otherwise undefined).
- Follow-ups not built: Storage upload route for template background/header/signature images (editor shows "Upload coming soon"); PDF generation/download; Quote, Sales Receipt, Credit Note and Payment Receipt detail pages do not yet render through `TemplatedDocument` (templates for those types can be designed and previewed); app-chrome theming — **BILL-99**.
- The first-attempt Billing worktree stash from before this run: `stash@{0}` "billing-social-signin-fix uncommitted work".

## Verification on the merged integration branch (2026-09-15, orchestrator)

| Package | Result |
| --- | --- |
| `@876/core` | 1305 tests pass, typecheck 0 |
| `@876/billing` | typecheck 0; 408 pass, 2 pre-existing failures |
| `@876/billing-api` | typecheck 0, boundaries clean, contract 0 mismatches, 1136 tests pass |
| `@876/billing-ui` | typecheck 0, 695 tests pass |
| `@876/billing-app` | typecheck 0, lint 0 errors, 626 affected tests pass |
| `@876/invoice-app` | typecheck 0, lint 0 errors, 311 affected tests pass |
| `@876/couriers-app` | typecheck 0, lint 0 errors, 284 affected tests pass |
| repo gates | app-structure OK, RSC boundaries OK |

## PR preparation summary

#588 Couriers settings nav · #589 core contract + tokens + ADR 027 + app-theming rule · #590 Billing API storage/routes/SDK · #591 Billing UI renderer/editor/gallery/branding form · #592 Billing host · #593 Invoice host · #594 Couriers host + invoice document.
