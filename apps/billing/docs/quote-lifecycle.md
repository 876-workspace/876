# Quote lifecycle

876 Billing owns the durable quote lifecycle used by Billing, Invoice, and product integrations. A quote is a **non-posting commercial proposal**: creating, sending, accepting, declining, canceling, or expiring a quote does not create accounts receivable and does not move cash.

## Two independent dimensions

Do not overload `QuoteStatus` with invoice state.

### Decision lifecycle

The persisted quote decision status is:

```text
DRAFT -> SENT
DRAFT -> ACCEPTED
DRAFT -> CANCELED
SENT  -> ACCEPTED
SENT  -> DECLINED
SENT  -> CANCELED
DRAFT/SENT -> EXPIRED when expiresAt <= now
```

`ACCEPTED`, `DECLINED`, `CANCELED`, and `EXPIRED` are terminal decision states.

Manual/internal acceptance from `DRAFT` is supported because the commercial decision can be recorded even when delivery happened outside 876. `SENT` remains useful communication evidence, but sending is not a prerequisite for a manually recorded acceptance.

### Conversion lifecycle

Conversion is represented by the existing one-to-one relation:

```text
Quote.convertedInvoice -> Invoice
```

A quote whose `convertedInvoice` is present may be presented as **Invoiced**, but its quote decision status remains `ACCEPTED`. Do not add `INVOICED` to `QuoteStatus` merely to represent this relation.

## Expiry

`expiresAt` defines the decision window for an unaccepted proposal.

- Before `expiresAt`, an eligible draft/sent quote may be sent, accepted, declined, or canceled according to the transition table.
- At or after `expiresAt`, a `DRAFT` or `SENT` quote is frozen. Its only lifecycle advancement is the explicit `expire` command.
- Reads do not mutate a quote just because wall-clock time has passed. The UI may derive that a draft/sent quote is awaiting expiry persistence and offer **Mark expired**.
- An accepted quote is not retroactively invalidated when its old proposal expiry time later passes. `ACCEPTED` is terminal evidence that the proposal was accepted during its decision lifecycle and may still be converted later.

This distinction avoids a time-of-read mutation and prevents an already accepted commercial agreement from becoming unconvertible merely because the original quote expiry date passed afterwards.

## Durable timestamps

Quote lifecycle evidence includes:

- `sentAt` — first recorded send time. Resending preserves the original timestamp.
- `acceptedAt`
- `declinedAt`
- `canceledAt`
- `expiredAt`

A resend while the quote is already `SENT` records a fresh `quote.sent` outbox event but preserves the first `sentAt`.

## Lifecycle events

The lifecycle workflow writes quote state and a transactional outbox event together for:

- `quote.sent`
- `quote.accepted`
- `quote.declined`
- `quote.canceled`
- `quote.expired`

These events are durable integration/audit evidence. They are not themselves a user-facing timeline API.

## Command idempotency

Quote lifecycle commands use the Billing command-idempotency plane when an `Idempotency-Key` is supplied.

Rejected quote transitions roll back their command claim, so a failed validation or concurrent state change does not leave the key permanently in progress.

Terminal decisions are also semantically retry-safe:

- accepting an already accepted quote succeeds as a replay;
- declining an already declined quote succeeds as a replay;
- canceling an already canceled quote succeeds as a replay;
- expiring an already expired quote succeeds as a replay.

Sending is intentionally different: sending an already-sent quote represents a resend and therefore creates new communication evidence.

## Quote to invoice conversion

The intent-level API is:

```text
POST /api/v1/quotes/:quoteId/convert-to-invoice
```

The equivalent organization-integration route is available beneath the Billing integration namespace.

Conversion rules:

1. The quote must belong to the calling tenant.
2. The quote must be `ACCEPTED`.
3. An existing `convertedInvoice` is returned as a successful replay.
4. Otherwise Billing delegates to the canonical quote-backed invoice creation implementation.
5. The created invoice is `DRAFT`.
6. The one-to-one quote relation prevents a second invoice from being created for the same quote.
7. A concurrent duplicate conversion is resolved by re-reading the relation and returning the winning invoice.

Conversion does **not** finalize, send, post, or collect the invoice. Invoice finalization remains the accounting boundary that creates receivables.

Organization integration acceptance and conversion require `Idempotency-Key` and preserve the invoking app's attribution when creating an invoice, including automatic draft creation after acceptance. This keeps the invoice visible through that app's scoped invoice reads. The conversion payload hash includes the quote ID, so reusing a key for a different quote cannot replay the wrong invoice. Tenant commands remain unattributed and accept optional command keys.

## Accepted-quote conversion preference

The `quotes` module declares the preference:

```text
accepted-quote-conversion
```

Supported values:

- `manual` — default. Acceptance only records the decision.
- `draft-invoice-on-accept` — after acceptance, ensure one linked draft invoice exists.

The preference uses the existing tenant `ModulePreference` plane. The default is represented by the absence of an override row; selecting `manual` removes the stored override.

Automatic conversion deliberately stops at a **draft** invoice. This preference does not auto-finalize or auto-send because quote acceptance must not silently cross the accounting boundary or claim provider-backed delivery.

The acceptance and convenience conversion are retry-safe but are separate transactions. If draft creation fails after acceptance, retrying the acceptance command can repair the missing conversion because acceptance is a semantic replay and the preference is re-evaluated.

## Editing and deletion

- A valid `DRAFT` quote may be edited or deleted.
- A draft whose `expiresAt` has passed is frozen and must be expired rather than edited or deleted.
- `SENT`, `ACCEPTED`, `DECLINED`, `CANCELED`, and `EXPIRED` quotes are historical commercial records and are not casually rewritten.
- After conversion, changes belong on the draft invoice rather than by rewriting the accepted quote.

Both the shared UI and Billing service enforce these restrictions. Backend rules remain authoritative.

## Shared UI ownership

`@876/billing-ui/quote-lifecycle-actions` owns lifecycle action presentation for Billing and Invoice. Host apps retain:

- authorization/capability checks;
- same-origin or integration transport;
- route construction;
- navigation and refresh behavior.

This keeps lifecycle UX consistent without moving app-specific security or transport concerns into the shared UI package.

## Deliberate non-goals

This lifecycle work does not introduce:

- sales orders;
- `INVOICED` as a persisted quote status;
- automatic invoice finalization;
- automatic invoice delivery;
- a user-facing quote timeline/read model;
- provider email/SMS delivery for quote sends.

Those capabilities require their own product and accounting decisions rather than being inferred from quote acceptance.
