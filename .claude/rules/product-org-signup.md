# Product App Org Sign-Up

Read this before building, reviewing, or changing the authenticated entry path of
any **org-workspace product app** — couriers and billing today, and every future
SaaS product an organization signs into (enterprise-realm apps). It fixes the
rule that a brand-new authenticated account must always have somewhere to land.
Companion to `.claude/rules/platform-services.md` (org provisioning),
`.claude/rules/new-app-guide.md` (app scaffolding), and
`.claude/rules/navigation-performance.md` (guards).

## The rule

**An org-workspace product app must provide an org sign-up flow for a signed-in
account that has no organization yet.** A newly authenticated account with zero
memberships must be routed into org creation — never stranded on `/no-access`.

This applies to every app whose management surface authenticates in the
**enterprise realm** (`X-876-Realm: enterprise`) and gates access on an active
org membership: couriers, billing, and every future org-facing product. It does
**not** apply to the consumer app (`@876/app`), which has no org concept.

### Why this exists

Billing shipped social sign-in (Google/Apple/Microsoft) on its login screen but
had no path for the account those buttons create. A brand-new social sign-up has
a valid 876 account and **no organization and no membership**, so the org-gated
layout resolved no context and redirected to `/no-access`. The account was
authenticated, correct, and permanently stuck. Enabling any sign-up affordance
(social or email) without the matching org-creation path reproduces this bug.

> If an account can authenticate into the app, the app must be able to onboard
> it. Sign-up and onboarding ship together, or neither ships.

## What the flow must do

For a signed-in account with **no** membership, the app must let it:

1. **Create its organization** — `platform.organizations.create({ ownerUserId,
   name })` (the `/organizations/bootstrap` transport). This creates the org and
   the owner membership. Idempotent: an account that already has an org keeps it.
2. **Provision the app** for that org (the app's own get-started/onboarding step
   — subscription + workspace/tenant), exactly as it already does for an account
   that arrives with an org.

Memberships are resolved **live** from the platform API keyed by the account id
(`platform.memberships.listRouting({ userId })`), not from the sealed session
cookie — so the newly created org is visible on the next request without a
re-login.

Reference implementations: `apps/couriers/src/app/onboarding/` (full three-step
wizard: org → app setup → invites) and `apps/billing/src/app/get-started/` (org
creation → workspace provisioning). Match the app's existing get-started style;
do not invent a second onboarding pattern.

### Routing

- The org-gated layout, on **signed-in + no context**, redirects to the app's
  get-started/onboarding route — not `/no-access`.
- `/no-access` remains correct for an authenticated account that has an org but
  is **not permitted** (a `member` who cannot provision, a blocked workspace).
  No-access is an authorization answer, not the answer to "no org yet".
- Org creation and app provisioning run through pure-transport route handlers
  (`app/api/...`) that authorize the session and call the platform client — no
  business logic in the app (`.claude/rules/api-access.md`).

## Configuration: `/no-access` must escape to a real 876 account URL

The `/no-access` (and couriers `/access-denied`) "Go to my 876 account" link
targets `NEXT_PUBLIC_APP_URL`, falling back to `http://localhost:3000` for local
dev. **Every deployed org-workspace app must set `NEXT_PUBLIC_APP_URL`** (in
`wrangler.jsonc` `vars`) to the consumer app's real origin
(`https://876-app.1876.workers.dev`). An unset value ships the localhost fallback
to production, where the escape link sends real users to their own machine.

## Do not

- Do not enable any sign-up affordance (social or email) on a product app's login
  without the org-creation path for the account it creates.
- Do not redirect a signed-in, org-less account to `/no-access`.
- Do not read the org from the sealed session cookie for onboarding — resolve
  memberships live so a freshly created org is seen immediately.
- Do not put org-creation or provisioning business logic in the Next app — call
  the platform client from a route handler.
- Do not ship an org-workspace app without `NEXT_PUBLIC_APP_URL` configured.
