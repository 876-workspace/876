# Brief — communications-api: make it typecheck and comply with express-api.md

Repo: `/root/projects/876`. Branch: `feature/transactional-email-platform`
(already checked out — do NOT create, switch, rebase, or merge any branch).
Do NOT commit. The orchestrator stages and commits.

`apps/communications-api` is a brand-new Express 5 + Prisma 7 service written by
an agent that could not execute anything. It now installs and its migration is
applied, but it does not typecheck and it violates two rules from
`.agents/rules/express-api.md`. Fix exactly the four tasks below and nothing else.

Scope — you may ONLY edit files under `apps/communications-api/`. Do not touch
`packages/`, `apps/billing-api/`, any other app, or the lockfile.

## Task 1 — Fix the 27 TypeScript errors

Run this to see them:

```bash
cd /root/projects/876 && pnpm --filter @876/communications-api exec tsc --noEmit
```

They fall into four groups. Fix the **cause**, never by widening a type, and
never with `as any`, `@ts-ignore`, `@ts-expect-error`, or an `eslint-disable`.

**Group A — wrong imported type names (4 errors).** These files import names that
`src/types/communications.ts` (which re-exports `@876/communications/contracts`)
does not export:

- `src/modules/deliveries/deliveries.service.ts:15` imports `EmailDeliveryObject`
- `src/modules/domains/domains.service.ts:15` imports `EmailDomainObject`
- `src/modules/senders/senders.service.ts:12` imports `EmailSenderObject`
- `src/modules/templates/templates.service.ts:10` imports `EmailTemplateObject`

Read `packages/communications/src/types.ts` (read-only) to find the real exported
names — they are `EmailDelivery`, `EmailDomain`, `EmailSender`, `EmailTemplate`.
Update the imports and every use site. Do not rename the exported contract types
in `packages/communications`.

**Group B — untyped route params (21 errors, all TS2339
`Property 'organizationId' does not exist`).** In
`src/modules/{domains,senders,templates,deliveries}/*.routes.ts`, handlers read
`req.params.organizationId`. That value is real at runtime — `src/http/routes.ts`
mounts each router under `/organizations/:organizationId/email/...` with
`Router({ mergeParams: true })` — but Express 5's types do not infer a parent
param.

Fix it by declaring the params type, once, in a shared place. Add to
`src/http/` a small module exporting:

```ts
export type OrganizationScopedParams = { organizationId: string }
```

and have each router type its handlers' params by composing that with its own
path param, e.g. `OrganizationScopedParams & { domainId: string }`. Use Express's
generic request typing (`Request<TParams>`) or `RequestHandler<TParams>` — pick
whichever produces clean code and keep it consistent across all four route files.

**Keep every existing runtime guard.** Each handler currently checks
`if (!organizationId) return sendError(res, 'communications/invalid-request')`.
Those checks must remain — the type is a compile-time claim, not a runtime
guarantee, and the org id is an authorization scope. Do not delete them.

**Group C — Prisma JSON input (1 error).**
`src/modules/deliveries/deliveries.repository.ts:181` assigns a
`Record<string, unknown>` where Prisma expects
`InputJsonValue | NullableJsonNullValueInput`. Fix it by typing the value as
Prisma's `InputJsonValue` at the boundary (import the Prisma namespace type from
the generated client the way other repositories in this service already import
Prisma types). Do not cast through `any`, and do not change the database column.

**Group D — 1 error in `src/providers/resend-provider.test.ts` (TS2558).** Read
the line and fix the test's generic arity. Do not weaken the assertion.

## Task 2 — Add the service config module (express-api.md requirement)

The rule states: *"Parse environment variables once through the service config
module. Fail fast for invalid required configuration. Other modules do not read
`process.env` directly."*

This service currently reads `process.env` directly in six places:

| File | Variable |
| --- | --- |
| `src/server.ts` | `ENVIRONMENT`, `LOG_LEVEL`, `PORT` |
| `src/providers/index.ts` | `RESEND_API_KEY` |
| `src/http/internal-auth.ts` | `COMMUNICATIONS_INTERNAL_KEY` |
| `src/modules/deliveries/deliveries.webhook.ts` | `RESEND_WEBHOOK_SECRET` |
| `src/db/index.ts` | `COMMUNICATIONS_DATABASE_URL` |

(Files under `src/db/generated/**` are generated Prisma output — ignore them
entirely.)

Create `src/config/index.ts` following the shape of `apps/billing-api/src/config/index.ts`
(read it first, read-only) and adapted to this service's variables. Requirements:

- Parse and validate with Zod, once, at module scope.
- `COMMUNICATIONS_DATABASE_URL` is **required** — fail fast with a clear message
  naming the variable if it is missing or not a URL.
- `COMMUNICATIONS_INTERNAL_KEY` is optional in the type but the auth guard must
  **fail closed** when it is empty. Preserve the existing behaviour in
  `src/http/internal-auth.ts` exactly: a missing configured key rejects every
  request. Do not make it default to any value.
- `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are optional at boot (the service
  must start without a provider configured) but the code paths that need them
  must return the already-registered error rather than throwing an unhandled
  error. Keep the current failure contract — read the existing call sites first
  and preserve their error codes.
- `PORT` defaults to **4050** (not 4040 — 4040 is already taken by
  `@876/commerce-api`). `ENVIRONMENT` defaults to `development`, `LOG_LEVEL` to
  `info`.
- Never log or echo a secret value.

Then replace all six direct reads with imports from the config module. Update
`apps/communications-api/.env.example` so its `PORT` comment says 4050.

## Task 3 — Attach the internal-key guard per route, not with `router.use`

`.agents/rules/express-api.md`: *"Guards attach **per route**, never with
`router.use`, so an unknown path still 404s instead of 401ing."*

`src/http/routes.ts` currently does `service.use(requireInternalKey)`, so an
unknown path under `/v1` returns 401 instead of 404. Restructure so
`requireInternalKey` is attached to each mounted resource router (or to each
route) rather than to the whole `/v1` router, and an unknown path under `/v1`
reaches the final 404 handler.

Add a test proving it: `GET /v1/does-not-exist` with **no** credentials returns
**404**, and an existing real route with no credentials still returns **401**.

## Task 4 — Verify, and report

Run these in the foreground, one at a time, and fix what they surface:

```bash
cd /root/projects/876
pnpm --filter @876/communications-api typecheck
pnpm --filter @876/communications-api lint
pnpm --filter @876/communications-api boundaries
pnpm --filter @876/communications-api test
pnpm --filter @876/communications-api build
```

All five must pass. The test suite must **not lose cases** — record the case
count before and after; it may only go up (Task 3 adds two).

If `boundaries` fails because the new `src/config/` module is not in the
dependency-cruiser allow-list, update `.dependency-cruiser.cjs` so config is a
permitted dependency of the layers that need it — but do **not** relax or delete
an existing rule to make an unrelated violation pass. If a boundary violation is
a genuine design problem you cannot fix within this scope, leave it and report it.

## Hard prohibitions

- No `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, or tsconfig
  relaxation. `as unknown as T` only for a real external/library mismatch, and
  say so in the report.
- Do not weaken `tsconfig.json` — it was deliberately aligned to the canonical
  `billing-api` config (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
  Fix code, not the compiler settings.
- Do not delete or skip a test to make the suite pass.
- Do not remove a runtime validation or authorization check to satisfy a type.
- Do not create, switch, or merge branches. Do not commit. Do not open a PR.

## Report

Write `plans/sep/15-transactional-email-platform/reports/codex/2026-09-16-communications-api-compliance.md`
containing: each task's status; the literal test case count before and after; the
exact final output (pass/fail) of all five verification commands; every file
changed with a one-line reason; anything you could not fix and why. A truthful
"not done" is better than a false claim.
