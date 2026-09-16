# GPT-Web Final Report — 876 Banking Foundation

**Date:** 2026-09-12  
**Branch:** `feature/banking`  
**Run:** `plans/sep/12-banking-foundation`  
**Outcome:** implementation complete; local verification pending  
**PR:** not opened

## Summary

I reviewed the existing `feature/banking` work against `main`, re-read the repository operating rules, and completed the statement-first Banking implementation without changing the intended bounded contexts.

The final direction is Caribbean-first rather than feed-first. Banking is usable from uploaded statement evidence even when an institution offers no aggregation API. Live feeds remain a later ingestion adapter into the same `BankStatementLine` pipeline.

Core API remains the owner of shared financial-institution reference data. Billing owns tenant financial accounts and banking activity and stores opaque Core bank/branch identifiers only.

## Important defects found and corrected during final review

### 1. The Jamaica catalog was not actually reproducible on a fresh database

The branch already contained a versioned Jamaica routing catalog and seed path, but the seed could only enrich branches that already existed because `BankBranch` required a geocoded `DirectoryAddress`.

That meant a fresh database could seed bank rows yet still return an empty or incomplete branch selector unless another process had already created branch locations. It also created pressure to invent coordinates just to persist authoritative transit/routing data.

Correction:

- made `BankBranch.addressId` / `directoryAddress` optional;
- added an additive Core migration dropping `bank_branches.address_id` NOT NULL;
- updated Core API contracts/serializers for routing-only branches;
- changed the financial-directory seed to create missing routing branches with bank ID, branch name, transit, and routing number even when no trusted structured location exists;
- preserved source free-form addresses in the versioned catalog rather than manufacturing structured coordinates;
- kept tombstoned reference rows from being silently resurrected;
- added focused seed/catalog regression coverage.

The resulting model is:

```text
Country
  -> Bank
      -> BankBranch
          -> optional DirectoryAddress
```

This is a better global abstraction: routing identity is authoritative financial reference data; physical/geocoded location is independently enrichable reference data.

### 2. Core financial-directory tests were stale after the country-aware Bank change

The older route suite still expected the pre-country Bank response and did not mock the new country lookup path.

Correction:

- added country repository mocks;
- updated Bank fixtures/responses with `country_code`, `clearing_system`, and `institution_type`;
- added `country_code` listing coverage;
- updated duplicate-code expectations to be country-scoped;
- repaired the PATCH lookup sequence for the new service behavior;
- added routing-only branch serialization coverage.

These tests were authored/updated but not executed from the connector environment.

### 3. Billing account setup did its initial directory load in a client mount effect

The branch had a functional bank selector, but first-load bank options were fetched from a client `useEffect`, which conflicts with the repository's server-first host data-loading rules.

Correction:

- `/banking/new` server-loads Jamaica bank options through the request-scoped Billing SDK;
- account edit server-loads banks and the current bank's branch list;
- the form receives those initial values;
- browser fetching remains only for the genuinely interactive dependency: selecting a different bank and loading its branches.

### 4. Statement mapping UI exposed less than the server contract and could retain a stale preview

The server parser already supported configurable decimal/thousands separators and an external transaction ID mapping, but the UI did not expose all of them. More importantly, a user could preview one mapping, alter the mapping, and still have the old preview object available for import.

Correction:

- added decimal-separator mapping;
- added thousands-separator mapping;
- added external/bank transaction ID mapping;
- retained date, amount layout, positive direction, description, payee, reference, and running-balance mapping;
- changing the file, format, or mapping now invalidates the preview immediately.

The server still reparses the source on import, so client preview state is never the accounting authority.

### 5. Statement evidence first-load behavior was client-only

The statement workspace fetched its first rows after mount. It now receives server-loaded evidence from the account page. Client reloads remain for post-mutation refresh only.

This keeps the product loading model consistent while preserving `BankStatementLine` as external evidence separate from booked `BankTransaction` cash.

### 6. The account page linked to a reconciliation route that did not exist

`/banking/:accountId` exposed a Reconcile action pointing to `/banking/:accountId/reconcile`, but that route had not been implemented.

Correction:

- added the reconciliation page and workspace;
- server-loads the account, enabled currency metadata, booked bank transactions, and reconciliation history;
- selects booked transactions within a statement period;
- parses opening/closing balances through exact minor-unit string arithmetic (`parseDecimalToMinorUnits`) rather than floating point;
- creates reconciliation drafts through the existing Banking API;
- exposes completion only when the reported difference is zero in the UI, while the server remains authoritative;
- exposes reopen through the canonical API, preserving the server's later-period guard.

The final cleanup also removed an unnecessary non-null assertion from this flow.

## Final architecture

### Core reference plane

Core owns:

- countries;
- banks/institutions;
- bank branches;
- country/clearing-system routing metadata;
- versioned authoritative reference catalogs;
- optional trusted branch-location enrichment.

A bank code is unique within a country, not globally.

### Billing financial plane

Billing owns:

- tenant bank accounts;
- opaque references to Core bank/branch identity;
- canonical booked bank transactions;
- imported statement evidence;
- imports/dedupe;
- matching/unmatching;
- supported categorization;
- transfers;
- rules/recognition;
- reconciliation.

There are no cross-database foreign keys between Billing and Core.

### Evidence boundary

`BankStatementLine` is external evidence. `BankTransaction` is canonical booked cash. Importing a statement does not itself create receivables or booked cash. Matching connects evidence to existing cash; categorization creates only supported canonical Banking operations and then links the evidence.

This separation is intentionally preserved for future payment/refund/expense integrations so Banking cannot double-book financial activity owned elsewhere.

## Jamaica reference model

The versioned catalog represents Jamaica-specific clearing facts in the reference layer rather than hard-coding them into generic Billing logic:

- 3-digit institution/bank code -> `Bank.bankCode`;
- 5-digit branch transit -> `BankBranch.transitNumber`;
- published 9-digit routing/ABA value -> `BankBranch.routingNumber`;
- check-digit composition -> catalog validation rule;
- branch physical/geocoded address -> optional, separately trusted `DirectoryAddress` enrichment.

The catalog provenance already records the authoritative source references and revision. The design also leaves room for other countries to use different institution/branch/routing conventions while retaining the same conceptual `Country -> Bank -> Branch` directory.

## Product flows now present

- bank-account create/edit with Core-backed bank and branch selection;
- server-first initial directory options;
- manual booked bank transactions;
- CSV/TSV statement file selection;
- explicit statement mapping and preview;
- server-side reparse/import;
- statement evidence inbox;
- deterministic match candidate lookup;
- match/unmatch;
- manual deposit/withdrawal categorization;
- exclude/restore;
- account books/bank balance presentation;
- reconciliation draft/history/complete/reopen workflow;
- Banking SDK resources for the underlying engine.

## Deliberately deferred scope

The following are follow-up product work rather than blockers for this run:

- live bank-feed providers;
- PDF/OCR ingestion;
- OFX, QIF, CAMT and MT940 adapters;
- saved statement mapping profiles;
- host upload of the original statement binary to 876 Storage (the API already accepts an opaque `sourceFileId`);
- trusted geocoded enrichment of routing-only branch rows;
- additional country catalogs and country-selection UX;
- categorization actions owned by Payments, Refunds, fees/interest, or future Expense CRUD;
- rule authoring/preview UX and broader auto-categorization rollout;
- reconciliation export/reporting;
- full bank-account-number storage/display until the sensitive-data policy is explicit.

## Verification status

No local verification was executed from GPT-Web. Per repository operating rules, I did **not** run or claim results for:

- Prisma generation;
- Prisma validation or drift checks;
- migration application;
- typecheck;
- lint;
- tests;
- builds;
- API contract verification;
- route smoke tests.

The branch contains authored/updated regression tests, but their presence is not a passing-test claim.

## Required local merge gate

The local orchestrator should:

1. generate/validate both Prisma clients and run drift checks;
2. apply the Core country-aware bank migration, Core optional-branch-location migration, and Billing Banking migrations to disposable databases;
3. run Core API typecheck/lint/tests/build;
4. run Billing API typecheck/lint/boundaries/tests/build/API contract checks;
5. run `@876/billing` typecheck/tests;
6. run Billing app typecheck/lint/build;
7. smoke account create/edit, statement import, account statement workspace, manual transactions, and reconciliation routes;
8. repair only demonstrated failures while preserving the statement-evidence/booked-cash split and Core/Billing ownership boundary;
9. record exact command results before merge.

## Final state

The implementation work requested for this run is complete on `feature/banking`. The branch should now be treated as **implementation complete, verification pending**, not as already verified or merge-ready.

No pull request was opened by GPT-Web.
