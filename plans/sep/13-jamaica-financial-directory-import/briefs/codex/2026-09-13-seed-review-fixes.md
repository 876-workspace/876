# Brief: financial-directory seed review fixes

Branch `feature/jamaica-financial-directory-import` (uncommitted work in tree). Do not commit, do not create branches, do not write log files.

File scope ONLY:

- apps/api/src/seeds/financial-directory.repository.ts
- apps/api/src/seeds/financial-directory.ts (only if needed)
- apps/api/src/seeds/financial-directory.test.ts

## Fix 1 — adopt pre-existing credit unions instead of duplicating

Credit unions can already exist (created via `POST` directory routes) with `code = null`.
`upsertSeedCreditUnion` looks up only by `code`, so a reseed creates a duplicate.
When no row matches `code`, look for exactly one row with `code: null` whose `name`
matches case-insensitively (`mode: 'insensitive'`), deleted or not. If found, update it
(setting `code` plus fields) and report it like any existing row (tombstone preserved:
`deleted: row.deletedAt !== null`). If more than one matches, throw an Error naming the
code and the ambiguity — do not pick a winner. Otherwise create as today.
Apply the same adoption to `upsertSeedCreditUnionBranch`, scoped to the same
`creditUnionId` + name.

## Fix 2 — a catalog null never clears stored data on update

On the UPDATE path of bank, bank branch, credit union and credit-union branch upserts,
omit enrichment/contact/provenance fields whose catalog value is `null` (website, phones,
emails, contactUrl, rawAddress, contactNumber, operatingHours, branchType, status,
sourceUrl, sourceAsOf, lastVerifiedAt, headquarters, shortName). Identity fields
(name, routingNumber, clearingSystem, institutionType) keep current behavior.
Create path unchanged. One small local helper for dropping nulls is fine; no new module.

## Tests (required, ≥6 new `it()`)

Follow existing mock style in financial-directory.test.ts. Cover: adopt codeless CU by
name; adopt codeless CU branch; ambiguous match throws and creates nothing; adopted
tombstoned CU reported deleted; update with null catalog field does not send that key;
update with non-null value does send it. Use `toHaveBeenCalledWith` exact args.

No eslint-disable, ts-ignore, or `as any`.

## Verify (run all, fix failures)

cd apps/api && pnpm typecheck && pnpm lint && pnpm vitest run src/seeds/financial-directory.test.ts

Finish with a short summary: files changed, tests added (count), command results.
