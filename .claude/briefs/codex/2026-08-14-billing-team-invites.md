# Codex brief — Team member invites in 876 Billing (@876/billing-app)

## Context & why

The Billing team surface (`/settings/users` members list, `/settings/roles` role CRUD)
exists, but there is **no way to invite a new member** — the only paths to a new org
member are the core admin API or another app. This adds the invite flow: list pending
invites, send an invite, and revoke one, from Billing's settings.

**Invites are CORE-IDENTITY data, not billing-api data.** They go through the core
platform client (`getPlatformClient().invites.*`), exactly the way the users page already
reads `platform.memberships.list`. Do NOT route invites through the `/api/v1/*` billing-api
gateway — that backend does not own invites.

Follow `.agents/rules/git.md` (no AI attribution), `.claude/rules/api-access.md`
(pure-transport route handlers, NO server actions), `.claude/rules/app-layout.md` (pages
over pop-ups; dialogs only for destructive confirmations; bare-verb buttons; `PageBreadcrumb`
on sub-routes), `.claude/rules/app-structure.md` (features/ placement), and
`.claude/rules/testing.md`. DO NOT COMMIT.

## The platform client invite surface (already exists — just call it)

`getPlatformClient()` (`apps/billing/src/lib/876/platform-client.ts`) returns `.invites`:

- `create(orgId, { email, role?, sourceAppSlug? }) -> Result<PlatformInviteToken>`
- `revoke(orgId, inviteId) -> Result<PlatformInviteToken>`
- `list(orgId) -> Result<PlatformList<PlatformInviteToken>>`

`PlatformInviteToken` (from `@876/core/platform` types) has:
`{ object:'invite_token', id, organization_id, email, role, status, expires_at:number, source_app_id, created_at }`.
Grep the exact type name/shape in `packages/core/src/platform` and reuse it; don't redefine it.

## File scope (all NEW unless noted)

Route handlers (pure transport):

- `apps/billing/src/app/api/team/invites/route.ts` (GET list, POST create)
- `apps/billing/src/app/api/team/invites/[inviteId]/route.ts` (DELETE revoke)

Browser client:

- `apps/billing/src/lib/client/invites.ts`
- `apps/billing/src/lib/client/index.ts` (add `invites` to the `client` object)

Types:

- `apps/billing/src/types/access.ts` (add `InviteView`, `InviteCreateInput` — do not touch existing types)

UI:

- `apps/billing/src/features/access/components/invite-form.tsx`
- `apps/billing/src/features/access/components/pending-invites.tsx`
- `apps/billing/src/features/access/components/revoke-invite-dialog.tsx`
- `apps/billing/src/app/(app)/settings/users/invite/page.tsx`
- `apps/billing/src/app/(app)/settings/users/page.tsx` (add a Pending-invites section + an Invite button; do not disturb the existing MembersTable render)

Tests:

- colocated `*.test.tsx` for `invite-form` and `revoke-invite-dialog` (mirror an existing
  `features/access/components/*.test.tsx` harness, e.g. `permission-picker.test.tsx`).

Do NOT touch: `service/`, `lib/db`, `billing-context.ts`, the `/api/v1/*` gateway, or
`platform-client.ts`.

---

## Part 1 — route handlers

Mirror the auth/context pattern the users page uses: `getContext()` from
`@/lib/auth/billing-context` gives `{ orgId, permissions, ... }` (or null). Use
`apiSuccess`/`apiError` from `@876/core/api` (see `app/api/ready/route.ts`). `runtime = 'nodejs'`.

`api/team/invites/route.ts`:

```ts
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const context = await getContext()
  if (!context)
    return apiError('Billing authentication is required.', { status: 401 })
  if (!context.permissions.includes('members:read'))
    return apiError('You do not have permission to view invites.', {
      status: 403,
    })

  const platform = await getPlatformClient()
  const { data, error } = await platform.invites.list(context.orgId)
  if (error || !data)
    return apiError(error?.message ?? 'Failed to load invites.', {
      status: 400,
    })
  return apiSuccess({ object: 'list', data: data.data })
}

export async function POST(request: Request): Promise<Response> {
  const context = await getContext()
  if (!context)
    return apiError('Billing authentication is required.', { status: 401 })
  if (!context.permissions.includes('members:write'))
    return apiError('You do not have permission to invite members.', {
      status: 403,
    })

  const body = (await request.json()) as { email?: unknown; role?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return apiError('An email address is required.', { status: 400 })
  const role =
    typeof body.role === 'string' && body.role ? body.role : undefined

  const platform = await getPlatformClient()
  const { data, error } = await platform.invites.create(context.orgId, {
    email,
    role,
  })
  if (error || !data)
    return apiError(error?.message ?? 'Failed to send the invite.', {
      status: 400,
    })
  return apiSuccess(data)
}
```

`api/team/invites/[inviteId]/route.ts` — DELETE, `members:write`,
`platform.invites.revoke(context.orgId, inviteId)`; `params: Promise<{ inviteId: string }>`.

Confirm the exact `apiSuccess`/`apiError` signatures and the `getContext` return shape
before writing (read `billing-context.ts` and `app/api/ready/route.ts`). Match them.

## Part 2 — browser client (`lib/client/invites.ts`)

Mirror `lib/client/members.ts` (uses `request` from `./request`, returns `ClientResult<T>`):

```ts
const list = () => request<InviteListView>('/api/team/invites')
const create = (params: InviteCreateInput) =>
  request<InviteView>('/api/team/invites', {
    method: 'POST',
    body: JSON.stringify(params),
  })
const revoke = (inviteId: string) =>
  request<InviteView>(`/api/team/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
  })
export const invites = { list, create, revoke }
```

Add `invites` to the `client` object in `lib/client/index.ts` (alphabetical, matching style).

## Part 3 — types (`types/access.ts`)

```ts
export type InviteView = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: number
}
export type InviteCreateInput = { email: string; role?: string }
```

(Map `expires_at` → `expiresAt` where you render; keep the wire object as the platform type.)

## Part 4 — UI

**`invite-form.tsx`** (`'use client'`): email input (use `EmailInput` from `@876/ui/email-input`),
role select (options from a `roles` prop — pass the billing roles list from the page). On submit,
`useTransition` + `client.invites.create({ email, role })`; on success `router.push('/settings/users')`;
show the returned error inline on failure. Disable submit while pending. Bare-verb submit button
("Send invite"), `primaryVariant`/info per app-layout, never green.

**`pending-invites.tsx`** (`'use client'`): takes `invites: InviteView[]` + `canManage: boolean`.
Renders a simple table/list (email · role · status · expiry). Each row has a Revoke action (only
when `canManage`) opening `RevokeInviteDialog`. If `invites` is empty, render nothing (no empty-state
prose, per CLAUDE.md UI copy).

**`revoke-invite-dialog.tsx`** (`'use client'`): destructive `AlertDialog` confirmation (mirror an
existing destructive dialog in the app). `client.invites.revoke(inviteId)` then `router.refresh()`.

**`settings/users/invite/page.tsx`**: `requirePagePermission('members:write')`; fetch roles
(`service.roles.list(context.tenant.id)`) for the select; `<PageBreadcrumb href="/settings/users"
label="Users" className="mb-4" />`, `PageHeader`/`PageTitle` "Invite member", render `<InviteForm
roles={roles} />`.

**`settings/users/page.tsx`**: additionally fetch `platform.invites.list(context.orgId)` in the
existing `Promise.all`; render a "Pending invites" section (heading + `<PendingInvites invites={...}
canManage={context.permissions.includes('members:write')} />`) below the members table; and add an
"Invite" button/link to `/settings/users/invite` in the header (shown only when
`context.permissions.includes('members:write')`). Map each `PlatformInviteToken` → `InviteView`
(only include `status` that is pending/active — filter out revoked/accepted). Keep the existing
`ShieldCheck` notice and `MembersTable` untouched.

## Part 5 — tests

`invite-form.test.tsx`: mock `@/lib/client`; submitting a valid email calls `client.invites.create`
with `{ email, role }`; an empty email does not call it (`.not.toHaveBeenCalled()`); a returned error
is shown and no navigation happens. `revoke-invite-dialog.test.tsx`: confirming calls
`client.invites.revoke(inviteId)` once; cancel does not. Exact call args, both-sides assertions.

---

## Verify (run all, must pass)

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
```

Do NOT commit. Report exactly which files you changed/created and any deviations. If the
`getContext` shape or `apiSuccess`/`apiError` signatures differ from what this brief assumes,
adapt to the real ones and note the deviation.
