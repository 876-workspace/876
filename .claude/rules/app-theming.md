# Organization Branding & App Theming

Read this before adding an organization-controlled color, before styling a
customer-facing document, and before hard-coding an accent color in a finance
app (Invoice, Billing, Couriers) or its customer portal.

Companion to `module-settings.md` (preferences), `finance-app-parity.md`
(shared panels), and `docs/architecture/027-document-templates-and-branding.md`.

## What exists today

| Piece                                                                                                                 | Owner                                | Status                          |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------- |
| Branding contract — `brandingSchema`, `resolveBranding`, `BRAND_ACCENT_PRESETS`, `brandTokens()`                      | `@876/core/branding`                 | built                           |
| Stored branding per organization (`billing_branding_preferences`)                                                     | `apps/billing-api`                   | built                           |
| CSS tokens `--brand-accent`, `--brand-accent-foreground`, `--brand-accent-subtle` (+ Tailwind `brand-accent*` colors) | `packages/ui/src/styles.css`         | built, default = platform blue  |
| Documents (invoice, quote, receipts) render with the org brand                                                        | `@876/billing-ui` templated document | built                           |
| App chrome (buttons, sidebar, focus rings) follows the org brand                                                      | —                                    | **not built — foundation only** |

## The contract

1. **Components read tokens, never stored values.** A component that should
   follow the brand uses `var(--brand-accent)` / `bg-brand-accent`, not a hex
   passed down from a preference. Applying a brand is setting the three
   properties from `brandTokens(branding)` on a wrapper element.
2. **Tokens default to the platform palette.** With no wrapper, `--brand-accent`
   is `--info`, so adopting a token never changes an unbranded surface.
3. **Resolve on the server, apply as data.** Branding crosses the RSC boundary
   as the plain `Branding` object; the client never fetches it separately.
4. **Foreground is computed, not chosen.** `accentForeground()` picks the text
   color with the higher WCAG contrast; do not let an organization pick a
   foreground that can make a button unreadable.
5. **No green accent presets.** Green is reserved for status. A custom accent
   may still be green; when chrome adoption lands, a green-ish custom accent
   must not fill a primary button (fall back to `--info`).

## When app theming is built (TODO)

Tracked in 876 Projects. The intended shape, so nobody improvises it:

- One `BrandScope` client-safe wrapper in `@876/ui` that sets the tokens from a
  resolved `Branding`; mounted once in each app shell under the org layout.
- Replace hard-coded `info` usage in primary actions with `brand-accent`
  **one component family at a time**, in `@876/ui`, never per app.
- `appearance` (`system` / `light` / `dark`) and `sidebarTone` drive the
  existing `.dark` class and a sidebar data attribute; they are persisted in
  the same branding row, and any client state store only mirrors the resolved
  server value.
- Promote branding storage to Core if a non-finance app (CRM, Console) needs
  it; the `@876/core/branding` contract does not change.

## Do not

- Do not store a CSS string, class name, or arbitrary style object as branding.
- Do not accept organization HTML/CSS for documents or chrome.
- Do not read branding from `localStorage` as a source of truth.
- Do not add a second accent token beside `--brand-accent`.
