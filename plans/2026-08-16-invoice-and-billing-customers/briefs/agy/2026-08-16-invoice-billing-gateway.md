# Brief — give 876 Invoice a Billing gateway route

Repo: `/root/projects/876`. **Do not commit, do not branch, do not push.** Edit
files only.

## Why

876 Invoice's browser code has no way to reach the Billing data plane. 876
Billing solves this with a thin proxy route plus a rewrite, so client
components can call same-origin `/api/v1/...` and the route attaches the
caller's access token and organization server-side. Invoice needs the identical
mechanism before its customer create/edit/delete UI can exist.

This is pure transport. No business logic, no new client methods, no UI.

## Reference implementation — copy its shape exactly

- `apps/billing/src/app/api/billing-gateway/[...path]/route.ts`
- the `rewrites()` block in `apps/billing/next.config.ts` (around line 71)

## Scope — exactly two files

### 1. Create `apps/invoice/src/app/api/billing-gateway/[...path]/route.ts`

Mirror the Billing route, with these Invoice-specific differences:

- Imports available to Invoice (verify each resolves before relying on it):
  - `proxy876BillingRequest` from `@876/billing/proxy`
  - `apiError` from `@876/core/api`
  - `getAuthSession`, `isSignedSession` from `@/lib/auth/session`
- **Resolving the organization**: Billing reads a `billing_active_org` cookie
  and falls back to `session.user.orgId`. Invoice has no such cookie — resolve
  the acting organization with `getInvoiceContext()` from `@/lib/auth/context`
  and use `context.orgId`. If it returns null, respond
  `apiError('Select an organization to access Invoice.', { status: 400 })`.
  Read `apps/invoice/src/lib/auth/context.ts` first so you use the real API.
- Keep `export const runtime = 'nodejs'` and
  `export const dynamic = 'force-dynamic'`.
- Keep the `x-request-id` passthrough from `headers()`.
- Export the same verbs Billing exports: `GET`, `POST`, `PUT`, `PATCH`,
  `DELETE`.
- Base URL comes from `process.env.BILLING_API_URL`, exactly as Billing does.
- 401 when there is no signed session or no access token.

Add a short file-level comment saying this is pure transport: it authorizes the
session, attaches the caller's token and organization, and forwards — no
business logic, per `.claude/rules/api-access.md`.

### 2. Add the rewrite to `apps/invoice/next.config.ts`

Add an `async rewrites()` returning
`[{ source: '/api/v1/:path*', destination: '/api/billing-gateway/:path*' }]`,
matching Billing. If the file already has a `rewrites()`, extend it rather than
replacing it. Do not touch any other config key.

## Do not

- Do not add the internal key or any privileged credential to this route — the
  caller's own OAuth access token is the only credential it may use.
- Do not log the request query string (codes and tokens travel there).
- Do not add `proxy.ts` or `middleware.ts` — forbidden platform-wide, see
  `.claude/rules/new-app-guide.md` §3c.
- Do not modify `apps/billing`, `packages/`, or any Invoice file outside the
  two named above.

## Verification (run these; paste the output)

```bash
cd /root/projects/876
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
npx prettier --check "apps/invoice/src/app/api/billing-gateway/[...path]/route.ts" apps/invoice/next.config.ts
```

## Report back

List the files you changed, paste the verification output, and note anything in
this brief that did not match the codebase.
