# Codex brief (Commerce pass 2): working onboarding and realm handling

**Repo:** `/root/projects/876` · **Branch:** `feature/commerce-base` (checked
out; stay on it). No other delegate is running. **Model:** `gpt-5.6-terra`,
medium effort.

The skeleton is committed (`5babaf5df`; report at
`reports/codex/2026-09-13-commerce-base-setup.md`). The orchestrator's review
found it violates `.claude/rules/product-org-signup.md`, which is binding. Read
that rule in full first.

## Defects to fix

1. **Onboarding is a dead end.** `apps/commerce/src/app/onboarding/page.tsx`
   only says "an administrator can enable 876 Commerce". The rule requires:
   - a signed-in enterprise account with **no organization** can create one
     (`platform.organizations.create({ creatorUserId, name })`, with
     `creatorUserId` taken from the session, never the body);
   - a `super-admin`/`admin` whose org **lacks the `876-commerce` entitlement**
     can activate it from onboarding (the get-started step);
   - a staff member without the entitlement goes to `/no-access`;
   - a `blocked` entitlement goes to `/no-access` for every role;
   - memberships are resolved live, so a newly created org is visible without
     re-login.

   Mirror **876 Projects** exactly: `apps/projects/src/app/onboarding`,
   `apps/projects/src/app/api/onboarding/**`, and how Projects provisions its app
   entitlement. If Projects differs from CRM
   (`apps/crm/src/app/onboarding`, `apps/crm/src/app/api/onboarding/organization/route.ts`),
   follow whichever matches the rule and say which in the report. Route handlers
   are thin transport that authorize then call the platform client. No server
   actions.

2. **Consumer-realm sessions** must get an in-app wrong-account page with an
   explicit sign-out action that returns to `/login`. They must not enter
   onboarding and must not be redirected to another app. Mirror Projects/CRM.
3. **Stale or deleted account cookies:** `/login` must confirm the account is
   still active before redirecting a signed-in visitor away from the form
   (`requireValidSession` pattern; see new-app-guide §3d).
4. **Role check.** `lib/auth/context.ts` `isOrganizationAdmin` hand-lists
   spellings.
   - Search `packages/core` for an existing organization-role normalizer and use
     it if one exists.
   - If none exists, mirror `apps/crm/src/lib/auth/roles.ts` `normalizeOrgRole`
     (with its documented aliases), and record in the report that CRM and
     Commerce now duplicate it, as a follow-up to promote into `@876/core`.
     Do not promote it in this run.
5. **Get-started decision in one place.** The layout redirects; onboarding
   decides (rule: "the layout redirects, onboarding decides").

## Tests (≥ 12 new `it()` cases)

- **Guard/redirect matrix:** signed-out, consumer realm, no org, admin without
  entitlement, staff without entitlement, blocked, entitled.
- **Onboarding org-creation route:** unauthenticated → 401; `creatorUserId`
  comes from the session even when the body supplies another; platform error
  surfaces as a value.
- **Activation route:** a staff member is denied; an admin succeeds; it is
  idempotent when already active.
- **Login page:** a stale cookie still renders the form.

## Verification (foreground; report counts)

```bash
pnpm --filter @876/commerce-app typecheck && pnpm --filter @876/commerce-app lint && pnpm --filter @876/commerce-app test
pnpm --filter @876/commerce test && pnpm --filter @876/commerce-api test
node scripts/check-app-structure.mjs
```

Add `commerce` to `scripts/check-app-structure.mjs`'s app list if it
enumerates apps explicitly, and confirm Commerce passes.

## Hard rules

- Never run `git checkout/stash/reset/clean/commit/push`. Write no run logs.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `as any`.
- Touch only `apps/commerce/**`, `scripts/check-app-structure.mjs` (app list
  only) and this run's report.
- Report **only** to
  `plans/2026-09-13-finance-product-split/reports/codex/2026-09-13-commerce-onboarding.md`,
  with: files changed, counted tests, verification results, which reference was
  followed, follow-ups, and anything not done.
