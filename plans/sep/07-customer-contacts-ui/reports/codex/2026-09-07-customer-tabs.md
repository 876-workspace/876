# Customer record tab capability audit

## Result

No customer-tab wiring was added. The available contracts do not supply the
data required by the existing shared panels, so wiring them would require
inventing values or collapsing failures into successful empty states.

No branch or commit was created. The task instructions conflict on branching;
the explicit `Do not ... branch` instruction was followed.

## Verified capabilities

- `@876/billing` does expose `customers.account(customerId)`.
- Its `CustomerAccount` contract contains `currency`, `lifetimeBilled`,
  `lifetimePaid`, `outstandingReceivable`, `availableCredit`, `netPosition`,
  and `statement` rows. It does **not** contain the statement panel's
  `openingBalance` and `closingBalance`, or the receivables panel's `overdue`.
- The owning Billing API currently returns a different account shape
  (`outstandingReceivable`, `unusedCredits`, and `entries`), which does not
  match the SDK schema. This must be reconciled in the data plane before a
  host can faithfully use the account resource.
- `@876/billing` has no typed subscription listing operation. Billing's legacy
  compatibility facade has a workspace-wide list, but no customer-scoped typed
  operation and it throws client errors; it cannot meet the required error-state
  contract.
- No customer-scoped CRM requests resource or customer correspondence/mail
  resource exists. The only CRM requests use found are support requests scoped
  to an organization.
- No customer activity/timeline resource exists. A `CustomerTimelineEntry[]`
  cannot be resolved truthfully from the available contracts.
- Billing can resolve platform organization data through its existing private
  customer-party helper, but Invoice has no equivalent typed platform data
  source. The full organization panel shape (`name`, `slug`, `members`,
  `status`) is therefore not available in both hosts.

## Tabs

- Statement: left unchanged in Billing and Invoice; account projection is
  insufficient and currently inconsistent with its API implementation.
- Activity: left unchanged in Billing and Invoice; no timeline capability.
- Overview receivables, billing facts, and organization panels: left unchanged;
  receivables and cross-host organization data are unavailable as described
  above.
- Subscriptions: left unchanged in Billing; no typed, customer-scoped list
  capability.
- Requests and Mails: left unchanged in both apps; no customer-scoped backing
  resources.

## Tests

Added `it()` cases: **0**. Adding the requested host tests without working data
contracts would test invented mappings rather than product behaviour.

## Verification attempted

`pnpm --filter @876/billing-ui typecheck` completed successfully (`tsc
--noEmit`).

The requested Billing UI test command was started three times. In this runner
it did not complete before the command runner returned control; its only output
was:

```
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/billing-ui

Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document
```

Consequently the remaining requested verification commands were not claimed as
green and were not run after that non-completing test command.
