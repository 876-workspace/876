# Brief — Console operator email surface

Repo `/root/projects/876`, branch `feature/transactional-email-platform` (already
checked out). Do NOT create/switch/merge branches. Do NOT commit. Do NOT edit
`pnpm-lock.yaml`.

## Goal

Give Console — 876's internal operator plane — jurisdiction over any
organization's email configuration and delivery evidence. Console must be able to
inspect an organization's senders, sending domains and templates, and read its
delivery history with provider events, in order to support and repair it.

**This pass is read-only plus one mutation** (suspend/resume an organization's
sending is explicitly out of scope — do not build it). Read, and audit.

## Rules you MUST read first, completely, in this order

1. `.agents/rules/email.md` — see the **"Console jurisdiction"** section. It is
   the binding constraint on this whole brief.
2. `.agents/rules/access-tiers.md` — the operator tier, and why Console never
   holds an integration credential.
3. `.agents/rules/api-access.md` — Console's server boundary and, critically, its
   URL naming: Console routes are named after **what the operator is acting on**,
   never after the service that receives the call.
4. `.agents/rules/access-control.md` — the three enforcement layers, and the
   navigation-to-route binding test requirement.
5. `.agents/rules/app-layout.md` and `.agents/rules/app-structure.md`.
6. `.agents/rules/data-loading.md` and `.agents/rules/error-handling.md`.

## Already built for you — do not rebuild

- `@876/communications/operator` exists and is the entrypoint to import. Read
  `packages/communications/src/operator.ts` and its README table first: it records
  operator **intent** and currently aliases the service client because the backend
  exposes one internal-key tier. That is deliberate. Do not "fix" it, and do not
  claim in comments or docs that it carries a distinct credential.
- `packages/communications-ui` panels (sender list, domain list, domain records,
  template list) are being built in a parallel task. **If that package exists when
  you start, mount its panels rather than writing new tables.** If it does not
  exist yet, build Console-local tables in
  `apps/console/src/features/<domain>/components/` and say so in your report — do
  not create a second shared UI package.

## Scope — files you may create or edit

Only under `apps/console/`. Do not touch `apps/communications-api/`,
`packages/communications/`, `packages/communications-ui/`, or any other app.

## What to build

### 1. The operator service module

`apps/console/src/lib/services/communications.ts`, matching the eight existing
operator modules in that directory exactly (read `platform.ts` and `crm.ts`
first). It must:

- import from `@876/communications/operator`;
- expose a named request-scoped factory taking the request id, the way `crm.ts`
  does, since Console propagates correlation ids;
- be `server-only` and the only place in Console that knows Communications exists.

Add `COMMUNICATIONS_API_URL` and `COMMUNICATIONS_INTERNAL_KEY` to
`apps/console/.env.example`. Neither is optional.

### 2. Operator routes under Console's own vocabulary

The operator is acting on an **organization**, so routes hang off the
organization, not off a service name:

```
GET /api/organizations/[id]/email/senders
GET /api/organizations/[id]/email/domains
GET /api/organizations/[id]/email/domains/[domainId]
GET /api/organizations/[id]/email/templates
GET /api/organizations/[id]/email/deliveries
GET /api/organizations/[id]/email/deliveries/[deliveryId]
POST /api/organizations/[id]/email/domains/[domainId]/verify
```

Never `/api/communications/*`. Each handler, in this exact order:

1. `requireConsolePermission(<permission>)` and return its response if denied;
2. write the audit event (see 3 below);
3. resolve the request id, construct the operator client, call **one** operation;
4. return the canonical envelope.

No business logic in a handler.

### 3. Audit is not optional

`email.md` requires an audit event for **any read of customer-identifying
delivery content** and for **every mutation**. A delivery record contains the
recipient address and the rendered subject and body, so reading one is
customer-identifying. Find Console's existing audit helper by grepping
`apps/console/src/lib/` for the audit writer another operator route already uses,
and reuse it — do not write a second one. Audit the delivery read endpoints and
the verify mutation; a sender/domain/template list is configuration, not customer
content, and does not need one.

### 4. Permissions must be granted, not just declared

Add the permission key(s) to Console's permission catalog **and** name the role(s)
that hold them. A permission no role grants is indistinguishable from one that
does not exist, and it silently hides the surface. Follow whatever pattern the
catalog already uses for the other organization-scoped operator permissions.

If you add navigation, its `requires.permission` must equal the permission its
destination route checks, and the existing registry-to-route binding test must
still pass.

### 5. The page

Mount it inside the existing organization workspace view
(`apps/console/src/app/(app)/orgs/[slug]/workspace/...`) beside the other
per-organization product views — read one of those to match its layout, and note
that a workspace page is a **scrolling** page, so if you use a list/detail shell
read the height rules in `app-layout.md` §5a carefully. The page renders its
chrome synchronously with each data region behind its own `<Suspense>`.

Show the delivery status honestly: a delivery has `queued | sent | delivered |
opened | clicked | bounced | complained | failed`, and a domain has
`not-started | pending | partially-verified | partially-failed | verified |
failed` where `not-started` means the organization must act and `pending` means
wait. Do not collapse them. Status is always a `<Badge>`, never coloured text,
and **no green buttons**.

### 6. Tests — floor 14 `it()` cases

- every route handler denies a request lacking the required permission (assert
  the 403 value, not a redirect — `access-control.md` forbids redirecting from an
  API authorization failure);
- every route handler denies an unauthenticated request;
- the delivery read endpoints and the verify mutation each write an audit event —
  assert it was called with the acting operator, the organization, and the
  resource;
- a list endpoint returns the canonical envelope;
- a service error renders inline without tearing the page down;
- the catalog/navigation binding test still passes.

Assert exact call counts and arguments. `toBeDefined()` alone is not an assertion.

## Hard prohibitions

- No `/api/communications/*` or any service-named browser URL.
- No Resend knowledge, API key, or provider call anywhere in Console.
- No server actions. No `proxy.ts` or `middleware.ts`.
- No `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, or tsconfig
  relaxation. `as unknown as T` only for a real library mismatch; say so.
- No function/component props passed from a server component to a client one.
- No green buttons; no explanatory `<p>` under a section heading.
- Do not expose an internal key, service origin, or any secret to the browser.
- Do not weaken production code to make a test easier.
- Do not delete or skip an existing test.
- Do not commit, branch, or open a PR.

## Verification — foreground, one at a time

```bash
cd /root/projects/876
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
pnpm check:env
```

The console test suite is slow — allow up to 7 minutes. `pnpm check:env` already
reports **pre-existing** gaps for console and several other apps; your two new
variables must not add to that list, and you must not "fix" the unrelated ones.

## Report

`plans/sep/15-transactional-email-platform/reports/codex/2026-09-16-console-operator-email.md`
— status, literal `it()` counts before and after, the final output of every
command, each file changed with a one-line reason, whether you mounted the shared
panels or built Console-local tables and why, and anything you could not do.
A truthful "not done" beats a false claim.
