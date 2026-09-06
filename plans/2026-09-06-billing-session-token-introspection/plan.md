# Implementation Plan: Billing session-token introspection

- **Run ID:** `2026-09-06-billing-session-token-introspection`
- **Branch:** `fix/billing-session-token-introspection`
- **Base:** `main`
- **Status:** PR OPEN
- **Pull request:** [#489](https://github.com/876-workspace/876/pull/489)

## Goal

Restore navigation from the 876 Billing dashboard to normal Billing pages for
users whose first-party session token was reissued by an account switch in
another 876 app. Preserve session revocation and OAuth compatibility while
removing the server-component failure surfaced in production as React error
`#441`.

## Production evidence

Vercel logs from 2026-09-06 show the same failure across multiple Billing
resources:

| Billing route | Billing API route       | Result                   |
| ------------- | ----------------------- | ------------------------ |
| `/customers`  | `GET /api/v1/customers` | `401 auth/invalid-token` |
| `/quotes`     | `GET /api/v1/quotes`    | `401 auth/invalid-token` |
| `/invoices`   | `GET /api/v1/invoices`  | `401 auth/invalid-token` |

The Billing app then throws `BillingApiError` while rendering the requested
React Server Component. In the production client, React reports that failed
RSC response as minified error `#441`.

The dashboard remains available because its overview reads an internal Billing
projection. The affected pages use the signed-in member's bearer token and
therefore exercise OAuth token introspection.

## Root cause

First-party access tokens contain a signed session ID (`sid`) and subject
(`sub`). Account switching re-seals the active session with a new token and
updates the session row's stored token hash. Cookies already issued to another
876 app still contain the previous signed token for the same live session.

Core API session guards correctly treat the session row identified by `sid` as
the revocation authority. OAuth `/userinfo` and `/introspect` instead look up
the exact token hash, so they reject an older token after harmless rotation.
Billing API depends on `/oauth/introspect`, creating the observed 401s.

## Design

1. Resolve signed access tokens that contain `sid` through the session ID and
   bind the lookup to the signed `sub` user ID.
2. Retain token-hash lookup for legacy access tokens that do not contain a
   session ID.
3. Apply the same resolution rule to `/oauth/userinfo` and
   `/oauth/introspect` so the OAuth surface is internally consistent.
4. Revoke session-backed access tokens by signed `sid` + `sub`, ensuring that
   an older rotated token can still terminate the session it authorizes.
5. Keep expiry and `revokedAt` checks authoritative; a missing, expired, or
   revoked session remains inactive.

## Scope

- `apps/api/src/modules/oauth/oauth.controller.ts`
- `apps/api/src/modules/oauth/oauth.repository.ts`
- `apps/api/src/modules/oauth/__tests__/oauth.test.ts`

No Billing database, Billing API contract, browser route, or UI change is
required. The fix belongs in the identity service that owns access-token
introspection.

## Regression coverage

- A rotated session-backed token remains active through `/oauth/introspect`.
- The same token remains usable through `/oauth/userinfo`.
- Revoking the rotated token deletes the session by `sid` and `sub`.
- Legacy tokens without `sid` continue to use their token hash.
- Revoked, expired, missing, ID, service, and malformed tokens retain their
  existing rejection behavior.

## Verification

```bash
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/api build
git diff --check
```

Local results on the implemented branch:

- `typecheck` — passed.
- `lint` — passed with 28 pre-existing warnings in unrelated files.
- `test` — 114 files and 2,263 tests passed.
- `build` — passed.
- `git diff --check` — passed.
- `boundaries` — blocked by 18 pre-existing dependency cycles in the
  organization, membership, app-access, and provisioning modules. None of the
  reported cycles includes an OAuth file changed by this work.

After the branch is pushed:

1. Open a focused PR to `main`.
2. Confirm GitHub reports the PR mergeable with no conflicts.
3. Inspect CI and automated review results on the pushed head.
4. Verify the preview deployment no longer returns
   `auth/invalid-token` for a rotated but live session.

## Checklist

- [x] Pull Billing and Billing API production logs.
- [x] Identify the dashboard-versus-member-route authentication difference.
- [x] Implement session-ID resolution for introspection and userinfo.
- [x] Preserve revocation for rotated tokens.
- [x] Add focused OAuth route regression tests.
- [x] Pass focused OAuth tests and API typecheck.
- [x] Pass API typecheck, lint, tests, and build.
- [x] Record the unrelated pre-existing boundary failures.
- [x] Commit and push focused changes.
- [x] Open the PR and confirm mergeability.
- [x] Record final verification and PR link in this plan.
