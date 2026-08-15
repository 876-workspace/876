import type { Request, Response } from 'express'

import { getSettings, isPlatformOwnerEmail } from '@/config'
import { getPrincipal } from '@/http/auth'
import { AppHttpError } from '@/http/errors'
import { validBody, validQuery } from '@/http/middleware/validate'
import { generateId, generatePlatformOwnerUserId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'
import type { ProviderUser } from '@/providers/auth'
import { deleteProviderUser } from '@/services/identity-sync'
import { resolveMemberPermissions } from '@/services/provisioning'
import {
  enqueueCustomerArchiveForUser,
  enqueueCustomerEnsureForUser,
} from '@/services/billing-customer-sync'
import { createBillingCustomerSyncRepository } from '@/services/billing-customer-sync.repository'

import * as repo from './users.repository'
import * as service from './users.service'
import * as serializers from './users.serializers'
import type { UserCreateBody } from './users.schemas'

const log = getLogger('users')

async function requireSessionUserId(req: Request): Promise<string> {
  const principal = getPrincipal(req)
  if (principal.userId) return principal.userId
  throw new AppHttpError({
    code: 'auth/no-session',
    message: 'No active session.',
    httpStatus: 401,
  })
}

export async function retrieveCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const user = await service.requireUser(userId)
  res.json(serializers.serializeCurrentUser(user))
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    limit?: string
    startingAfter?: string
    endingBefore?: string
    search?: string
    includeDeleted?: string | boolean
    status?: string
    ids?: string | string[]
  }
  const limit = query.limit ? Number(query.limit) : 20
  const includeDeletedRaw = query.includeDeleted
  const includeDeleted =
    includeDeletedRaw === true || includeDeletedRaw === 'true'
  const principal = getPrincipal(req)
  const resolvedIncludeDeleted = principal.internal ? includeDeleted : false
  const status = query.status ?? null
  // Prefer validated ids (schema transforms csv → string[]), fallback to raw csv parsing.
  const validated = (
    req as unknown as { valid?: { query?: { ids?: string[] } } }
  ).valid?.query as { ids?: string[] } | undefined
  let ids: string[] | null = validated?.ids ?? null
  if (!ids && query.ids !== undefined) {
    if (typeof query.ids === 'string') {
      ids = query.ids
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    } else if (Array.isArray(query.ids)) {
      ids = query.ids
        .flatMap((v) =>
          v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .filter(Boolean)
    }
  if (ids && ids.length > 100) {
    throw new AppHttpError({
      code: 'request/invalid',
      message: 'Too many ids: maximum 100 allowed.',
      httpStatus: 400,
    })
  }
  if (query.search) {
    const rows = await repo.searchUsers({
      query: query.search,
      limit,
      status,
      includeDeleted: resolvedIncludeDeleted,
      ids: ids ?? undefined,
    })
    const companies = await repo.companiesForUsers(rows.map((r) => r.id))
    const data = rows.map((r) =>
      serializers.serializeUser(
        r,
        ...(companies.get(r.id) ?? [null, null, null])
      )
    res.json({
      object: 'list',
      data,
      has_more: false,
      url: '/users',
      totalCount: null,
    })
    return
  }
  const { data: rows, hasMore } = await repo.listUsers({
    limit,
    startingAfter: query.startingAfter,
    endingBefore: query.endingBefore,
    includeDeleted: resolvedIncludeDeleted,
    status,
    ids: ids ?? undefined,
  })
  const companies = await repo.companiesForUsers(rows.map((r) => r.id))
  const data = rows.map((r) =>
    serializers.serializeUser(r, ...(companies.get(r.id) ?? [null, null, null]))
  )
  res.json({
    object: 'list',
    data,
    has_more: hasMore,
    url: '/users',
    totalCount: null,
  })
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    query: string
    limit?: string
    status?: string
  }
  const limit = query.limit ? Number(query.limit) : 20
  const rows = await repo.searchUsers({
    query: query.query,
    limit,
    status: query.status ?? null,
  })
  const companies = await repo.companiesForUsers(rows.map((r) => r.id))
  const data = rows.map((r) =>
    serializers.serializeUser(r, ...(companies.get(r.id) ?? [null, null, null]))
  )
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: '/users/search',
    totalCount: null,
  })
}

export async function getUserByUsername(
  req: Request,
  res: Response
): Promise<void> {
  const { username } = req.params as { username: string }
  const query = req.query as unknown as { includeDeleted?: string | boolean }
  const includeDeletedRaw = query.includeDeleted
  const includeDeleted =
    includeDeletedRaw === true || includeDeletedRaw === 'true'
  const principal = getPrincipal(req)
  const resolved = principal.internal ? includeDeleted : false
  const user = await repo.findUserByUsername(username, resolved)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user found with that username.',
      httpStatus: 404,
    })
  const companies = await repo.companiesForUsers([user.id])
  res.json(
    serializers.serializeUser(
      user,
      ...(companies.get(user.id) ?? [null, null, null])
    )
}

export async function getUserByWorkosId(
  req: Request,
  res: Response
): Promise<void> {
  const { workosUserId } = req.params as { workosUserId: string }
  const user = await repo.findUserByWorkosId(workosUserId)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'User not found.',
      httpStatus: 404,
    })
  const companies = await repo.companiesForUsers([user.id])
  res.json(
    serializers.serializeUser(
      user,
      ...(companies.get(user.id) ?? [null, null, null])
    )
}

export async function retrieveUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const query = req.query as unknown as { includeDeleted?: string | boolean }
  const includeDeletedRaw = query.includeDeleted
  const includeDeleted =
    includeDeletedRaw === true || includeDeletedRaw === 'true'
  const principal = getPrincipal(req)
  const resolved = principal.internal ? includeDeleted : false
  const user = await repo.findUserById(userId, resolved)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const companies = await repo.companiesForUsers([user.id])
  res.json(
    serializers.serializeUser(
      user,
      ...(companies.get(user.id) ?? [null, null, null])
    )
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const body = validBody<UserCreateBody>(req)
  const email = body.email.toLowerCase().trim()
  if (await repo.findUserByEmail(email)) {
    throw new AppHttpError({
      code: 'user/duplicate-email',
      message: 'A user with this email already exists.',
      httpStatus: 409,
    })
  }

  // Resolve all local-only constraints before creating a provider identity. A
  // rejected username must not leave an orphaned WorkOS user behind.
  const username = body.username
    ? await service.assertUsernameAvailable(body.username)
    : await service.uniqueUsername(
        service.normalizeUsername(email.split('@', 1)[0] ?? 'user'),
        new Set<string>(),
        null
      )

  const settings = getSettings()
  const authProvider = getAuthProvider(settings)

  // WorkOS may already own the identity even when the local database does not,
  // for example after a partial migration or an interrupted reconciliation.
  // Adopt that identity instead of attempting a duplicate provider create.
  let workosUser: ProviderUser
  let workosUserCreated = false
  try {
    const existingWorkosUser = await authProvider.getUserByEmail(email)
    if (existingWorkosUser) {
      workosUser = existingWorkosUser
    } else {
      workosUser = await authProvider.register({
        email,
        firstName: body.firstName,
        lastName: body.lastName,
        emailVerified: false,
      })
      workosUserCreated = true
    }
  } catch (error) {
    if (error instanceof AppHttpError) throw error
    log.error({ err: error, email }, 'workos.create_user failed')
    throw new AppHttpError({
      code: 'user/provider-error',
      message: 'Could not create user in the identity provider.',
      httpStatus: 502,
    })
  }

  if (!workosUser.id) {
    log.error({ email }, 'workos.create_user returned no id')
    throw new AppHttpError({
      code: 'user/provider-error',
      message: 'Could not create user in the identity provider.',
      httpStatus: 502,
    })
  }
  const workosUserId = workosUser.id

  // Password-setup email, best-effort: the account is usable and the address
  // can be verified later, whereas raising here strands a user that was
  // already created in the provider.
  if (settings.workos.clientId) {
    try {
      await authProvider.sendRecovery(email, settings.workos.clientId)
    } catch (error) {
      log.warn(
        { err: error, email, workosUserId: workosUserId },
        'workos.password_reset_email failed'
      )
    }

  const now = BigInt(nowUnixSeconds())
  const isOwner = isPlatformOwnerEmail(email)
  const userId = isOwner ? generatePlatformOwnerUserId() : generateId('user')

  let user: repo.UserRow
  try {
    user = await repo.createUser({
      id: userId,
      workosUserId,
      email,
      username,
      emailVerified: body.emailVerified ?? workosUser.emailVerified,
      firstName: workosUser.firstName || body.firstName,
      lastName: workosUser.lastName || body.lastName,
      middleName: body.middleName ?? null,
      avatar: body.avatar ?? workosUser.avatar,
      role: isOwner ? 'owner' : 'user',
      platformRole: isOwner ? 'owner' : null,
      status: body.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    if (workosUserCreated)
      await deleteProviderUser(authProvider, workosUserId, {
        localUserId: userId,
      })
    throw error
  }

  await repo.createProfileForUser(userId, now)

  log.info(
    { userId: userId, email, workosUserId: workosUserId },
    'users.create'
  )

  res.status(201).json(serializers.serializeUser(user))
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const body = req.body as Record<string, unknown>
  const user = await repo.findUserById(userId)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const updateData: Record<string, unknown> = {}
  const explicitlySet = new Set(Object.keys(body))
  if (body.email !== undefined && body.email !== null)
    updateData.email = body.email
  if (explicitlySet.has('username')) {
    if (body.username === null) updateData.username = null
    else if (typeof body.username === 'string')
      updateData.username = await service.assertUsernameAvailable(
        body.username as string,
        userId
      )
  }
  if (body.firstName !== undefined && body.firstName !== null)
    updateData.firstName = body.firstName
  if (body.lastName !== undefined && body.lastName !== null)
    updateData.lastName = body.lastName
  if (explicitlySet.has('middleName')) updateData.middleName = body.middleName
  if (explicitlySet.has('avatar')) updateData.avatar = body.avatar
  if (explicitlySet.has('avatarFileId'))
    updateData.avatarFileId = body.avatarFileId
  if (body.status !== undefined && body.status !== null)
    updateData.status = body.status
  if (explicitlySet.has('stripeCustomerId'))
    updateData.stripeCustomerId = body.stripeCustomerId
  if (body.emailVerified !== undefined && body.emailVerified !== null)
    updateData.emailVerified = body.emailVerified
  let updated = user
  let localSaveSucceeded = false
  if (Object.keys(updateData).length > 0) {
    const now = BigInt(nowUnixSeconds())
    const saved = await repo.updateUser(userId, {
      ...updateData,
      updatedAt: now,
    } as never)
    if (saved) {
      updated = saved
      localSaveSucceeded = true
    }

  // Push profile edits back to WorkOS (source of record) so a later sync does not
  // revert them. Best-effort: a WorkOS hiccup must not fail an update the DB already
  // applied; inbound WorkOS webhooks reconcile eventually.
  const profilePushed =
    updateData.firstName !== undefined ||
    updateData.lastName !== undefined ||
    updateData.email !== undefined
  if (profilePushed && localSaveSucceeded && updated.workosUserId) {
    try {
      const settings = getSettings()
      const authProvider = getAuthProvider(settings)
      await authProvider.updateUser(updated.workosUserId, {
        ...(updateData.firstName !== undefined
          ? { firstName: updateData.firstName as string | null }
          : {}),
        ...(updateData.lastName !== undefined
          ? { lastName: updateData.lastName as string | null }
          : {}),
        ...(updateData.email !== undefined
          ? { email: updateData.email as string | null }
          : {}),
      })
    } catch (error) {
      log.warn(
        { err: error, userId, workosUserId: updated.workosUserId },
        'users.workos_profile_push_failed'
      )
    }

  res.json(serializers.serializeUser(updated))
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const query = req.query as unknown as { deletedBy?: string; reason?: string }
  const user = await repo.findUserById(userId, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  await repo.softDeleteUser(
    userId,
    query.deletedBy ?? null,
    query.reason ?? null
  )

  // A reversible Delete leaves the WorkOS user in place — WorkOS is the source
  // of record and Delete is recoverable. The tombstone is what blocks the
  // account: `ensureFromWorkos` refuses to seal a session for a deleted workosId
  // or email, and the app session guards reject a deleted account. Only Purge
  // removes the provider user. (`.claude/rules/deletions.md` + ADR-012 §D1.)
  // Revoke any live sessions immediately so an already-signed-in tab is cut off
  // rather than waiting for its next guarded navigation.
  await repo.deleteAllSessionsForUser(userId)

  await archiveBillingCustomerForUser(user)

  log.info({ userId, email: user.email }, 'users.delete')

  res.json({ object: 'user', id: userId, deleted: true })
}

/**
 * Enqueue a Billing customer archive for a user (only meaningful when an app
 * previously enrolled them as a customer). Best-effort: a failure is logged, not
 * raised, so it never fails the delete/purge.
 */
async function archiveBillingCustomerForUser(user: {
  id: string
  email: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  phone?: string | null
}): Promise<void> {
  try {
    await enqueueCustomerArchiveForUser(
      { repository: createBillingCustomerSyncRepository() },
      {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        phone: user.phone ?? null,
      },
      nowUnixSeconds()
    )
  } catch (error) {
    log.error(
      { err: error, userId: user.id },
      'users.archive_billing_customer_failed'
    )
  }

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
      },
      nowUnixSeconds()
    )
  } catch (error) {
    log.error(
      { err: error, userId: user.id },
      'users.ensure_billing_customer_failed'
    )
  }

export async function purgeUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const user = await repo.findUserById(userId, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  // Archive the Billing customer before the row is gone, then hard-delete.
  await archiveBillingCustomerForUser(user)
  await repo.deleteAllSessionsForUser(userId)
  await repo.purgeUser(userId)

  // Purge is destructive: remove the WorkOS user too.
  await deleteProviderUser(getAuthProvider(getSettings()), user.workosUserId, {
    localUserId: user.id,
  })

  log.info({ userId, email: user.email }, 'users.purge')

  res.json({ object: 'user', id: userId, deleted: true })
}

export async function restoreUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const user = await repo.findUserById(userId, true)
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

  const restored = await repo.restoreUser(userId)
  if (!restored)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })

  await ensureBillingCustomerForUser(restored)

  log.info({ userId, email: restored.email }, 'users.restore')

  res.json(serializers.serializeUser(restored))
}

export async function banUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const body = req.body as { reason?: string | null } | undefined
  const user = await repo.findUserById(userId)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const updated = await repo.setBanned(userId, true, body?.reason ?? null)
  await repo.deleteAllSessionsForUser(userId)
  const companies = await repo.companiesForUsers([userId])
  res.json(
    serializers.serializeUser(
      (updated ?? user) as never,
      ...(companies.get(userId) ?? [null, null, null])
    )
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  const user = await repo.findUserById(userId)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const updated = await repo.setBanned(userId, false)
  const companies = await repo.companiesForUsers([userId])
  res.json(
    serializers.serializeUser(
      (updated ?? user) as never,
      ...(companies.get(userId) ?? [null, null, null])
    )
}

export async function backfillUsernames(
  _req: Request,
  res: Response
): Promise<void> {
  const result = await service.backfillUsernames()
  res.json({ updated: result.updated, ids: result.ids })
}

export async function ensureUser(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    workosUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    avatar?: string | null
    emailVerified?: boolean | null
  }
  const existing = await repo.findUserByWorkosId(body.workosUserId)
  if (existing) {
    res.json(serializers.serializeEnsuredUser(existing))
    return
  }
  // check deleted tombstone: try to assert not deleted
  try {
    await repo.assertNotDeleted({
      workosUserId: body.workosUserId,
      email: body.email,
    })
  } catch {
    throw new AppHttpError({
      code: 'user/deleted',
      message: 'User has been deleted.',
      httpStatus: 410,
    })
  }
  const now = BigInt(nowUnixSeconds())
  const email = body.email.toLowerCase().trim()
  const firstName = body.firstName ?? email.split('@')[0] ?? 'User'
  const lastName = body.lastName ?? 'User'
  const isOwner = isPlatformOwnerEmail(email)
  const userId = isOwner ? generatePlatformOwnerUserId() : generateId('user')
  let ensuredUsername: string | null = null
  if (body.username) {
    const { available } = await service.evaluateUsername(body.username)
    if (available) ensuredUsername = body.username.trim().toLowerCase()
  }
  const user = await repo.createUser({
    id: userId,
    workosUserId: body.workosUserId,
    email,
    username: ensuredUsername,
    emailVerified: body.emailVerified ?? false,
    firstName,
    lastName,
    middleName: null,
    avatar: body.avatar ?? null,
    role: isOwner ? 'owner' : 'user',
    platformRole: isOwner ? 'owner' : null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })
  await repo.createProfileForUser(userId, now)

  res.json(serializers.serializeEnsuredUser(user))
}

export async function listUserApps(req: Request, res: Response): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const enrollments = (await repo.listUserApps(
    userId
  )) as unknown as import('./users.serializers').UserAppEnrollmentRow[]
  const data = enrollments.map((e) => serializers.serializeUserApp(e))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${userId}/apps`,
    totalCount: data.length,
  })
}

export async function listUserAppsBatch(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<{ user_ids: string[] }>(req)
  const userIds = (query as { user_ids: string[] }).user_ids
  const groups = await service.listUserAppsBatch(userIds)
  const data = groups.map((g) => ({
    object: 'user_apps' as const,
    userId: g.userId,
    data: (
      g.enrollments as unknown as import('./users.serializers').UserAppEnrollmentRow[]
    ).map((e) => serializers.serializeUserApp(e)),
  }))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: '/users/apps',
    totalCount: data.length,
  })
}

export async function listUserFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const rows = (await repo.listUserFeatures(
    userId
  )) as unknown as import('./users.serializers').UserFeatureRow[]
  const data = rows.map((r) => serializers.serializeUserFeature(r))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${userId}/features`,
    totalCount: null,
  })
}

export async function grantUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  const body = req.body as { featureId: string; note?: string | null }
  const row = (await service.grantUserFeature(
    userId,
    body.featureId,
    true,
    body.note ?? null
  )) as unknown as import('./users.serializers').UserFeatureRow
  res.status(201).json(serializers.serializeUserFeature(row))
}

export async function disableUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, featureId } = req.params as {
    userId: string
    featureId: string
  }
  const query = req.query as unknown as { note?: string }
  const row = (await service.grantUserFeature(
    userId,
    featureId,
    false,
    query.note ?? null
  )) as unknown as import('./users.serializers').UserFeatureRow
  res.json(serializers.serializeUserFeature(row))
}

export async function checkUsernameAvailability(
  req: Request,
  res: Response
): Promise<void> {
  const query = req.query as unknown as {
    username: string
    exclude_user_id?: string
  }
  const result = await service.evaluateUsername(
    query.username,
    query.exclude_user_id ?? null
  )
  res.json({
    object: 'username_availability',
    username: query.username.trim().toLowerCase(),
    available: result.available,
    code: result.code,
    reason: result.reason,
  })
}

export async function listReservedUsernames(
  _req: Request,
  res: Response
): Promise<void> {
  const rows = await repo.listReservedUsernames()
  const data = rows.map((r) => serializers.serializeReservedUsername(r))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: '/users/reserved-usernames',
    totalCount: data.length,
  })
}

export async function createReservedUsername(
  req: Request,
  res: Response
): Promise<void> {
  const body = req.body as { username: string; reason?: string | null }
  const candidate = service.validateUsernameFormat(body.username)
  if (await repo.isReservedUsername(candidate)) {
    throw new AppHttpError({
      code: 'reserved_username/already-exists',
      message: 'This username is already on the reserved list.',
      httpStatus: 409,
    })
  }
  const row = await repo.createReservedUsername(candidate, body.reason ?? null)
  res.status(201).json(serializers.serializeReservedUsername(row))
}

export async function deleteReservedUsername(
  req: Request,
  res: Response
): Promise<void> {
  const { username } = req.params as { username: string }
  const deleted = await repo.deleteReservedUsername(username)
  if (!deleted)
    throw new AppHttpError({
      code: 'reserved_username/not-found',
      message: 'No reserved username found with this value.',
      httpStatus: 404,
    })
  res.json({
    object: 'reserved_username',
    username: username.toLowerCase().trim(),
    deleted: true,
  })
}

export async function listUserAccounts(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const rows = (await repo.listAccountsForUser(
    userId
  )) as unknown as import('./users.serializers').AccountRow[]
  const data = rows.map((r) => serializers.serializeAccount(r as never))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${userId}/accounts`,
    totalCount: data.length,
  })
}

export async function unlinkUserAccount(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, accountId } = req.params as {
    userId: string
    accountId: string
  }
  await service.requireUser(userId)
  const account = await repo.findAccount(userId, accountId)
  if (!account)
    throw new AppHttpError({
      code: 'account/not-found',
      message: 'No linked account found with this ID for the specified user.',
      httpStatus: 404,
    })
  await repo.deleteAccount(userId, accountId)
  res.json({ object: 'account', id: accountId, deleted: true })
}

export async function revokeUserSessions(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  await service.requireUser(userId)
  const revoked = await repo.deleteAllSessionsForUser(userId)
  res.json({ object: 'session_revoke', userId, sessionsRevoked: revoked })
}

export async function getUserOauthGrants(
  req: Request,
  res: Response
): Promise<void> {
  const { userId } = req.params as { userId: string }
  const principal = getPrincipal(req)
  if (!(principal.internal || principal.userId === userId))
    throw new AppHttpError({
      code: 'auth/forbidden',
      message: 'Forbidden.',
      httpStatus: 403,
    })
  if (!userId)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'userId is required.',
      httpStatus: 400,
    })
  const rows = (await repo.listOauthGrants(
    userId
  )) as unknown as import('./users.serializers').OauthGrantRow[]
  const data = rows.map((r) => serializers.serializeAuthorizedApp(r))
  res.json(data)
}

export async function revokeUserOauthGrant(
  req: Request,
  res: Response
): Promise<void> {
  const { userId, grantId } = req.params as {
    userId: string
    grantId: string
  }
  const principal = getPrincipal(req)
  if (!(principal.internal || principal.userId === userId))
    throw new AppHttpError({
      code: 'auth/forbidden',
      message: 'Forbidden.',
      httpStatus: 403,
    })
  const ok = await repo.revokeOauthGrant(grantId, userId)
  if (!ok)
    throw new AppHttpError({
      code: 'oauth-grant/not-found',
      message: 'No active OAuth grant exists with the provided identifier.',
      httpStatus: 404,
    })
  res.json({ revoked: true })
}

// Profile / addresses / contacts delegated to other controllers but we keep wrappers
export async function retrieveMyProfile(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const user = await service.requireUser(userId)
  let profile = await repo.findProfileByUserId(userId)
  if (!profile) profile = await repo.ensureProfile(userId)
  res.json(serializers.serializeConsumerProfile(user, profile))
}

export async function updateMyProfile(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const user = await service.requireUser(userId)
  let profile = await repo.findProfileByUserId(userId)
  if (!profile) profile = await repo.ensureProfile(userId)
  const body = req.body as Record<string, unknown>
  const userUpdates: Record<string, unknown> = {}
  const profileUpdates: Record<string, unknown> = {}
  for (const f of ['firstName', 'lastName', 'middleName', 'avatar'])
    if (f in body)
      (userUpdates as Record<string, unknown>)[
        f === 'firstName'
          ? 'firstName'
          : f === 'lastName'
            ? 'lastName'
            : f === 'middleName'
              ? 'middleName'
              : 'avatar'
      ] = body[f]
  for (const f of [
    'nickname',
    'gender',
    'phoneNumber',
    'dateOfBirth',
    'language',
    'timezone',
  ])
    if (f in body) {
      const map: Record<string, string> = {
        phoneNumber: 'phoneNumber',
        dateOfBirth: 'dateOfBirth',
      }
      ;(profileUpdates as Record<string, unknown>)[map[f] ?? f] = body[f]
    }
  if (Object.keys(userUpdates).length > 0) {
    const updated = await repo.updateUser(userId, {
      ...userUpdates,
      updatedAt: BigInt(nowUnixSeconds()),
    } as never)
    if (updated) Object.assign(user, updated)
  }
  if (Object.keys(profileUpdates).length > 0) {
    const updated = await repo.updateProfile(profile.id, {
      ...profileUpdates,
      updatedAt: BigInt(nowUnixSeconds()),
    } as never)
    if (updated) profile = updated
  }
  res.json(serializers.serializeConsumerProfile(user, profile))
}

export async function listMyAddresses(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const rows = await repo.listAddressesByUser(userId)
  res.json({
    object: 'list',
    data: rows.map((r: unknown) => serializers.serializeAddress(r as never)),
    has_more: false,
    url: '/users/me/addresses',
    totalCount: null,
  })
}

export async function createMyAddress(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  await service.requireUser(userId)
  const body = req.body as Record<string, unknown>
  const now = BigInt(nowUnixSeconds())
  const address = await repo.createAddress({
    id: generateId('address'),
    userId,
    organizationId: null,
    type: (body.type as string) ?? 'other',
    label: body.label ?? null,
    line1: body.line1 ?? null,
    line2: body.line2 ?? null,
    city: body.city ?? null,
    regionId: body.regionId ?? null,
    countryCode: body.countryCode ?? null,
    postalCode: body.postalCode ?? null,
    isDefault: body.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  } as never)
  res.status(201).json(serializers.serializeAddress(address as never))
}

export async function retrieveMyAddress(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { addressId } = req.params as { addressId: string }
  const address = await repo.getAddressForUser(addressId, userId)
  if (!address)
    throw new AppHttpError({
      code: 'address/not-found',
      message: 'Address not found.',
      httpStatus: 404,
    })
  res.json(serializers.serializeAddress(address as never))
}

export async function updateMyAddress(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { addressId } = req.params as { addressId: string }
  const body = req.body as Record<string, unknown>
  if (Object.keys(body).length === 0)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  const updated = await repo.updateAddressForUser(addressId, userId, {
    ...body,
    updatedAt: BigInt(nowUnixSeconds()),
  } as never)
  if (!updated)
    throw new AppHttpError({
      code: 'address/not-found',
      message: 'Address not found.',
      httpStatus: 404,
    })
  res.json(serializers.serializeAddress(updated as never))
}

export async function deleteMyAddress(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { addressId } = req.params as { addressId: string }
  const deleted = await repo.deleteAddressForUser(addressId, userId)
  if (!deleted)
    throw new AppHttpError({
      code: 'address/not-found',
      message: 'Address not found.',
      httpStatus: 404,
    })
  res.json({ object: 'address', id: addressId, deleted: true })
}

export async function listMyContacts(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const rows = await repo.listContactsByOwner(userId)
  res.json({
    object: 'list',
    data: rows.map((r: unknown) => serializers.serializeContact(r as never)),
    has_more: false,
    url: '/users/me/contacts',
    totalCount: null,
  })
}

export async function createMyContact(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const body = req.body as {
    contactUserId: string
    nickname?: string | null
    notes?: string | null
  }
  await service.requireUser(userId)
  const contactUser = await service.requireUser(body.contactUserId)
  if (userId === body.contactUserId)
    throw new AppHttpError({
      code: 'contact/self-contact',
      message: 'A user cannot save themself as a contact.',
      httpStatus: 400,
    })
  if (await repo.getContactByPair(userId, body.contactUserId))
    throw new AppHttpError({
      code: 'contact/already-exists',
      message: 'This user is already saved as a contact.',
      httpStatus: 409,
    })
  const now = BigInt(nowUnixSeconds())
  const contact = await repo.createContact({
    id: generateId('contact'),
    ownerUserId: userId,
    contactUserId: contactUser.id,
    nickname: body.nickname ?? null,
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  } as never)
  res.status(201).json(serializers.serializeContact(contact as never))
}

export async function retrieveMyContact(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { contactId } = req.params as { contactId: string }
  const contact = await repo.getContactForOwner(contactId, userId)
  if (!contact)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  res.json(serializers.serializeContact(contact as never))
}

export async function updateMyContact(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { contactId } = req.params as { contactId: string }
  const body = req.body as Record<string, unknown>
  if (Object.keys(body).length === 0)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  const updated = await repo.updateContactForOwner(contactId, userId, {
    ...body,
    updatedAt: BigInt(nowUnixSeconds()),
  } as never)
  if (!updated)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  const loaded = await repo.getContactForOwner(contactId, userId)
  if (!loaded)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  res.json(serializers.serializeContact(loaded as never))
}

export async function deleteMyContact(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const { contactId } = req.params as { contactId: string }
  const deleted = await repo.deleteContactForOwner(contactId, userId)
  if (!deleted)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  res.json({ object: 'user_contact', id: contactId, deleted: true })
}

export async function listMyMemberships(
  req: Request,
  res: Response
): Promise<void> {
  const userId = await requireSessionUserId(req)
  const query = req.query as unknown as { status?: string }
  const rows = await repo.listMembershipsWithOrganization(
    userId,
    query.status ? query.status.trim() : null
  )

  const data = await Promise.all(
    rows.map(async (membership) => {
      const permissions = await resolveMemberPermissions(membership)
      return {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        permissions: [...permissions].sort(),
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          status: membership.organization.status,
          logoUrl: membership.organization.logoUrl,
        },
      }
    })
  )
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: '/users/me/memberships',
    totalCount: null,
  })
}
