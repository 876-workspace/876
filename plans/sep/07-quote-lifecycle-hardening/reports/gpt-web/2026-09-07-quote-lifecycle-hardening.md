# GPT Web Final Report — Quote Lifecycle Hardening

**Run:** `2026-09-07-quote-lifecycle-hardening`  
**Branch:** `feature/quote-lifecycle-hardening`  
**Original base:** `main@4f869314ff2b264d12bc5c07f1c9017392b55ad8`  
**Synced main:** `main@fdb78ba8f89624901ce78910bb4ced15c3ed7e20`  
**Result:** IMPLEMENTED — SYNCED WITH MAIN — UNVERIFIED  
**PR:** Not opened

## Executive summary

This run completed the quote lifecycle foundation on top of the invoice lifecycle / Payments Received / accepted-quote conversion work already merged before the branch was cut.

The implementation keeps Quote as a non-posting commercial proposal and deliberately separates three concepts that should not be collapsed into one enum:

1. **quote decision lifecycle** — draft, sent, accepted, declined, canceled, expired;
2. **communication evidence** — when a quote was first sent and when resend events occurred;
3. **conversion state** — whether the accepted quote has a linked invoice.

A converted quote remains `ACCEPTED`. The existing one-to-one `convertedInvoice` relationship is the durable evidence for a derived “Invoiced” presentation. No `INVOICED` quote status was added.

Conversion creates a **draft invoice only**. Acceptance does not create accounts receivable, and this run does not auto-finalize or auto-send invoices. No sales-order implementation was introduced.

The branch was subsequently synchronized with the latest `main` available at closeout, `fdb78ba8f89624901ce78910bb4ced15c3ed7e20`, through a real two-parent merge commit. The newer host-aware `@876/billing-ui` Link/provider architecture was preserved, and the new quote lifecycle UI was adapted to consume it instead of retaining a direct `next/link` dependency.

## Final domain model

Canonical quote lifecycle:

```text
DRAFT -> SENT
DRAFT -> ACCEPTED
DRAFT -> CANCELED
SENT  -> SENT            # resend, preserving first sentAt
SENT  -> ACCEPTED
SENT  -> DECLINED
SENT  -> CANCELED
DRAFT/SENT -> EXPIRED    # when expiresAt <= command time
```

Terminal decision states:

```text
ACCEPTED
DECLINED
CANCELED
EXPIRED
```

Conversion remains a separate dimension:

```text
Quote.status = ACCEPTED
Quote.convertedInvoice = null        -> accepted, not yet invoiced
Quote.convertedInvoice = Invoice     -> accepted and invoiced
```

This prevents commercial decision state from becoming entangled with invoice/accounting state.

## Important expiry decision

During implementation, the initial plan was corrected in one important way.

`expiresAt` determines whether an **open proposal** may still be accepted. A DRAFT/SENT quote whose expiry time has passed cannot be newly accepted. However, expiry does **not** retroactively invalidate a quote that was already accepted while valid.

Therefore:

```text
SENT + expired + not accepted -> cannot accept; may explicitly transition to EXPIRED
ACCEPTED + original expiresAt later passes -> still ACCEPTED; conversion remains allowed
```

This preserves the accepted commercial decision instead of allowing a proposal-validity timestamp to erase historical acceptance.

## Backend lifecycle implementation

### Canonical lifecycle helper

Added:

```text
apps/billing-api/src/modules/documents/quote-lifecycle.ts
```

This owns quote lifecycle action resolution, including:

- valid source statuses;
- target status;
- lifecycle timestamp field;
- expiry checks;
- resend behavior;
- preservation of the first send timestamp.

The service no longer needs an ad hoc quote transition table as the lifecycle source of truth.

### Transactional quote workflow

Added:

```text
apps/billing-api/src/modules/documents/workflows/transition-quote.ts
apps/billing-api/src/modules/documents/repositories/quote-workflow.ts
```

The workflow uses the same architectural ideas already established for invoice lifecycle commands:

- serializable transaction boundary;
- compare-and-set state transition;
- optional command idempotency;
- transactional outbox evidence;
- stable Billing application errors for invalid state;
- retryable transaction conflict handling.

### Lifecycle commands

Supported quote commands now include:

```text
send
accept
decline
cancel
expire
```

`send` is intentionally repeatable for a SENT quote. A resend records fresh communication evidence while preserving the original `sentAt` timestamp.

Terminal commands are safe to retry through command idempotency when a caller supplies the same idempotency key/request identity.

## Durable lifecycle evidence

### Prisma change

Modified:

```text
apps/billing-api/prisma/schema/quote.prisma
```

Added durable lifecycle timestamp fields required by the command/event model.

### Migration

Added:

```text
apps/billing-api/prisma/migrations/20260907232000_quote_lifecycle_timestamps/migration.sql
```

The migration is additive.

**The migration was written but was not executed by GPT Web.** It must be validated and applied by the local/orchestrator environment on the now-synced branch.

## Quote outbox events

Extended:

```text
apps/billing-api/src/modules/outbox/outbox.service.ts
```

The quote lifecycle now emits transactional outbox evidence for lifecycle commands, including send/accept/decline/cancel/expire operations.

This keeps asynchronous consumers separate from the mutation path while ensuring the event is committed with the quote state transition.

The implementation does not claim provider delivery. `quote.sent` is command/communication evidence, not proof that an email or external messaging provider successfully delivered the quote.

## Explicit quote-to-invoice conversion

### Intent-level command

Added the tenant command:

```text
POST /api/v1/quotes/:quoteId/convert-to-invoice
```

and matching organization integration command:

```text
POST /api/v1/integrations/organizations/:organizationId/quotes/:quoteId/convert-to-invoice
```

### Conversion behavior

The command:

1. retrieves the tenant-owned quote;
2. requires `Quote.status === ACCEPTED`;
3. returns the existing `convertedInvoice` when already present;
4. otherwise delegates to the existing quote-backed invoice creation implementation;
5. if a concurrent conversion wins the one-to-one relation race, re-reads the quote and returns the winning invoice as a replay.

This makes conversion naturally replay-safe even when the caller does not supply an idempotency key.

### What was intentionally not created

There is no second quote-copy service, no route-specific invoice builder, and no separate “converted invoice” data model.

The existing invoice repository remains the canonical implementation that snapshots the quote into a draft invoice.

## Conversion preference foundation

### Preference contract

Added organization-level quote conversion behavior:

```text
manual
draft-invoice-on-accept
```

Default:

```text
manual
```

### Storage ownership

The implementation reuses the existing Billing `ModulePreference` model rather than creating a new settings table.

The quote preference repository stores only the non-default override. `manual` is represented by absence of an override row, matching the existing module-preference pattern.

### Automatic acceptance conversion

When the preference is:

```text
draft-invoice-on-accept
```

successful quote acceptance creates one draft invoice through the same canonical conversion path.

The automatic behavior stops there.

It does **not**:

- finalize the invoice;
- create accounts receivable;
- send the invoice;
- claim delivery;
- create a sales order.

Those remain explicit future/domain commands.

## API and controller changes

Added the focused quote lifecycle router:

```text
apps/billing-api/src/modules/documents/quote-lifecycle.routes.ts
```

and registered it through the Billing HTTP route composition.

The focused route registry adds new command/preference surfaces without duplicating the existing document CRUD router.

Controller/service changes include:

```text
apps/billing-api/src/modules/documents/documents.controller.ts
apps/billing-api/src/modules/documents/documents.service.ts
apps/billing-api/src/modules/documents/index.ts
apps/billing-api/src/http/routes.ts
```

The service remains the domain boundary for:

- quote ownership lookup;
- lifecycle commands;
- conversion behavior;
- expired-draft mutation protection;
- quote conversion preference behavior.

## Expired quote mutation hardening

Expired DRAFT/SENT quotes are no longer protected only by UI action visibility.

The service boundary prevents stale expired proposals from continuing to behave like ordinary editable drafts. This matters for direct SDK/API callers and avoids relying on a browser to enforce commercial history.

Read paths do not mutate quote status automatically. Explicit `expire` remains the persisted lifecycle command.

## Billing SDK

Updated tenant quote resource:

```text
packages/billing/src/resources/quotes.ts
```

Added/standardized quote lifecycle methods including:

```text
quotes.send(...)
quotes.accept(...)
quotes.decline(...)
quotes.cancel(...)
quotes.expire(...)
quotes.convertToInvoice(...)
```

Added quote preference contract/schema exports:

```text
packages/billing/src/types/quote-preference.ts
packages/billing/src/types/quote-preference.schema.ts
packages/billing/src/index.ts
```

Updated Billing settings catalog with the quote conversion preference definition.

## Integration SDK parity

Updated:

```text
packages/billing/src/integration/resources/quotes.ts
```

Organization integrations now have quote lifecycle/conversion parity through the formal Billing boundary.

Command methods accept the existing integration idempotency options and forward `Idempotency-Key` instead of creating a parallel retry mechanism.

This is important for Invoice and future product apps consuming Billing as an engine.

## Shared Billing / Invoice UI

### New shared quote action surface

Added:

```text
packages/billing-ui/src/quote-lifecycle-actions.tsx
packages/billing-ui/src/quote-lifecycle-actions.test.tsx
```

and exported it from `packages/billing-ui/package.json`.

The shared component owns presentation rules for:

- Send;
- Accept;
- Decline;
- Cancel;
- Mark expired;
- Convert to invoice;
- View invoice;
- Edit valid draft;
- Delete valid draft.

It deliberately does **not** own authentication, authorization resolution, API transport, organization lookup, route policy, navigation, or refresh behavior. Those remain host responsibilities.

### Billing host adapter

Updated:

```text
apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/_components/quote-actions.tsx
apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/page.tsx
apps/billing/src/lib/client/quotes.ts
```

Billing supplies host-owned callbacks and links to the shared lifecycle UI.

### Invoice host adapter

Updated:

```text
apps/invoice/src/app/(app)/quotes/[quoteId]/_components/quote-actions.tsx
apps/invoice/src/app/(app)/quotes/[quoteId]/page.tsx
apps/invoice/src/lib/client/documents.ts
```

Invoice continues to use its same-origin proxy/application boundary while sharing lifecycle presentation with Billing.

The previous duplicated action implementations were substantially removed rather than allowed to drift independently.

### Reconciliation with latest main Link architecture

After the initial quote implementation, `main` introduced a host-aware navigation abstraction in `@876/billing-ui`:

```text
packages/billing-ui/src/link.tsx
apps/invoice/src/components/providers/link-provider.tsx
```

with corresponding Billing/Console host providers and conversions of existing Billing UI components away from direct `next/link` imports.

That work was preserved during synchronization. The quote lifecycle action component was adapted from direct `next/link` use to:

```ts
import { Link } from './link'
```

so it participates in the same host-supplied router-aware Link contract as the rest of the package.

The package manifest was structurally merged so both exports are present:

```text
@876/billing-ui/link
@876/billing-ui/quote-lifecycle-actions
```

No upstream host-link/provider work was intentionally replaced by the quote branch.

## UI bug found during final review

A final compatibility review found a real logic bug in the initial shared component:

```text
canExpire = isExpired && mutable
mutable = !isExpired && (...)
```

which made `canExpire` unreachable.

This was corrected before closeout so expired DRAFT/SENT quotes can expose the intended `Mark expired` command.

## Tests added as code

Added/updated focused tests across:

```text
apps/billing-api/src/modules/documents/quote-lifecycle.test.ts
apps/billing-api/src/modules/documents/__tests__/documents.service.transitionQuote.test.ts
apps/billing-api/src/modules/documents/documents.service.test.ts
packages/billing/src/resources/__tests__/quote-lifecycle.test.ts
packages/billing-ui/src/quote-lifecycle-actions.test.tsx
```

Coverage drafted includes:

- legal/illegal lifecycle transitions;
- manual DRAFT acceptance;
- resend semantics;
- expiry transition rules;
- accepted quote conversion;
- non-accepted conversion rejection;
- conversion after an already-valid acceptance even when the original expiry later passes;
- existing-invoice replay;
- concurrent duplicate conversion recovery;
- SDK paths/methods;
- shared UI action visibility;
- Mark expired presentation.

These tests were **not executed** in this environment.

## Documentation

Added:

```text
apps/billing/docs/quote-lifecycle.md
```

The document explains:

- Quote as a non-posting proposal;
- decision lifecycle;
- expiry behavior;
- send/resend evidence;
- conversion relation semantics;
- conversion replay behavior;
- automatic draft conversion preference;
- the separation between acceptance, invoice creation, invoice finalization, and delivery.

The implementation tracker is:

```text
plans/2026-09-07-quote-lifecycle-hardening/plan.md
```

## Compatibility / scope review

Final review confirms:

1. **No `INVOICED` QuoteStatus** was added.
2. **No sales-order model or workflow** was added.
3. **No automatic invoice finalization** was added.
4. **No automatic invoice send/delivery claim** was added.
5. **No second quote-to-invoice copy implementation** was added.
6. **No second quote preference table** was added.
7. Existing one-to-one `convertedInvoice` evidence remains authoritative.
8. Invoice finalization remains the accounting/AR boundary.
9. Host applications continue to own authorization and same-origin transport.
10. Shared UI remains product-domain presentation, not service/API ownership.
11. Quote lifecycle events use the existing transactional outbox architecture.
12. Preference persistence follows the existing ModulePreference pattern.
13. Latest-main Billing UI Link/provider architecture is preserved.
14. Quote lifecycle UI now uses the same package-local host-aware Link contract.

## Latest-main synchronization completed

The branch was originally cut from:

```text
main@4f869314ff2b264d12bc5c07f1c9017392b55ad8
```

During the run, `main` advanced by six commits to:

```text
main@fdb78ba8f89624901ce78910bb4ced15c3ed7e20
```

Those changes were incorporated with a **real two-parent merge commit**:

```text
707c742782f2b4670085cee393dd7c910bf3db8f
chore: sync quote lifecycle branch with main
```

The synchronization preserved upstream changes including:

```text
apps/billing/src/components/providers/providers.tsx
apps/console/src/components/providers/providers.tsx
apps/invoice/src/app/layout.tsx
apps/invoice/src/components/providers/link-provider.tsx
packages/billing-ui/src/link.tsx
packages/billing-ui/src/link.test.tsx
packages/billing-ui/src/invoice-lifecycle-actions.tsx
```

and the other shared Billing UI host-link migrations in those upstream commits.

The quote-specific reconciliation was committed as:

```text
22603ff59dc1ba7d8100228c044930dc9e8707b9
fix(billing-ui): reconcile quote actions with host links
```

The package export reconciliation was committed as:

```text
7acd507227166de7a395ba1ec147b50ff237e0fc
fix(billing-ui): restore quote lifecycle export after main sync
```

At the synchronization checkpoint, GitHub reported:

```text
base: main@fdb78ba8f89624901ce78910bb4ced15c3ed7e20
status: ahead
ahead_by: 48
behind_by: 0
merge_base: fdb78ba8f89624901ce78910bb4ced15c3ed7e20
```

Therefore the previously documented rebase requirement has been resolved for those main changes. The branch is synced with that main commit but remains **unverified**.

## Verification status

GPT Web has no shell/test-runner/database execution in this workflow, so the following were **NOT RUN**:

- Prettier/formatting;
- ESLint;
- TypeScript typecheck;
- Vitest;
- dependency-cruiser/boundary checks;
- Billing API build;
- Billing app build;
- Invoice app build;
- Prisma validate/generate;
- migration application;
- database drift checks;
- API contract generation/check;
- browser/manual verification;
- CI.

No statement in this report should be read as claiming those checks pass.

## Required local verification

Run the repository's current equivalents of:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
```

Then validate/apply the quote lifecycle timestamp migration using the repository's normal Billing database workflow.

## Suggested manual scenarios

At minimum verify these end-to-end in Billing and Invoice:

1. create DRAFT quote -> edit/delete remain available;
2. send DRAFT -> status SENT, first `sentAt` recorded;
3. resend SENT -> status remains SENT, first `sentAt` preserved;
4. manually accept valid DRAFT;
5. accept valid SENT;
6. attempt acceptance after `expiresAt` -> rejected;
7. explicitly mark expired DRAFT/SENT -> EXPIRED;
8. accepted quote -> convert -> one DRAFT invoice linked;
9. repeat conversion -> same invoice returned;
10. accepted quote whose original expiry later passes -> conversion still succeeds;
11. `manual` preference -> acceptance does not create invoice;
12. `draft-invoice-on-accept` -> acceptance creates exactly one DRAFT invoice;
13. automatic conversion does not finalize or send invoice;
14. converted quote shows View invoice and no second conversion action;
15. Invoice host commands pass through the formal Billing integration boundary;
16. expired quote cannot be edited/deleted through direct API/SDK calls;
17. Billing and Invoice quote navigation uses the host-aware Billing UI Link provider after the main sync.

## Deliberate deferrals

The following remain future work rather than gaps accidentally omitted from this run:

- automatic accepted-quote -> sales-order conversion;
- sales-order domain/model;
- auto-finalize-on-accept;
- auto-send-on-accept;
- provider-backed quote email/delivery workflow;
- quote delivery/view/open tracking;
- richer quote timeline/history read API;
- partial conversion or multiple invoices from one quote;
- revision/version lineage for post-send quote amendments;
- scheduled batch expiry worker (the explicit expiry command foundation now exists);
- new quote-specific persisted permission catalog beyond current sales/integration authorities.

## Final handoff

Implementation work for the scoped quote lifecycle hardening is complete in `feature/quote-lifecycle-hardening`, and the branch contains the latest `main` changes available at the synchronization checkpoint.

The next local agent should **not redesign the lifecycle**. Its job is to:

1. run formatting/typecheck/lint/tests/build/boundaries/Prisma/API-contract checks on the synced branch;
2. apply/validate the new migration in the intended database environment;
3. fix only concrete failures found by those checks;
4. perform the manual scenarios above;
5. then prepare focused PR(s) according to the repository's normal branch/PR workflow if requested.

No PR was opened in this run.