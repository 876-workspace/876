import { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { paginateByCursor } from '@/http/envelope'

import {
  USER_SELECT,
  type UserRow,
  type ReservedUsernameRow,
  type UserIdentificationRow,
  type UserPinRow,
  type UserProfileRow,
} from './users.serializers'

export type {
  UserRow,
  ReservedUsernameRow,
  UserIdentificationRow,
  UserPinRow,
  UserProfileRow,
}

export async function findUserById(
  id: string,
  includeDeleted = false
): Promise<UserRow | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  })
  if (!row) return null
  if (!includeDeleted && row.deletedAt !== null) return null
  return row as unknown as UserRow
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const row = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: USER_SELECT,
  })
  return row as unknown as UserRow | null
}

export async function findUserByWorkosId(
  workosUserId: string
): Promise<UserRow | null> {
  const row = await prisma.user.findUnique({
    where: { workosUserId },
    select: USER_SELECT,
  })
  return row as unknown as UserRow | null
}

export async function findUserByUsername(
  username: string,
  includeDeleted = false
): Promise<UserRow | null> {
  const normalized = username.toLowerCase().trim()
  const row = await prisma.user.findUnique({
    where: { username: normalized },
    select: USER_SELECT,
  })
  if (!row) return null
  if (!includeDeleted && (row as unknown as UserRow).deletedAt !== null)
    return null
  // soft-deleted check via deletedAt field
  if (
    !includeDeleted &&
    (row as unknown as { deletedAt: bigint | null }).deletedAt !== null
  )
    return null
  return row as unknown as UserRow
}

export async function listUsers(options: {
  limit: number
  starting_after?: string
  ending_before?: string
  includeDeleted: boolean
  status?: string | null
  search?: string | null
  ids?: string[] | null
}): Promise<{ data: UserRow[]; hasMore: boolean }> {
  if (options.search) {
    const rows = await prisma.user.findMany({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.ids && options.ids.length > 0
          ? { id: { in: options.ids } }
          : {}),
        OR: [
          { email: { contains: options.search, mode: 'insensitive' } },
          { username: { contains: options.search, mode: 'insensitive' } },
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      select: USER_SELECT,
    })
    return { data: rows as unknown as UserRow[], hasMore: false }
  }

  const result = await paginateByCursor<UserRow>({
    query: {
      limit: options.limit,
      starting_after: options.starting_after,
      ending_before: options.ending_before,
    },
    loadAnchor: async (id) =>
      (await findUserById(id, true)) as unknown as UserRow | null,
    cursorOf: (row) => row.createdAt,
    fetch: async ({ take, cursor, order }) => {
      const where: Record<string, unknown> = {
        ...(options.status ? { status: options.status } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...(options.ids && options.ids.length > 0
          ? { id: { in: options.ids } }
          : {}),
        ...(cursor
          ? {
              createdAt:
                cursor.direction === 'lt'
                  ? { lt: cursor.value }
                  : { gt: cursor.value },
            }
          : {}),
      }
      const rows = await prisma.user.findMany({
        where: where as never,
        orderBy: { createdAt: order },
        take,
        select: USER_SELECT,
      })
      return rows as unknown as UserRow[]
    },
  })
  return result
}

export async function searchUsers(options: {
  query: string
  limit: number
  status?: string | null
  includeDeleted?: boolean
  ids?: string[] | null
}): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.includeDeleted ? {} : { deletedAt: null }),
      ...(options.ids && options.ids.length > 0
        ? { id: { in: options.ids } }
        : {}),
      OR: [
        { email: { contains: options.query, mode: 'insensitive' } },
        { username: { contains: options.query, mode: 'insensitive' } },
        { firstName: { contains: options.query, mode: 'insensitive' } },
        { lastName: { contains: options.query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit,
    select: USER_SELECT,
  })
  return rows as unknown as UserRow[]
}

export async function createUser(data: {
  id: string
  workosUserId: string
  email: string
  username: string | null
  emailVerified: boolean
  firstName: string
  lastName: string
  middleName: string | null
  avatar: string | null
  role: string
  platformRole: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<UserRow> {
  const row = await prisma.user.create({
    data: {
      id: data.id,
      workosUserId: data.workosUserId,
      email: data.email,
      username: data.username,
      emailVerified: data.emailVerified,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      avatar: data.avatar,
      role: data.role,
      platformRole: data.platformRole,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: USER_SELECT,
  })
  return row as unknown as UserRow
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>
): Promise<UserRow | null> {
  try {
    const row = await prisma.user.update({
      where: { id },
      data: data as never,
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

export async function softDeleteUser(
  id: string,
  deletedBy: string | null,
  reason: string | null
): Promise<UserRow | null> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const row = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedBy,
        deletionReason: reason,
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

export async function purgeUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return false
    throw error
  }
}

export async function setBanned(
  id: string,
  banned: boolean,
  reason: string | null = null
): Promise<UserRow | null> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    const data: Record<string, unknown> = { banned, updatedAt: now }
    if (banned) data.bannedReason = reason
    else data.bannedReason = null
    const row = await prisma.user.update({
      where: { id },
      data: data as never,
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

export async function assertNotDeleted(options: {
  workosUserId?: string
  email?: string
}): Promise<void> {
  if (options.workosUserId) {
    const row = await prisma.user.findFirst({
      where: { workosUserId: options.workosUserId, deletedAt: { not: null } },
      select: { id: true },
    })
    if (row) throw new Error('deleted')
  }
  if (options.email) {
    const email = options.email.toLowerCase().trim()
    const row = await prisma.user.findFirst({
      where: { email, deletedAt: { not: null } },
      select: { id: true },
    })
    if (row) throw new Error('deleted')
  }
}

// Membership helpers
export async function companiesForUsers(
  userIds: string[]
): Promise<Map<string, [string | null, string | null, string | null]>> {
  if (userIds.length === 0) return new Map()
  const memberships = await prisma.membership.findMany({
    where: { userId: { in: userIds } },
    include: {
      organization: { select: { name: true, slug: true, logoUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const map = new Map<string, [string | null, string | null, string | null]>()
  for (const m of memberships) {
    if (!map.has(m.userId)) {
      map.set(m.userId, [
        m.organization.name,
        (m.organization as unknown as { slug: string | null }).slug ?? null,
        m.organization.logoUrl ?? null,
      ])
    }
  }
  return map
}

// Profile
export async function findProfileByUserId(
  userId: string
): Promise<UserProfileRow | null> {
  const row = await prisma.userProfile.findUnique({ where: { userId } })
  return row as unknown as UserProfileRow | null
}

export async function ensureProfile(userId: string): Promise<UserProfileRow> {
  const existing = await findProfileByUserId(userId)
  if (existing) return existing
  const now = BigInt(Math.floor(Date.now() / 1000))
  const id = `upr_${Math.random().toString(36).slice(2, 10)}`
  const row = await prisma.userProfile.create({
    data: { id, userId, createdAt: now, updatedAt: now },
  })
  return row as unknown as UserProfileRow
}

export async function createProfileForUser(
  userId: string,
  now: bigint
): Promise<UserProfileRow> {
  const row = await prisma.userProfile.create({
    data: {
      id: generateId('userProfile'),
      userId,
      createdAt: now,
      updatedAt: now,
    },
  })
  return row as unknown as UserProfileRow
}

export async function updateProfile(
  id: string,
  data: Record<string, unknown>
): Promise<UserProfileRow | null> {
  try {
    const row = await prisma.userProfile.update({
      where: { id },
      data: data as never,
    })
    return row as unknown as UserProfileRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteProfileById(id: string): Promise<boolean> {
  try {
    await prisma.userProfile.delete({ where: { id } })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return false
    throw error
  }
}

// Reserved usernames
export async function listReservedUsernames(): Promise<ReservedUsernameRow[]> {
  const rows = await prisma.reservedUsername.findMany({
    orderBy: { username: 'asc' },
  })
  return rows as unknown as ReservedUsernameRow[]
}

export async function isReservedUsername(username: string): Promise<boolean> {
  const normalized = username.toLowerCase().trim()
  const row = await prisma.reservedUsername.findUnique({
    where: { username: normalized },
  })
  return row !== null
}

export async function createReservedUsername(
  username: string,
  reason: string | null
): Promise<ReservedUsernameRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const row = await prisma.reservedUsername.create({
    data: { username: username.toLowerCase().trim(), reason, createdAt: now },
  })
  return row as unknown as ReservedUsernameRow
}

export async function deleteReservedUsername(
  username: string
): Promise<boolean> {
  const normalized = username.toLowerCase().trim()
  try {
    await prisma.reservedUsername.delete({ where: { username: normalized } })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return false
    throw error
  }
}

// User identifications
export async function listIdentificationsByUser(
  userId: string
): Promise<UserIdentificationRow[]> {
  const rows = await prisma.userIdentification.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return rows as unknown as UserIdentificationRow[]
}

export async function findIdentificationByType(
  userId: string,
  type: string
): Promise<UserIdentificationRow | null> {
  const row = await prisma.userIdentification.findFirst({
    where: { userId, type, deletedAt: null },
  })
  return row as unknown as UserIdentificationRow | null
}

export async function createIdentification(data: {
  id: string
  userId: string
  type: string
  value: string
  valueCiphertext: string | null
  valueKeyId: string | null
  valueProvider: string | null
  valueLast4: string | null
  valueHash: string | null
  countryCode: string | null
  verified: boolean
  verifiedAt: bigint | null
  verifiedBy: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<UserIdentificationRow> {
  const row = await prisma.userIdentification.create({
    data: {
      ...data,
      deletedAt: null,
      deletionReason: null,
      deletedBy: null,
    } as never,
  })
  return row as unknown as UserIdentificationRow
}

export async function updateIdentificationValue(
  id: string,
  data: {
    value: string
    valueCiphertext: string | null
    valueKeyId: string | null
    valueProvider: string | null
    valueLast4: string | null
    valueHash: string | null
    countryCode: string | null
    verified: boolean
    verifiedAt: bigint | null
    verifiedBy: string | null
    updatedAt: bigint
  }
): Promise<UserIdentificationRow | null> {
  try {
    const row = await prisma.userIdentification.update({
      where: { id },
      data: data as never,
    })
    return row as unknown as UserIdentificationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function setIdentificationVerified(
  id: string,
  verifiedBy: string,
  verifiedAt: bigint,
  updatedAt: bigint
): Promise<UserIdentificationRow | null> {
  try {
    const row = await prisma.userIdentification.update({
      where: { id },
      data: { verified: true, verifiedBy, verifiedAt, updatedAt },
    })
    return row as unknown as UserIdentificationRow
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return null
    throw error
  }
}

export async function deleteIdentification(
  id: string,
  deletedBy: string | null,
  reason: string | null
): Promise<boolean> {
  try {
    const now = BigInt(Math.floor(Date.now() / 1000))
    await prisma.userIdentification.update({
      where: { id },
      data: {
        deletedAt: now,
        deletedBy,
        deletionReason: reason,
        updatedAt: now,
      },
    })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return false
    throw error
  }
}

// Pins
export async function findPin(
  userId: string,
  scope = 'account'
): Promise<UserPinRow | null> {
  const row = await prisma.userPin.findUnique({
    where: { userId_scope: { userId, scope } },
  })
  return row as unknown as UserPinRow | null
}

export async function setPin(
  userId: string,
  pinHash: string,
  scope = 'account'
): Promise<UserPinRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const existing = await findPin(userId, scope)
  if (existing) {
    const row = await prisma.userPin.update({
      where: { id: existing.id },
      data: {
        pinHash,
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: null,
        setAt: now,
        updatedAt: now,
      },
    })
    return row as unknown as UserPinRow
  }
  const id = `pin_${Math.random().toString(36).slice(2, 10)}`
  const row = await prisma.userPin.create({
    data: {
      id,
      userId,
      scope,
      pinHash,
      failedAttempts: 0,
      lockedUntil: null,
      lastVerifiedAt: null,
      setAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })
  return row as unknown as UserPinRow
}

export async function recordPinFailure(row: UserPinRow): Promise<UserPinRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const failedAttempts = row.failedAttempts + 1
  let lockedUntil: bigint | null = row.lockedUntil
  // 5 failures -> lock 15 minutes
  if (failedAttempts >= 5) {
    lockedUntil = BigInt(Math.floor(Date.now() / 1000) + 900)
  }
  const updated = await prisma.userPin.update({
    where: { id: row.id },
    data: { failedAttempts, lockedUntil, updatedAt: now },
  })
  return updated as unknown as UserPinRow
}

export async function recordPinSuccess(row: UserPinRow): Promise<UserPinRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const updated = await prisma.userPin.update({
    where: { id: row.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastVerifiedAt: now,
      updatedAt: now,
    },
  })
  return updated as unknown as UserPinRow
}

export async function clearPin(
  userId: string,
  scope = 'account'
): Promise<boolean> {
  const existing = await findPin(userId, scope)
  if (!existing) return false
  await prisma.userPin.delete({ where: { id: existing.id } })
  return true
}

// Addresses
export async function listAddressesByUser(userId: string) {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return rows
}

export async function getAddressForUser(addressId: string, userId: string) {
  const row = await prisma.address.findFirst({
    where: { id: addressId, userId },
  })
  return row
}

export async function createAddress(data: Record<string, unknown>) {
  const row = await prisma.address.create({ data: data as never })
  return row
}

export async function updateAddressForUser(
  addressId: string,
  userId: string,
  data: Record<string, unknown>
) {
  const existing = await getAddressForUser(addressId, userId)
  if (!existing) return null
  const row = await prisma.address.update({
    where: { id: addressId },
    data: data as never,
  })
  return row
}

export async function deleteAddressForUser(
  addressId: string,
  userId: string
): Promise<boolean> {
  const existing = await getAddressForUser(addressId, userId)
  if (!existing) return false
  await prisma.address.delete({ where: { id: addressId } })
  return true
}

// Contacts
export async function listContactsByOwner(ownerUserId: string) {
  const rows = await prisma.contact.findMany({
    where: { ownerUserId },
    include: { contactUser: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows
}

export async function getContactForOwner(
  contactId: string,
  ownerUserId: string
) {
  const row = await prisma.contact.findFirst({
    where: { id: contactId, ownerUserId },
    include: { contactUser: true },
  })
  return row
}

export async function getContactByPair(
  ownerUserId: string,
  contactUserId: string
) {
  const row = await prisma.contact.findFirst({
    where: { ownerUserId, contactUserId },
  })
  return row
}

export async function createContact(data: Record<string, unknown>) {
  const row = await prisma.contact.create({
    data: data as never,
    include: { contactUser: true },
  })
  return row
}

export async function updateContactForOwner(
  contactId: string,
  ownerUserId: string,
  data: Record<string, unknown>
) {
  const existing = await getContactForOwner(contactId, ownerUserId)
  if (!existing) return null
  const row = await prisma.contact.update({
    where: { id: contactId },
    data: data as never,
    include: { contactUser: true },
  })
  return row
}

export async function deleteContactForOwner(
  contactId: string,
  ownerUserId: string
): Promise<boolean> {
  const existing = await getContactForOwner(contactId, ownerUserId)
  if (!existing) return false
  await prisma.contact.delete({ where: { id: contactId } })
  return true
}

// Accounts / OAuth / Sessions / Apps / Features

export async function listAccountsForUser(userId: string) {
  const rows = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return rows
}

export async function findAccount(userId: string, accountId: string) {
  const row = await prisma.account.findFirst({
    where: { id: accountId, userId },
  })
  return row
}

export async function deleteAccount(
  userId: string,
  accountId: string
): Promise<boolean> {
  const existing = await findAccount(userId, accountId)
  if (!existing) return false
  await prisma.account.delete({ where: { id: accountId } })
  return true
}

export async function listOauthGrants(userId: string) {
  const rows = await prisma.oauthGrant.findMany({
    where: { userId, revokedAt: null },
    include: { app: true },
    orderBy: { updatedAt: 'desc' },
  })
  return rows
}

export async function revokeOauthGrant(
  grantId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.oauthGrant.findFirst({
    where: { id: grantId, userId, revokedAt: null },
  })
  if (!existing) return false
  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.oauthGrant.update({
    where: { id: grantId },
    data: { revokedAt: now, updatedAt: now },
  })
  return true
}

export async function listUserApps(userId: string) {
  const rows = await prisma.userAppEnrollment.findMany({
    where: { userId },
    include: { app: true },
    orderBy: { enrolledAt: 'asc' },
  })
  return rows
}

export async function listUserAppsBatch(userIds: string[]) {
  if (userIds.length === 0) return []
  const rows = await prisma.userAppEnrollment.findMany({
    where: { userId: { in: userIds } },
    include: { app: true },
    orderBy: { enrolledAt: 'asc' },
  })
  return rows
}

export async function deleteAllSessionsForUser(
  userId: string
): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } })
  return result.count
}

export async function listUserFeatures(userId: string) {
  const rows = await prisma.userFeature.findMany({
    where: { userId },
    include: { feature: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows
}

export async function getSubscriptionByAppSlug(orgId: string, appSlug: string) {
  const row = await prisma.subscription.findFirst({
    where: { organizationId: orgId, app: { slug: appSlug } },
    include: { app: true },
  })
  return row
}

export async function findFeatureById(featureId: string) {
  const row = await prisma.feature.findUnique({ where: { id: featureId } })
  return row
}

export async function findUserFeature(userId: string, featureId: string) {
  const row = await prisma.userFeature.findUnique({
    where: { userId_featureId: { userId, featureId } },
  })
  return row
}

export async function updateUserFeature(
  id: string,
  data: Record<string, unknown>
) {
  const row = await prisma.userFeature.update({
    where: { id },
    data: data as never,
    include: { feature: true },
  })
  return row
}

export async function createUserFeature(data: Record<string, unknown>) {
  const row = await prisma.userFeature.create({
    data: data as never,
    include: { feature: true },
  })
  return row
}

export async function listAllUsers(): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: USER_SELECT,
  })
  return rows as unknown as UserRow[]
}

export async function createAuditEvent(data: Record<string, unknown>) {
  await prisma.auditEvent.create({ data: data as never })
}

export async function listMembershipsForUser(
  userId: string,
  status?: string | null
) {
  const where: Record<string, unknown> = { userId }
  if (status) where.status = status.trim()
  const rows = await prisma.membership.findMany({
    where: where as never,
    include: { organization: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows
}

/**
 * The caller's memberships with their organization, for `/users/me/memberships`.
 *
 * Lives here rather than in the controller: a controller that queries Prisma is
 * both a boundary violation and a layer that cannot be tested without a
 * database.
 */
export function listMembershipsWithOrganization(
  userId: string,
  status?: string | null
) {
  return prisma.membership.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    include: { organization: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Record a PIN clear in the audit trail.
 *
 * Kept beside the other writes rather than in the controller: a controller that
 * reaches for Prisma fails `pnpm node:boundaries`, and an audit write is
 * exactly the kind of side effect that must be visible in the repository.
 */
export async function recordPinClearedEvent(
  userId: string,
  scope: string,
  now: bigint
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      id: generateId('auditEvent'),
      event: 'user_pin.cleared',
      source: 'server',
      appName: '876',
      appId: null,
      userId,
      path: `/users/${userId}/pin`,
      search: null,
      referrer: null,
      title: null,
      requestId: null,
      sessionId: null,
      distinctId: null,
      properties: { scope },
      createdAt: now,
    },
  })
}
