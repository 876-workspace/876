# 027 — Document Templates and Branding

- **Status:** Accepted (2026-09-15)
- **Scope:** 876 Invoice, 876 Billing, 876 Couriers (invoices attached to packages), their customer portals
- **Rules:** `.claude/rules/app-theming.md`, `finance-app-parity.md`, `module-settings.md`, `storage-architecture.md`

## Context

Organizations need to control how their customer-facing documents look — the
way Zoho Books and Zoho Invoice let them pick a PDF template, restyle it, and
set an accent color that every Finance app inherits. 876 renders invoices from
`@876/billing-ui`, but every organization got the same hard-coded layout.

Zoho's feature set (researched 2026-09-15) is the reference: a gallery of
layouts per document type (Standard, European, Spreadsheet, Premium, Retail);
one default template per type; tabs for General (paper, orientation, margins,
fonts, colors, background, payment stub), Header & Footer, Transaction Details
(organization, customer, document fields with renamable labels), Table
(columns, widths, styles), Total (payment details, amount in words, tax
summary) and Other Details (notes, terms, payment options, bank details, QR
code, signature); and Branding (logo, accent color, appearance).

## Decision

### One contract, in `@876/core`

`@876/core/document-templates` holds the settings schema, the layout catalog
and per-layout defaults, the resolver, and placeholder rendering.
`@876/core/branding` holds the branding schema, presets, WCAG helpers and the
CSS token contract. Billing API, the Billing SDK and Billing UI all import it;
nothing restates it.

### Storage in the financial plane

`apps/billing-api` owns `billing_document_templates` and
`billing_branding_preferences`, beside the existing invoice and document
preferences. Every organization that uses Invoice, Billing or Couriers already
has a Billing tenant, and Zoho scopes branding to its Finance apps the same way.
If a non-finance app needs brand colors, branding storage moves to Core; the
contract does not change.

### Overrides only, resolved per section

A template row stores `layout`, `isDefault`, and only the settings that differ
from that layout's defaults. Resolution is
`layout default → stored overrides → resolved`, section by section: a section
that no longer validates falls back to its default, so a stale row can never
stop an invoice from rendering. Keyed lists (table columns, document detail
fields) keep default membership and order — a stored entry restyles a column,
it cannot add one.

An organization with no rows renders with the Standard layout and default
branding. The feature is therefore on for every organization without a
backfill.

### What is deliberately not copied

- **HTML/CSS templates.** Organization-authored markup shown to customers is an
  injection surface. Template text is plain text with `%token%` placeholders,
  rendered as React text nodes.
- **Annexure documents** and **image uploads** (background, signature) are
  deferred: the schema carries nullable Storage `fileId`s so the upload route
  can be added without a data migration.

### Authorization

No new permission or scope. Tenant callers use `sales:read` / `sales:write`
(the grants invoice preferences already use); integration callers (Invoice,
Couriers) use `billing.invoices.read` / `billing.invoices.write`.

### Theming foundation

Components that follow the brand read `--brand-accent`,
`--brand-accent-foreground` and `--brand-accent-subtle`, which default to the
platform blue. Documents apply an organization's brand today. App chrome does
not yet; see `app-theming.md` for the intended shape.

## Consequences

- One renderer (`TemplatedDocument`) serves every document type and host; the
  invoice panel is an adapter onto it.
- Changing a layout default changes every organization that has not overridden
  that field — intended, and the reason defaults are never stored.
- Finalized documents still snapshot their financial content; a template change
  alters presentation only, never amounts or line data.
