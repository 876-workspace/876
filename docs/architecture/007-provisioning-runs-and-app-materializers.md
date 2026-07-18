# ADR-007: Track provisioning runs and keep materializers app-owned

- Status: Accepted
- Date: 2026-07-15
- Extends: ADR-003, ADR-005, ADR-006

## Context

A published manifest is desired state, not proof that an organization's data
plane reached that state. Provisioning crosses the platform database and an
application-owned database, so a direct synchronous write would create an
unrecoverable dual-write boundary. Operators also need to see which immutable
recipe revision ran, why it ran, its attempts, and the failed step before they
retry or reconcile it.

The same concern applies to application preferences. Console must know their
typed shape and values, but it must not write an application's tables. The app
understands its invariants and is the only safe owner of materialization.

## Decision

1. Core records a `provisioning_run` for each durable cross-plane execution.
   A run snapshots manifest version 1 plus the exact shared-finance and
   application revision IDs and numbers. Its steps are copied from those
   revisions, so later publications never rewrite execution history.
2. The existing finance transactional outbox is the delivery mechanism. Its
   row and run are created in the same platform transaction and correlated
   one-to-one. Claim, success, failure, backoff, and explicit retry update the
   outbox, run, and run steps together.
3. Delivery remains at least once. Applications deduplicate using the stable
   event ID and materialize with `create_missing`, preserving tenant overrides.
4. Console/API expose list, retrieve, failed-run retry, and scoped reconciliation
   operations. A retry reuses the run and increments attempt counters; it does
   not manufacture a new recipe revision or erase prior attempts.
   Standalone SaaS setup claims an application-only run and reports its atomic
   success or failure to Core; embedded apps complete through the finance
   outbox acknowledgement.
5. Each app owns a typed manifest adapter and database materializer. Core and
   Console never infer application schemas from live application databases.
   Console renders the code-owned catalog; the app consumes the published
   values using its public slug or stable app ID.
6. Billing stores document preferences independently for `INVOICE`, `QUOTE`,
   `ESTIMATE`, and `CREDIT_NOTE`. Defaults can therefore have different customer
   notes and terms. Subscriptions continue to generate invoices and use invoice
   preferences rather than receiving a duplicate document-preference category.
7. A missing Billing database connection is an environment/deployment concern:
   the Prisma migration is versioned in the app and must be deployed by the
   Billing release pipeline. It is never applied to the platform database.

## Reliability semantics

- Run status: `queued → processing → succeeded|failed`.
- Failed runs may return to `queued` through an explicit retry.
- A retry preserves the run's original trigger and immutable revision snapshot.
- Attempt counters are monotonic and error text is retained until a retry.
- A stale processing lock is reclaimable by the worker.
- Publishing or manual reconciliation compares desired state with current
  subscription state and only appends a new lifecycle event when the snapshot
  changed.
- Tenant-owned edits are never overwritten by a newer default revision.

This follows the transactional-outbox guidance for avoiding cross-service dual
writes and requiring idempotent consumers ([AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)).
The reconcile operation deliberately follows a desired-state control loop
instead of an imperative migration script ([Kubernetes controller model](https://kubernetes.io/docs/concepts/architecture/controller/)).
Stable event IDs provide the same safe-retry property described by
[Stripe's idempotency guidance](https://docs.stripe.com/api/idempotent_requests).

## Consequences

- Operators gain durable evidence, targeted retries, and drift repair without
  granting Console database access to product applications.
- Application teams must maintain a manifest adapter and an idempotent
  materializer for every resource type they register.
- Exact step-level success currently reflects the atomic delivery result: all
  steps succeed or fail together. A future app with genuinely long-running
  independent steps may add progress callbacks without changing manifest v1.
- Default changes affect new organizations and explicit reconciliation only;
  they do not silently replace tenant choices.
