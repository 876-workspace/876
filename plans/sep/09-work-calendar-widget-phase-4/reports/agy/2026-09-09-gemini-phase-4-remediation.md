# Gemini Phase 4 remediation report

Date: 2026-09-09

The remediation corrected the Phase 4 Invoice pilot across the Work contract,
Work API, shared browser/widget layers, and Invoice BFF.

## Changed areas and decisions

- Narrowed invoice labels without a cast and retained safe label/URL metadata.
- Added an all-required session permission mode and applied it to the aggregate
  resource-work route for tasks, reminders, and events.
- Extended the canonical create-task contract with a validated primary link;
  task, link, and primary assignee now use one nested Prisma create.
- Bounded resource-work to the shared 62-day maximum, collected independent
  resources concurrently, and made the 100-page ceiling an explicit error.
- Replaced the generic browser context tuple with host-owned nested Invoice
  routes under `/api/invoices/:invoiceId/work`.
- Kept widgets host-agnostic by injecting a scoped same-origin browser client.
- Reused the canonical Event input schema for contextual Event creation.

## Tests added or strengthened

- all-required guard and assembled Work API route authorization;
- aggregate validation, envelope, concurrency/pagination failure behavior;
- atomic task/link/assignment persistence and metadata preservation;
- Invoice aggregate and contextual task/event/reminder handlers;
- session, feature, permission, organization, and invoice boundaries;
- context setter ownership, A-to-B transition safety, scope switching, stale
  response isolation, and contextual create/reload visibility.

## Verification

All commands from the remediation brief passed: Work, Work API, Widgets,
Invoice, and platform API typechecks/tests; Work API and Invoice builds; Widgets
browser tests; shared transpile and service-bundle checks; and diff whitespace
validation. Totals observed were 238 Work tests, 560 Work API tests, 149 Widgets
unit tests, 11 Widgets browser tests, 477 Invoice tests, and 2,267 platform API
tests.

Work API lint passed with two existing warnings. Repository-wide Invoice lint
has 11 unrelated pre-existing errors in customer/item/quote files; ESLint over
every Invoice file changed by this remediation passed.

## Residual scope

Customer, CRM, Couriers, provider synchronization, and advanced productivity UI
remain deferred. No schema migration, new dependency, secret, direct browser
Work service URL, or new credential was introduced.
