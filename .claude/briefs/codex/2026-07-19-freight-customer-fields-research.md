# Deep research: customer data model for a courier/freight SaaS + shared-customer plane + bulk import

**Advise/research only — no code edits, no commits.** You are gpt-5.6-sol running
for the 876 platform. Use web search extensively (current year: 2026). Write your
findings to `/tmp/claude-1000/-workspaces-876/46e5d11d-ccb8-45f6-93b1-7ad7532099f4/scratchpad/research-customer-fields.md`.

## Context (why)

876 is a multi-app SaaS ecosystem (Zoho-style). A shared "finance plane" service
(`apps/billing`, consumed via `@876/billing` integration client) owns customers,
catalog items, invoices, payments per organization — shared across all product
apps. The Couriers app (`apps/couriers`) is a multitenant courier/freight
management product: packages/shipments are received or generated for a customer,
charges become invoices in the shared billing plane. Couriers keeps a thin
app-local `customerProfile` (courier-specific enrollment) referencing the shared
billing customer by ID.

We are about to (1) enrich the shared customer model with fields a
courier/freight-forwarding product needs, (2) add bulk customer import (CSV),
and (3) keep the shared plane design honest against industry practice. Your
research feeds those design decisions — made by the orchestrating agent, not you.

## Questions to answer (all of them)

1. **Customer fields in freight/courier software.** Survey what customer/client
   records look like in: CargoWise, Magaya, GoFreight, Logitude World, Freightos,
   Zoho Books/Invoice (customer + contact model), plus any modern courier-management
   SaaS (e.g. Detrack, OnFleet, Shipday and last-mile platforms). Enumerate concrete
   fields grouped by category: identity (display name, company vs individual, contact
   persons), communication (emails, phones, preferred channel), addresses (billing vs
   shipping vs multiple delivery addresses), financial (currency, payment terms,
   credit limit, tax registration/TRN/EIN, opening balance), freight-specific
   (account number, customer since, salesperson/owner, carrier account refs,
   Incoterms defaults, customs broker info, EORI/importer numbers, special handling
   instructions, delivery preferences/time windows), and lifecycle/meta (status,
   portal access enabled, tags/segments, notes, documents/attachments).
2. **Which of those fields belong in a _shared cross-product_ customer vs a
   _product-local_ profile?** How does Zoho split this (Zoho's shared "Customers"
   across Books/Invoice/Projects/Inventory vs module-specific data)? What is the
   industry-standard split for a shared CRM/billing "party" record vs app extensions?
3. **Bulk customer import conventions.** How do Zoho Books, QuickBooks, Xero, and
   Shopify structure CSV customer import? Column naming, required minimum (name?),
   duplicate handling strategies (skip / overwrite / merge, match keys: email vs
   name), preview/validation step, error reporting per-row, template download,
   size limits. What is the modern UX: multi-step wizard (upload → map columns →
   preview/validate → import → summary)?
4. **Contact persons.** Do the surveyed products model multiple contact persons
   per customer (Zoho does)? Minimum viable shape.

## Return shape (write to the scratchpad file)

- A field inventory table: field, type, which products have it, shared-plane vs
  courier-profile recommendation, priority (P0 must-have / P1 / P2).
- A short section on the Zoho shared-customer architecture with citations/URLs.
- A CSV import spec recommendation: columns, required fields, duplicate strategy
  options, wizard steps.
- Explicit "not found / thin evidence" callouts where the web results were weak.
- Cite source URLs inline.

Do NOT propose implementation code. Do NOT edit repo files. Findings file only.
