import type { Request, Response } from 'express'

import { getSettings, isPlatformOwnerEmail } from '@/config'
import { getPrincipal } from '@/http/auth'
import { AppHttpError } from '@/http/errors'
import { validBody } from '@/http/middleware/validate'
import { generateId, generatePlatformOwnerUserId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'
import { getWorkOsClient } from '@/providers/workos/client'
import { deleteProviderUser } from '@/services/identity-sync'
import { resolveMemberPermissions } from '@/services/provisioning'

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
    starting_after?: string
    ending_before?: string
    search?: string
    include_deleted?: string | boolean
    status?: string
  }
  const limit = query.limit ? Number(query.limit) : 20
  const includeDeletedRaw = query.include_deleted
  const includeDeleted =
    includeDeletedRaw === true || includeDeletedRaw === 'true'
  const principal = getPrincipal(req)
  const resolvedIncludeDeleted = principal.internal ? includeDeleted : false
  const status = query.status ?? null
  if (query.search) {
    const rows = await repo.searchUsers({
      query: query.search,
      limit,
      status,
      includeDeleted: resolvedIncludeDeleted,
    })
    const companies = await repo.companiesForUsers(rows.map((r) => r.id))
    const data = rows.map((r) =>
      serializers.serializeUser(
        r,
        ...(companies.get(r.id) ?? [null, null, null])
      )
    )
    res.json({
      object: 'list',
      data,
      has_more: false,
      url: '/users',
      total_count: null,
    })
    return
  }
  const { data: rows, hasMore } = await repo.listUsers({
    limit,
    starting_after: query.starting_after,
    ending_before: query.ending_before,
    includeDeleted: resolvedIncludeDeleted,
    status,
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
    total_count: null,
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
    total_count: null,
  })
}

export async function getUserByUsername(
  req: Request,
  res: Response
): Promise<void> {
  const { username } = req.params as { username: string }
  const query = req.query as unknown as { include_deleted?: string | boolean }
  const includeDeletedRaw = query.include_deleted
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
  )
}

export async function getUserByWorkosId(
  req: Request,
  res: Response
): Promise<void> {
  const { workos_user_id } = req.params as { workos_user_id: string }
  const user = await repo.findUserByWorkosId(workos_user_id)
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
  )
}

export async function retrieveUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const query = req.query as unknown as { include_deleted?: string | boolean }
  const includeDeletedRaw = query.include_deleted
  const includeDeleted =
    includeDeletedRaw === true || includeDeletedRaw === 'true'
  const principal = getPrincipal(req)
  const resolved = principal.internal ? includeDeleted : false
  const user = await repo.findUserById(user_id, resolved)
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

  const settings = getSettings()
  const workos = getWorkOsClient(settings)

  // A provider failure aborts the whole operation. The alternative a draft of
  // this port took — inventing a local id when WorkOS is unreachable — writes a
  // user row whose `workos_user_id` points at nothing, so the account exists,
  // looks healthy in Console, and can never sign in.
  let workosUser: Record<string, unknown>
  try {
    workosUser = await workos.createUser({
      email,
      firstName: body.first_name,
      lastName: body.last_name,
      emailVerified: false,
    })
  } catch (error) {
    if (error instanceof AppHttpError) throw error
    log.error({ err: error, email }, 'workos.create_user failed')
    throw new AppHttpError({
      code: 'user/provider-error',
      message: 'Could not create user in the identity provider.',
      httpStatus: 502,
    })
  }

  const workosUserId = workosUser['id']
  if (typeof workosUserId !== 'string' || !workosUserId) {
    log.error({ email }, 'workos.create_user returned no id')
    throw new AppHttpError({
      code: 'user/provider-error',
      message: 'Could not create user in the identity provider.',
      httpStatus: 502,
    })
  }

  // Password-setup email, best-effort: the account is usable and the address
  // can be verified later, whereas raising here strands a user that was
  // already created in the provider.
  if (settings.workos.clientId) {
    try {
      await workos.createPasswordReset(email, settings.workos.clientId)
    } catch (error) {
      log.warn(
        { err: error, email, workos_user_id: workosUserId },
        'workos.password_reset_email failed'
      )
    }
  }

  // An explicitly chosen username is rejected if invalid, reserved, or taken; a
  // derived one is normalized and made unique.
  const username = body.username
    ? await service.assertUsernameAvailable(body.username)
    : await service.uniqueUsername(
        service.normalizeUsername(email.split('@', 1)[0] ?? 'user'),
        new Set<string>(),
        null
      )

  const now = BigInt(nowUnixSeconds())
  const isOwner = isPlatformOwnerEmail(email)
  const userId = isOwner ? generatePlatformOwnerUserId() : generateId('user')

  const user = await repo.createUser({
    id: userId,
    workosUserId,
    email,
    username,
    emailVerified: body.email_verified ?? false,
    firstName: body.first_name,
    lastName: body.last_name,
    middleName: body.middle_name ?? null,
    avatar: body.avatar ?? null,
    role: isOwner ? 'owner' : 'user',
    platformRole: isOwner ? 'owner' : null,
    status: body.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  })

  await repo.createProfileForUser(userId, now)

  log.info(
    { user_id: userId, email, workos_user_id: workosUserId },
    'users.create'
  )

  res.status(201).json(serializers.serializeUser(user))
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const body = req.body as Record<string, unknown>
  const user = await repo.findUserById(user_id)
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
        user_id
      )
  }
  if (body.first_name !== undefined && body.first_name !== null)
    updateData.firstName = body.first_name
  if (body.last_name !== undefined && body.last_name !== null)
    updateData.lastName = body.last_name
  if (explicitlySet.has('middle_name')) updateData.middleName = body.middle_name
  if (explicitlySet.has('avatar')) updateData.avatar = body.avatar
  if (explicitlySet.has('avatar_file_id'))
    updateData.avatarFileId = body.avatar_file_id
  if (body.status !== undefined && body.status !== null)
    updateData.status = body.status
  if (explicitlySet.has('stripe_customer_id'))
    updateData.stripeCustomerId = body.stripe_customer_id
  if (body.email_verified !== undefined && body.email_verified !== null)
    updateData.emailVerified = body.email_verified
  let updated = user
  if (Object.keys(updateData).length > 0) {
    const now = BigInt(nowUnixSeconds())
    const saved = await repo.updateUser(user_id, {
      ...updateData,
      updatedAt: now,
    } as never)
    if (saved) updated = saved
  }
  res.json(serializers.serializeUser(updated))
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const query = req.query as unknown as { deleted_by?: string; reason?: string }
  const user = await repo.findUserById(user_id, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  await repo.softDeleteUser(
    user_id,
    query.deleted_by ?? null,
    query.reason ?? null
  )

  // A tombstoned account must not be able to authenticate, and WorkOS has no
  // "disable" state — deleting the provider user is what revokes the
  // credentials. The local row survives as the tombstone of record. Running it
  // after the local write means a provider failure rolls the tombstone back
  // rather than leaving the account half-deleted and still able to sign in.
  await deleteProviderUser(getAuthProvider(getSettings()), user.workosUserId, {
    localUserId: user.id,
  })

  log.info({ user_id, email: user.email }, 'users.delete')

  res.json({ object: 'user', id: user_id, deleted: true })
}

export async function purgeUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const user = await repo.findUserById(user_id, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  await repo.purgeUser(user_id)

  await deleteProviderUser(getAuthProvider(getSettings()), user.workosUserId, {
    localUserId: user.id,
  })

  log.info({ user_id, email: user.email }, 'users.purge')

  res.json({ object: 'user', id: user_id, deleted: true })
}

export async function banUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const body = req.body as { reason?: string | null } | undefined
  const user = await repo.findUserById(user_id)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const updated = await repo.setBanned(user_id, true, body?.reason ?? null)
  await repo.deleteAllSessionsForUser(user_id)
  const companies = await repo.companiesForUsers([user_id])
  res.json(
    serializers.serializeUser(
      (updated ?? user) as never,
      ...(companies.get(user_id) ?? [null, null, null])
    )
  )
}

export async function unbanUser(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const user = await repo.findUserById(user_id)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const updated = await repo.setBanned(user_id, false)
  const companies = await repo.companiesForUsers([user_id])
  res.json(
    serializers.serializeUser(
      (updated ?? user) as never,
      ...(companies.get(user_id) ?? [null, null, null])
    )
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
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const enrollments = (await repo.listUserApps(
    user_id
  )) as unknown as import('./users.serializers').UserAppEnrollmentRow[]
  const data = enrollments.map((e) => serializers.serializeUserApp(e))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${user_id}/apps`,
    total_count: data.length,
  })
}

export async function listUserFeatures(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const rows = (await repo.listUserFeatures(
    user_id
  )) as unknown as import('./users.serializers').UserFeatureRow[]
  const data = rows.map((r) => serializers.serializeUserFeature(r))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${user_id}/features`,
    total_count: null,
  })
}

export async function grantUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const body = req.body as { feature_id: string; note?: string | null }
  const row = (await service.grantUserFeature(
    user_id,
    body.feature_id,
    true,
    body.note ?? null
  )) as unknown as import('./users.serializers').UserFeatureRow
  res.status(201).json(serializers.serializeUserFeature(row))
}

export async function disableUserFeature(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, feature_id } = req.params as {
    user_id: string
    feature_id: string
  }
  const query = req.query as unknown as { note?: string }
  const row = (await service.grantUserFeature(
    user_id,
    feature_id,
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
    total_count: data.length,
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
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const rows = (await repo.listAccountsForUser(
    user_id
  )) as unknown as import('./users.serializers').AccountRow[]
  const data = rows.map((r) => serializers.serializeAccount(r as never))
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: `/users/${user_id}/accounts`,
    total_count: data.length,
  })
}

export async function unlinkUserAccount(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, account_id } = req.params as {
    user_id: string
    account_id: string
  }
  await service.requireUser(user_id)
  const account = await repo.findAccount(user_id, account_id)
  if (!account)
    throw new AppHttpError({
      code: 'account/not-found',
      message: 'No linked account found with this ID for the specified user.',
      httpStatus: 404,
    })
  await repo.deleteAccount(user_id, account_id)
  res.json({ object: 'account', id: account_id, deleted: true })
}

export async function revokeUserSessions(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  await service.requireUser(user_id)
  const revoked = await repo.deleteAllSessionsForUser(user_id)
  res.json({ object: 'session_revoke', user_id, sessions_revoked: revoked })
}

export async function getUserOauthGrants(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id } = req.params as { user_id: string }
  const principal = getPrincipal(req)
  if (!(principal.internal || principal.userId === user_id))
    throw new AppHttpError({
      code: 'auth/forbidden',
      message: 'Forbidden.',
      httpStatus: 403,
    })
  if (!user_id)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'userId is required.',
      httpStatus: 400,
    })
  const rows = (await repo.listOauthGrants(
    user_id
  )) as unknown as import('./users.serializers').OauthGrantRow[]
  const data = rows.map((r) => serializers.serializeAuthorizedApp(r))
  res.json(data)
}

export async function revokeUserOauthGrant(
  req: Request,
  res: Response
): Promise<void> {
  const { user_id, grant_id } = req.params as {
    user_id: string
    grant_id: string
  }
  const principal = getPrincipal(req)
  if (!(principal.internal || principal.userId === user_id))
    throw new AppHttpError({
      code: 'auth/forbidden',
      message: 'Forbidden.',
      httpStatus: 403,
    })
  const ok = await repo.revokeOauthGrant(grant_id, user_id)
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
  for (const f of ['first_name', 'last_name', 'middle_name', 'avatar'])
    if (f in body)
      (userUpdates as Record<string, unknown>)[
        f === 'first_name'
          ? 'firstName'
          : f === 'last_name'
            ? 'lastName'
            : f === 'middle_name'
              ? 'middleName'
              : 'avatar'
      ] = body[f]
  for (const f of [
    'nickname',
    'gender',
    'phone_number',
    'date_of_birth',
    'language',
    'timezone',
  ])
    if (f in body) {
      const map: Record<string, string> = {
        phone_number: 'phoneNumber',
        date_of_birth: 'dateOfBirth',
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
    total_count: null,
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
  const { address_id } = req.params as { address_id: string }
  const address = await repo.getAddressForUser(address_id, userId)
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
  const { address_id } = req.params as { address_id: string }
  const body = req.body as Record<string, unknown>
  if (Object.keys(body).length === 0)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  const updated = await repo.updateAddressForUser(address_id, userId, {
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
  const { address_id } = req.params as { address_id: string }
  const deleted = await repo.deleteAddressForUser(address_id, userId)
  if (!deleted)
    throw new AppHttpError({
      code: 'address/not-found',
      message: 'Address not found.',
      httpStatus: 404,
    })
  res.json({ object: 'address', id: address_id, deleted: true })
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
    total_count: null,
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
  const { contact_id } = req.params as { contact_id: string }
  const contact = await repo.getContactForOwner(contact_id, userId)
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
  const { contact_id } = req.params as { contact_id: string }
  const body = req.body as Record<string, unknown>
  if (Object.keys(body).length === 0)
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'No fields to update.',
      httpStatus: 400,
    })
  const updated = await repo.updateContactForOwner(contact_id, userId, {
    ...body,
    updatedAt: BigInt(nowUnixSeconds()),
  } as never)
  if (!updated)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  const loaded = await repo.getContactForOwner(contact_id, userId)
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
  const { contact_id } = req.params as { contact_id: string }
  const deleted = await repo.deleteContactForOwner(contact_id, userId)
  if (!deleted)
    throw new AppHttpError({
      code: 'contact/not-found',
      message: 'Contact not found.',
      httpStatus: 404,
    })
  res.json({ object: 'user_contact', id: contact_id, deleted: true })
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
          logo_url: membership.organization.logoUrl,
        },
      }
    })
  )
  res.json({
    object: 'list',
    data,
    has_more: false,
    url: '/users/me/memberships',
    total_count: null,
  })
}
