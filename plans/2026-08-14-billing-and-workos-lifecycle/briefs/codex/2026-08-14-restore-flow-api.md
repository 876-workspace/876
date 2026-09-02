# Codex brief — Restore/un-delete flow (API core: @876/api + @876/admin)

## Context & why

876 identity uses reversible soft-Delete (tombstone `deletedAt`/`deletedBy`/`deletionReason`)
vs destructive Purge. Delete propagates to the Billing org-customer registry by
enqueuing a `customer.ensure` event whose `status` is ARCHIVED. We now need the
**restore (un-delete)** path that closes the lifecycle: clear the tombstone, un-cascade
an org's memberships that the delete closed, and re-emit `customer.ensure` — which,
because the snapshot's status is DERIVED from `deletedAt` via `lifecycleStatus()`,
comes out ACTIVE and un-archives the Billing customer.

Design is already decided below — implement it exactly, do not re-derive. Follow
`.agents/rules/git.md` (no AI attribution). DO NOT COMMIT — the orchestrator commits.

File scope (only these):

- apps/api/src/modules/organizations/organizations.repository.ts
- apps/api/src/modules/organizations/organizations.service.ts
- apps/api/src/modules/organizations/organizations.controller.ts
- apps/api/src/modules/organizations/organizations.routes.ts
- apps/api/src/modules/users/users.repository.ts
- apps/api/src/modules/users/users.controller.ts
- apps/api/src/modules/users/users.routes.ts
- apps/api/src/modules/organizations/**tests**/ (add a restore test file)
- apps/api/src/modules/users/**tests**/ (add a restore test file)
- packages/admin/src/resources/orgs.ts
- packages/admin/src/resources/users.ts

Do NOT touch: apps/api/src/services/billing-customer-sync.ts (its
`enqueueCustomerEnsureForOrganization` / `enqueueCustomerEnsureForUser` already exist
and are exactly what you call — read them, don't edit them).

---

## Part 1 — organizations repository

1a. Make the delete timestamp SHARED so restore can match memberships exactly.

`softDeleteMembershipsForOrg(organizationId)` currently computes its own `now`.
Add an optional param:

```ts
export async function softDeleteMembershipsForOrg(
  organizationId: string,
  now: bigint = BigInt(Math.floor(Date.now() / 1000))
): Promise<number> {
  const result = await prisma.membership.updateMany({
    where: { organizationId, deletedAt: null },
    data: { deletedAt: now, updatedAt: now },
  })
  return result.count
}
```

`deleteOrganization(id, deletedBy, reason)` currently computes its own `now`. Add an
optional `now` param defaulting to a fresh timestamp, and use it for `deletedAt`/`updatedAt`:

```ts
export async function deleteOrganization(
  id: string,
  deletedBy: string | null,
  reason: string | null,
  now: bigint = BigInt(Math.floor(Date.now() / 1000))
): Promise<OrganizationRow | null> {
  // ... unchanged body, but use the `now` param instead of a local const ...
}
```

1b. Add two new functions after `softDeleteMembershipsForOrg`:

```ts
/**
 * Restore the memberships an org Delete closed. Matches on the exact `deletedAt`
 * the cascade wrote (the shared delete timestamp), so a member removed *before*
 * the org was deleted — with a different `deletedAt` — is correctly left closed.
 */
export async function restoreMembershipsForOrg(
  organizationId: string,
  closedAt: bigint
): Promise<number> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const result = await prisma.membership.updateMany({
    where: { organizationId, deletedAt: closedAt },
    data: { deletedAt: null, updatedAt: now },
  })
  return result.count
}

/** Clear an org's tombstone. Returns the restored row, or null if it does not exist. */
export async function restoreOrganization(
  id: string
): Promise<OrganizationRow | null> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const row = await prisma.organization.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: now,
      },
      select: ORGANIZATION_SELECT,
    })
    return row as unknown as OrganizationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}
```

---

## Part 2 — organizations service

2a. In `deleteOrganization` (the service fn, ~line 513), compute one shared `now`
and pass it to both repository calls so membership `deletedAt` == org `deletedAt`:

```ts
const now = BigInt(nowUnixSeconds())
const closedMemberships = await repository.softDeleteMembershipsForOrg(
  organizationId,
  now
)
await repository.deleteOrganization(organizationId, deletedBy, reason, now)
```

`nowUnixSeconds` is already imported? If not, add `import { nowUnixSeconds } from '@/platform/timestamps'`.
(Check existing imports first.)

2b. Add an `ensureBillingCustomerForOrg` helper that MIRRORS the existing
`archiveBillingCustomerForOrg` (same shape, same best-effort try/catch + log), but
calls `enqueueCustomerEnsureForOrganization` instead of the archive variant. Add
`enqueueCustomerEnsureForOrganization` to the existing import from
`@/services/billing-customer-sync`. The snapshot status is derived from `deletedAt`,
so passing the RESTORED row (deletedAt cleared) yields status ACTIVE automatically —
do NOT set status manually.

```ts
/**
 * Enqueue a Billing customer.ensure for a restored org. Best-effort (mirrors
 * archiveBillingCustomerForOrg): the snapshot status derives from the now-cleared
 * tombstone, so this un-archives the customer as ACTIVE.
 */
async function ensureBillingCustomerForOrg(org: {
  id: string
  name: string | null
  slug: string
  doingBusinessAs?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  primaryContactUserId?: string | null
}): Promise<void> {
  try {
    await enqueueCustomerEnsureForOrganization(
      { repository: createBillingCustomerSyncRepository() },
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        doingBusinessAs: org.doingBusinessAs ?? null,
        primaryEmail: org.primaryEmail ?? null,
        primaryPhone: org.primaryPhone ?? null,
        primaryContactUserId: org.primaryContactUserId ?? null,
      } as never,
      nowUnixSeconds()
    )
  } catch (error) {
    log.error(
      { err: error, organization_id: org.id },
      'organizations.ensure_billing_customer_failed'
    )
  }
}
```

NOTE: match the exact object-literal cast the existing `archiveBillingCustomerForOrg`
uses when calling its enqueue fn (copy that call's typing verbatim — if it passes a
plain object without `as never`, do the same). The point is type-parity with the
existing helper.

2c. Add the service function `restoreOrganization` right after `purgeOrganization`.
Import `serializeOrganization` is already used in this file — reuse it. Return type
`Promise<Organization>` (same as `retrieveOrganization`).

```ts
/**
 * Restore a soft-deleted org: clear its tombstone, un-cascade the memberships the
 * Delete closed, and re-register it in Billing as ACTIVE. Idempotent — restoring a
 * live org returns it unchanged with no side effects.
 */
export async function restoreOrganization(
  organizationId: string
): Promise<Organization> {
  const org = await repository.findOrganizationById(organizationId, true)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )

  // Idempotent: a live org is returned as-is; no membership or Billing side effects.
  if (org.deletedAt === null) return serializeOrganization(org)

  const closedAt = org.deletedAt
  const restoredMemberships = await repository.restoreMembershipsForOrg(
    organizationId,
    closedAt
  )
  const restored = await repository.restoreOrganization(organizationId)
  if (!restored)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )

  // Re-emit customer.ensure with the cleared tombstone → ACTIVE, un-archiving the
  // Billing customer. Best-effort; the reconcile sweep self-heals a hiccup.
  await ensureBillingCustomerForOrg(restored)

  log.info(
    {
      organization_id: organizationId,
      slug: restored.slug,
      memberships_restored: restoredMemberships,
    },
    'organizations.restore'
  )

  return serializeOrganization(restored)
}
```

Verify `org.deletedAt` is a `bigint | null` on OrganizationRow (it is — the delete
repo writes it). If TS complains it's not on the row type, cast via the same pattern
other fields use in this file.

---

## Part 3 — organizations controller + route

3a. Controller `restoreOrganization` after `purgeOrganization` (~line 165):

```ts
export async function restoreOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  res.status(200).json(await service.restoreOrganization(organization_id))
}
```

3b. Route: add a POST `/:organization_id/restore` in organizations.routes.ts, placed
just AFTER the purge delete block (before the generic `GET /:organization_id`), so the
literal `/restore` segment is registered before param-only routes. `organizationSchema`
and `organizationIdParamsSchema` are already imported in this file.

```ts
api.post({
  path: '/:organization_id/restore',
  security: 'admin',
  operationId: 'organizations-restore_organization',
  summary: 'Restore organization',
  description:
    'Restores a soft-deleted organization: clears the tombstone, re-opens the ' +
    'memberships the delete closed, and re-registers the Billing customer as active.',
  request: { params: organizationIdParamsSchema },
  responses: {
    200: { description: 'Organization restored.', schema: organizationSchema },
    404: { description: 'Organization not found.' },
  },
  handler: controller.restoreOrganization,
})
```

---

## Part 4 — users repository + controller + route

4a. users.repository.ts — add `restoreUser` after `softDeleteUser`:

```ts
/** Clear a user's tombstone. Returns the restored row, or null if it does not exist. */
export async function restoreUser(id: string): Promise<UserRow | null> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const row = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: now,
      },
      select: USER_SELECT,
    })
    return row as unknown as UserRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}
```

4b. users.controller.ts — add `ensureBillingCustomerForUser` mirroring
`archiveBillingCustomerForUser` (best-effort try/catch + log) but calling
`enqueueCustomerEnsureForUser` (add it to the existing import from
`@/services/billing-customer-sync`). Then add the `restoreUser` handler.

Users have NO membership cascade on delete (deleteUser only revokes sessions), so
restore is just: clear tombstone + ensure ACTIVE. Do NOT re-create sessions.

```ts
async function ensureBillingCustomerForUser(user: {
  id: string
  email: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  phone?: string | null
}): Promise<void> {
  try {
    await enqueueCustomerEnsureForUser(
      { repository: createBillingCustomerSyncRepository() },
      {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        phone: user.phone ?? null,
      } as never,
      nowUnixSeconds()
    )
  } catch (error) {
    log.error(
      { err: error, user_id: user.id },
      'users.ensure_billing_customer_failed'
    )
  }
}

export async function restoreUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const user = await repo.findUserById(user_id, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })

  // Idempotent: a live user is returned as-is with no side effects.
  if (user.deletedAt === null) {
    res.json(serializers.serializeUser(user))
    return
  }

  const restored = await repo.restoreUser(user_id)
  if (!restored)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })

  await ensureBillingCustomerForUser(restored)

  log.info({ user_id, email: restored.email }, 'users.restore')

  res.json(serializers.serializeUser(restored))
}
```

Match the exact object-literal typing (`as never` or not) that
`archiveBillingCustomerForUser`'s enqueue call uses — copy it verbatim.

4c. users.routes.ts — add POST `/:user_id/restore` just AFTER the purge block (before
`GET /:user_id`). `userSchema` and `userIdParamsSchema` are already imported.

```ts
api.post({
  path: '/:user_id/restore',
  security: 'admin',
  operationId: 'users-restore_user',
  summary: 'Restore user',
  description:
    'Restores a soft-deleted user: clears the tombstone and re-registers the ' +
    'Billing customer as active. The user must sign in again.',
  request: { params: userIdParamsSchema },
  responses: {
    200: { description: 'User restored.', schema: userSchema },
    404: docs.DELETE_USER_RESPONSES[404],
  },
  handler: controller.restoreUser,
})
```

---

## Part 5 — @876/admin client

5a. packages/admin/src/resources/orgs.ts — add a `restore(orgId)` method next to
`delete`/`purge`. It POSTs and returns the full Organization (not a tombstone). Look at
how the existing methods type their return (e.g. an `AdminOrganization` type) and reuse
that type. Pattern:

```ts
/**
 * Restores a soft-deleted organization (clears the tombstone, re-opens closed
 * memberships, re-activates the Billing customer). Returns the live organization.
 */
restore(orgId: string) {
  return adminRequest<AdminOrganization>(runtime, {
    method: 'POST',
    path: `/organizations/${encodeURIComponent(orgId)}/restore`,
  })
},
```

(Use whatever the org retrieve/list return type is named in this file — mirror
`retrieve`. Use `encodeURIComponent` if the existing methods do; match local style.)

5b. packages/admin/src/resources/users.ts — add `restore(userId)` next to
`delete`/`purge`, returning the full user (mirror `retrieve`'s return type):

```ts
/**
 * Restores a soft-deleted user (clears the tombstone, re-activates the Billing
 * customer). The user must sign in again. Returns the live user.
 */
restore(userId: string) {
  return adminRequest<AdminUser>(runtime, {
    method: 'POST',
    path: `/users/${encodeURIComponent(userId)}/restore`,
  })
},
```

Use the correct return type name used by `retrieve` in that file.

---

## Part 6 — tests

Add focused unit tests mirroring the existing delete tests' style/mock setup. Find
the existing delete/purge tests first (org module `__tests__/`, users module
`users-create.test.ts` neighbourhood) and copy their harness.

Org restore test — assert:

- restoring a deleted org clears the tombstone (repository.restoreOrganization called),
  calls restoreMembershipsForOrg with the org's `deletedAt`, enqueues a customer.ensure,
  and returns the serialized org.
- restoring a live (non-deleted) org is idempotent: no restoreMembershipsForOrg, no
  restoreOrganization, no ensure call; returns the org.
- restoring a missing org → notFound (`organization/not-found`).

User restore test — assert:

- restoring a deleted user clears the tombstone, enqueues customer.ensure, returns
  serialized user; does NOT touch sessions.
- restoring a live user is idempotent (no restoreUser, no ensure).
- missing user → 404 `user/not-found`.

Follow `.claude/rules/testing.md`: assert exact call args and both-sides shapes, no
weak `toBeDefined()`-only assertions.

---

## Verify (run all, must pass)

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
pnpm --filter @876/admin typecheck
```

The @876/api suite emits ~5 Prisma-Accelerate "fetch failed: bad port" unhandled
rejections in the sandbox (no DB) — environmental, not test failures. All tests pass.

Do NOT commit. Report exactly which files you changed and any deviations from this brief.
