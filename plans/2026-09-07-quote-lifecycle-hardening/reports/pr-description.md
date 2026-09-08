What does this PR do?

Makes quote decisions, expiry, and conversion explicit Billing workflows shared by Billing and Invoice. Accepted quotes convert to one draft invoice; retries return the linked invoice, and an accepted proposal remains convertible after its original expiry date. Quote decisions remain separate from invoice accounting status.

Type of change

- [x] Bug fix
- [x] New feature
- [ ] Breaking change
- [x] Documentation update

Changes made

- Centralize send/resend, accept, decline, cancel, and expire transitions with transactional outbox events and retry-safe command claims.
- Persist first-send/expiry timestamps and enforce draft/expiry constraints at edit/delete writes.
- Add explicit conversion and tenant preferences for manual or automatic draft creation after acceptance, reusing the canonical invoice creator.
- Preserve integration app attribution for invoice visibility and recover concurrent conversion conflicts without creating another invoice.
- Share quote action presentation between Billing and Invoice, including resend, expiry, conversion, and invoice navigation.
- Synchronize SDKs, generated OpenAPI, route inventories, and quote settings contracts.

Testing

- [x] Tests added/updated for lifecycle rollback, guarded writes, concurrent conversion, integration attribution, HTTP authorization/validation, and shared actions.
- [x] Billing SDK, shared UI, Billing app, and Invoice app tests and typechecks passed.
- [x] Billing API: 708 tests, typecheck, boundaries, and lint passed (three existing warnings).
- [x] API contracts match all 280 operations; Prisma schema validation passed.
- [ ] Repository-wide `pnpm check`: blocked at formatting by baseline debt across 420 reported files.
- [ ] Manual/browser testing completed.
- [ ] Hosted CI and configured review gates complete.

Deployment

Apply the additive quote lifecycle timestamp migration and outstanding prerequisite migrations before release. Read-only drift inspection found that the configured database also lacks the upstream command-idempotency/outbox tables and has unrelated schema drift. No database migrations were applied during this review.

Related Issues

No linked issue. Implementation and verification details: `plans/2026-09-07-quote-lifecycle-hardening/`.
