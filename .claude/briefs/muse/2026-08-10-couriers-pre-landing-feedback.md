# Muse feedback pass — couriers extraction, pre-landing review

You are the adversarial reviewer for a feature branch about to be committed,
pushed, and merged. Your job is to **find defects and argue against the
decisions**, not to agree. Be specific and cite `file:line` for every claim.

## Read-only constraints (absolute)

- **Do NOT run any command.** Every command you try will fail in this
  container (your sandbox cannot create namespaces). Do not attempt bash,
  pnpm, git, or anything else — analysis is filesystem-reads only.
- **Do NOT edit or create any file.** This is a review pass.
- If you find a defect, say exactly what breaks, when (which call path), and
  what the correct fix is. Severity per finding: blocker / should-fix /
  nit.

## Context

The monorepo is extracting the couriers product: an Express API
(`apps/couriers-api`) owns the database; `packages/couriers` is the typed
client (admin + integration + portal/session tiers); `apps/couriers` (the
Next app) migrated its BFFs from a local Prisma service layer
(`apps/couriers/src/lib/service/**` — now deleted) onto the SDK. The
working tree on branch `feat/couriers-api` is the integrated result,
currently uncommitted. All commits already landed in the PR stack are the
base; the uncommitted working tree is what is about to ship.

Everything below was verified locally: API 321 tests, SDK 139 tests, app
626 tests, all typechecks, lints, both dependency-cruiser boundary gates,
frozen-lockfile install. So do not report "run the tests"; look for what
the tests do not cover.

Reference doc of intent: `docs/couriers-extraction-status.md` and
`docs/couriers-extraction.md`.

## The five areas we want you to argue

1. **Portal enrollment atomicity.** The API's `enrollCustomer`
   (`apps/couriers-api/src/modules/customers/customers.service.ts`) now
   creates-or-revives the customer profile and primary mailbox "atomically";
   the Next app previously owned that race
   (`apps/couriers/src/lib/service/customer-profiles/create.ts` at base
   commit; now deleted). The app-side caller is
   `apps/couriers/src/lib/portal/enroll.ts`. Question: is the API write
   actually transactional (single Prisma transaction covering the
   `upsert`/`create` of both the profile row and the mailbox row with the
   non-reserving allocation `POST /tenants/:tenantId/mailboxes/allocations`
   semantics — allocate-then-insert, P2002 race retried)? Trace the exact
   code and argue whether the "first free prefixed number without
   reserving" contract can now be violated by TWO separate transaction
   participants (the profile create and the mailbox insert) and whether the
   P2002 re-allocation loop actually exists on the write path that
   enrollment uses.

2. **Customer soft-delete semantics.** `customers.service.ts` / repository
   gained a delete that tombstones. Check what the portal revive path does:
   `apps/couriers/src/lib/portal/enroll.ts` claims enrollment "revives" a
   deleted profile. Can a deleted (soft-deleted) customer be revived by a
   different user than the original? Is there a uniqueness constraint
   (`CourierCustomerProfile.userId`-scoped per tenant?) that would block
   the revive with a P2002 that the retry loop swallows into a 409? Read
   the service code and the Prisma schema
   (`apps/couriers-api/prisma/schema/customer.prisma`).

3. **Cursor contracts.** `customers`, `packages` lists take mutually
   exclusive `starting_after`/`ending_before` anchored on the
   `(created_at, id)` ordering (see the merged base commits), and the SDK
   admin resources were aligned with them in the working tree
   (`packages/couriers/src/admin/types/customer.schema.ts`,
   `packages/couriers/src/admin/types/package.schema.ts` — note the package
   list schema is under `admin/types/`; verify the SDK's `limit` upper
   bound and cursor handling match the API's Zod schemas field for field).
   Also the tenant mailbox list `(is_primary, created_at, id)` tuple and
   the `tenant-mailboxes-list` operationId. Argue the SDK↔API parity:
   are there response fields the SDK parses strictly (zod) that the API can
   omit (e.g. nullable `mailboxPrefix`, `orgId`) and that would therefore
   fail client validation in production?

4. **The app migration closed the fetch gap, but did it change behavior?**
   `apps/couriers/src/lib/couriers.ts` (the `$couriers` singleton),
   `apps/couriers/src/lib/portal/tenant.ts`, `.../customer.ts`,
   `.../client.ts`, `apps/couriers/src/lib/manage/customers.ts`, and the
   BFF routes under `apps/couriers/src/app/api/manage/**` and
   `.../api/portal/**`. Compare against the deleted service layer
   (`git show <base>:apps/couriers/src/lib/service/...`) for: error
   envelope shape changes (the app previously surfaced `{data,error}` from
   its own service; the SDK returns `{data, error}` too — are the error
   codes mapped so pages still branch on the same string tokens?),
   pagination parameters that used to default differently, and any place
   where the app now makes an EXTRA request (N+1 introduced) or drops a
   tenant-scoping filter that used to exist.

5. **Auth tier discipline.** The API session tier verifies RS256 JWTs from
   the platform JWKS with a bounded cache, pinned issuer/audience,
   `token_use: 'access'` only, no fail-open
   (`apps/couriers-api/src/http/auth/guards.ts`,
   `apps/couriers-api/src/platform/jwt.ts` if present, config in
   `apps/couriers-api/src/config/`). The portal routes
   (`apps/couriers-api/src/modules/portal/portal.routes.ts`) and the SDK's
   session transport (`packages/couriers/src/session-request.ts`,
   `packages/couriers/src/resources/portal.ts`) must use it. Argue: is
   there any portal route reachable without the session guard? Any route
   where the tenant is resolved from the hostname but the session user is
   never bound to that tenant (cross-tenant read)?

## Return format

For each area: a list of findings. For each finding:

- `severity:` blocker | should-fix | nit
- `file:line` where the defect lives
- `claim:` the defect, concretely
- `breaks-when:` the trigger (which request, which data)
- `fix:` what the correct code should do
- `evidence:` quotes of the relevant lines

End with a one-paragraph overall verdict: is this tree safe to commit
and merge as one feature PR, and what (if anything) must change first.