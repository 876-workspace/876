# Brief — Research: Zoho email setup model + latest Resend API contract

You are doing **research only**. Do not modify any source code. Your single
deliverable is one new Markdown file (path below).

## Why this is needed

876 is building a transactional email platform (`apps/communications-api`,
provider = Resend) so that **organizations can configure and send from their own
email addresses/domains** for invoicing/billing documents and courier shipment
notifications. Zoho is our chosen industry reference for how an organization-facing
email setup surface should be shaped. We must also confirm our Resend adapter
matches the **current** Resend REST contract, because it was written without
access to live docs.

## Tooling — Browserbase is the ONLY permitted fetcher

All web access goes through the `browse` CLI. Do NOT use curl, wget, or any other
fetcher.

```bash
browse cloud search "<narrow query>" --num-results 5
browse cloud fetch https://example.com
```

`BROWSERBASE_API_KEY` is already exported. If a command reports missing
credentials, run `browse doctor` and re-export from the repo root `.env`.

## Part A — Zoho's organization email setup model

Research and document, with source URLs, how Zoho lets an **organization**
configure outbound email. Cover Zoho Books/Invoice specifically, and Zoho Mail
only where it explains domain authentication.

Answer these exact questions:

1. **Sender configuration.** How does an org choose the From address? What is
   Zoho's "email address verification" flow for a single address vs a whole
   domain? Where does Zoho force a verified sender and what happens if none is
   verified?
2. **Domain authentication.** What DNS records does Zoho require (SPF, DKIM,
   DMARC, return-path/CNAME)? What are the verification states, and what does
   Zoho do while a domain is pending?
3. **Email templates.** What template types/categories does Zoho Books ship for
   transactional documents (invoice, estimate/quote, payment receipt, payment
   reminder, statement, credit note)? How are templates scoped (per
   organization? per document type? per language?) Which is the "default" per
   category, and can an org add its own?
4. **Placeholders/merge fields.** How does Zoho expose variables in templates
   (exact syntax, e.g. `%InvoiceNumber%` or `${...}`)? Is the variable set fixed
   per template category? This matters because our renderer accepts only an
   explicit flat variable map.
5. **Compose-before-send.** When a user emails an invoice, what does Zoho's
   compose dialog contain (From, To, CC, BCC, subject, body, attach-PDF toggle,
   "send me a copy")? Can the user edit the body before sending?
6. **Delivery history.** Does Zoho surface per-document email history / delivery
   status to the org, and at what granularity (sent/delivered/bounced/opened)?
7. **Reminders/automation.** How are automated payment reminders configured
   (before/after due date, per-customer overrides)?

**Capture screenshots** of the real setup screens where they clarify layout —
Zoho Books email preferences, template list, template editor, and the invoice
compose dialog. Save them under
`plans/sep/15-transactional-email-platform/reports/command-code/screenshots/`
and reference them by filename in your document. Use:

```bash
browse open <url> --local && browse screenshot --path <path>.png
```

If a screen requires a Zoho login you do not have, say so explicitly and rely on
Zoho's public help documentation instead — do NOT invent screen contents.

## Part B — Latest Resend REST contract verification

Fetch the current Resend API reference and document the exact contract for:

1. `POST /emails` — full request body field names, the idempotency mechanism
   (exact header name and semantics, and the retention window), response shape,
   and the documented error codes/status codes.
2. `POST /domains`, `GET /domains`, `GET /domains/:id`, `POST /domains/:id/verify`,
   `DELETE /domains/:id` — request/response shapes, the **exact** domain status
   values, and the shape of the returned DNS records array (field names for
   record type/name/value/priority/ttl/status).
3. **Webhooks** — the signing scheme (Svix), the exact header names, the
   signature algorithm and what string is signed, the tolerance window, and the
   full list of event types with their payload shapes.
4. **API key permissions** — document the difference between full-access and
   sending-only keys, and exactly which of the endpoints above a sending-only
   key cannot call.
5. Any documented rate limits, attachment size/type limits, and the maximum
   number of recipients per send.

Then **compare the documented contract against our implementation** and list any
mismatch as a numbered finding with a file:line reference. Read only these files:

- `apps/communications-api/src/providers/resend-provider.ts`
- `apps/communications-api/src/providers/resend-webhook.ts`
- `apps/communications-api/src/providers/email-provider.ts`

For each mismatch state: what our code does, what the docs say, and the concrete
consequence. Do **not** fix anything — report only.

## Read budget

Read at most the three provider files listed above, plus web sources. Do not
explore the rest of the monorepo.

## Deliverable

Write exactly one file:

`plans/sep/15-transactional-email-platform/reports/command-code/2026-09-16-zoho-and-resend-research.md`

Structure it as:

```markdown
# Research: Zoho email model + Resend contract verification

## Part A — Zoho organization email setup
### A1 Sender configuration
### A2 Domain authentication
### A3 Templates
### A4 Placeholders
### A5 Compose dialog
### A6 Delivery history
### A7 Reminders
### Screenshots captured
### What 876 should copy / deliberately not copy

## Part B — Resend contract
### B1 POST /emails
### B2 Domains endpoints
### B3 Webhooks
### B4 API key permissions
### B5 Limits
### B6 Findings: our implementation vs the docs
  (numbered, each with file:line, our behaviour, documented behaviour, consequence)

## Sources
  (every URL used)
```

Rules: every factual claim carries a source URL. If you could not confirm
something, write "unconfirmed" rather than guessing — an honest gap is worth more
than a plausible invention. Do not edit source code. Do not commit.
