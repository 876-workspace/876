# Payment instruments

876 Billing stores a payment method as non-secret display metadata and keeps its
credential separate. Create a method for a customer, optionally make it their
default, then create and confirm a payment intent against it.

## Credential storage

- `provider_token` is preferred when the processor tokenizes the instrument.
  Billing stores only that processor token reference.
- `vault` is for a processor without tokenization. The supplied PAN or bank
  account number is sealed immediately with the tenant- and method-bound secure
  field provider, then discarded.
- `none` applies only to a manual method such as cash, bank transfer, cheque,
  wire, mobile money, point of sale, or cash deposit.

Payment methods persist display metadata such as last four digits, card brand,
expiry, and masked routing information. Billing never stores full card numbers
outside the sealed credential, card verification digits, PIN data, track data,
or a provider client secret.

## Payment intent lifecycle

```text
REQUIRES_PAYMENT_METHOD -- attach method --> REQUIRES_CONFIRMATION
REQUIRES_CONFIRMATION -- confirm --> PROCESSING -- provider result --> SUCCEEDED
                                  \-- manual method -------------> SUCCEEDED
PROCESSING -- action needed --> REQUIRES_ACTION
REQUIRES_CAPTURE -- capture --> SUCCEEDED
any non-terminal state -- cancel --> CANCELED
```

Until a processor adapter is available, non-manual confirmation records that the
intent is processing but cannot complete collection. A successful payment
snapshots only the payment method's safe display metadata.

## The HTTP surface

Payment methods are created at `POST /api/v1/organizations/:organizationId/payment-methods` and always belong to a customer. The request includes display metadata and one credential storage choice: `provider_token` stores an already-tokenized processor reference; `vault` immediately seals the supplied card or bank-account number; `none` is only for manual methods.

The API never stores or returns card authentication values, PIN data, track data, plaintext account numbers, or sealed credential values. Detaching a method revokes and clears its credential and returns a tombstone.

Payment intents use `/api/v1/organizations/:organizationId/payment-intents` with retrieve, confirm, capture, and cancel actions. Creation is idempotent through `Idempotency-Key`.

```text
requires_payment_method -> requires_confirmation -> succeeded (manual method)
                                              \-> processing (provider method)
requires_capture -> succeeded
earlier states -> canceled
```
