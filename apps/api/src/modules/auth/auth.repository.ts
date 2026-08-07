import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import { isPlatformOwnerEmail } from '@/config'

/**
 * All database access for the auth module.
 * Only this file may import `@/db/client`.
 */

export type UserRow = {
  id: string
  workosUserId: string
  stripeCustomerId: string | null
  email: string
  username: string | null
  emailVerified: boolean
  firstName: string
  lastName: string
  middleName: string | null
  avatar: string | null
  status: string
  banned: boolean
  bannedReason: string | null
  deletedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

const USER_SELECT = {
  id: true,
  workosUserId: true,
  stripeCustomerId: true,
  email: true,
  username: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  middleName: true,
  avatar: true,
  status: true,
  banned: true,
  bannedReason: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.toLowerCase().trim()
  return prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
    select: USER_SELECT,
  })
}

export function findUserByWorkosId(
  workosUserId: string
): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { workosUserId, deletedAt: null },
    select: USER_SELECT,
  })
}

export function findUserById(userId: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })
}

export function findUserByUsername(username: string): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: USER_SELECT,
  })
}

export async function ensureFromWorkos(providerUser: {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  avatar: string | null
}): Promise<UserRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const normalizedEmail = providerUser.email.toLowerCase().trim()

  // Guard against resurrecting a tombstoned account — matches Python's
  // `assert_not_deleted` which checks both workos id and email.
  const deletedByWorkos = await prisma.user.findFirst({
    where: { workosUserId: providerUser.id },
    select: { id: true, deletedAt: true },
  })
  if (deletedByWorkos?.deletedAt != null) {
    const { AppHttpError } = await import('@/platform/errors')
    throw new AppHttpError({
      code: 'auth/account-deleted',
      message: 'This account is no longer available.',
      httpStatus: 403,
    })
  }
  const deletedByEmail = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, deletedAt: true },
  })
  if (deletedByEmail?.deletedAt != null) {
    const { AppHttpError } = await import('@/platform/errors')
    throw new AppHttpError({
      code: 'auth/account-deleted',
      message: 'This account is no longer available.',
      httpStatus: 403,
    })
  }

  const existingByWorkos = await findUserByWorkosId(providerUser.id)
  if (existingByWorkos) {
    const isOwner = isPlatformOwnerEmail(normalizedEmail)
    return prisma.user.update({
      where: { id: existingByWorkos.id },
      data: {
        email: normalizedEmail,
        emailVerified: providerUser.emailVerified,
        firstName: providerUser.firstName || existingByWorkos.firstName,
        lastName: providerUser.lastName || existingByWorkos.lastName,
        avatar: providerUser.avatar || existingByWorkos.avatar,
        platformRole: isOwner ? 'owner' : undefined,
        updatedAt: now,
      },
      select: USER_SELECT,
    })
  }

  const existingByEmail = await findUserByEmail(normalizedEmail)
  if (existingByEmail) {
    if (!providerUser.emailVerified) {
      const { AppHttpError } = await import('@/platform/errors')
      throw new AppHttpError({
        code: 'auth/email-already-registered',
        message:
          'An account already exists for this email. Sign in with your existing method, or verify this email to link it.',
        httpStatus: 409,
      })
    }
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        workosUserId: providerUser.id,
        emailVerified: true,
        firstName: providerUser.firstName || existingByEmail.firstName,
        lastName: providerUser.lastName || existingByEmail.lastName,
        avatar: providerUser.avatar || existingByEmail.avatar,
        updatedAt: now,
      },
      select: USER_SELECT,
    })
  }

  const { generateId, generatePlatformOwnerUserId } =
    await import('@/platform/ids')
  const { isPlatformOwnerEmail: isOwnerFn } = await import('@/config')
  const isOwner = isOwnerFn(normalizedEmail)
  const id = isOwner ? generatePlatformOwnerUserId() : generateId('user')
  const firstName =
    providerUser.firstName || normalizedEmail.split('@')[0] || 'Unknown'
  const lastName = providerUser.lastName || 'User'

  const created = await prisma.user.create({
    data: {
      id,
      workosUserId: providerUser.id,
      email: normalizedEmail,
      emailVerified: providerUser.emailVerified,
      firstName,
      lastName,
      avatar: providerUser.avatar,
      role: 'user',
      platformRole: isOwner ? 'owner' : null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    select: USER_SELECT,
  })

  // Create profile row — mirrors python's UserProfile creation
  try {
    const { generateId: gen } = await import('@/platform/ids')
    await prisma.userProfile.create({
      data: {
        id: gen('userProfile'),
        userId: id,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch {
    // profile creation failure should not block auth
  }

  return created
}

/** Whether a user has any membership (active or invited) */
export async function hasAnyMembership(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    select: { id: true },
  })
  return m !== null
}

export async function findMembershipForRouting(
  userId: string,
  filters: { status?: string; orgSlug?: string }
): Promise<
  Array<{
    id: string
    role: string
    status: string
    roleId: string | null
    organizationId: string
    createdAt: bigint
    organization: {
      id: string
      name: string | null
      slug: string
      status: string
      logoUrl: string | null
    }
  }>
> {
  const where: Record<string, unknown> = { userId }
  if (filters.status) where['status'] = filters.status

  const memberships = await prisma.membership.findMany({
    where: where as never,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  let filtered = memberships
  if (filters.orgSlug) {
    filtered = filtered.filter((m) => m.organization.slug === filters.orgSlug)
  }

  return filtered.map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    roleId: m.roleId,
    organizationId: m.organizationId,
    createdAt: m.createdAt,
    organization: {
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      status: m.organization.status,
      logoUrl: m.organization.logoUrl,
    },
  }))
}

export async function findOrganizationByWorkosId(
  workosOrganizationId: string
): Promise<{ id: string } | null> {
  return prisma.organization.findFirst({
    where: { workosOrganizationId },
    select: { id: true },
  })
}

export async function createSessionRow(data: {
  id: string
  userId: string
  appId: string | null
  tokenHash: string
  expiresAt: bigint
  ipAddress: string | null
  userAgent: string | null
  ipCountryCode: string | null
  ipRegion: string | null
  ipCity: string | null
  ipAsn: string | null
  ipAsOrganization: string | null
  deviceId: string | null
  lastSeenAt: bigint
  createdAt: bigint
  updatedAt: bigint
}) {
  await prisma.session.create({ data })
}

export function findSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  })
}

export function deleteSession(sessionId: string) {
  return prisma.session.deleteMany({ where: { id: sessionId } })
}

export function findAppById(appId: string) {
  return prisma.app.findUnique({
    where: { id: appId },
    select: { id: true, clientId: true },
  })
}

export function listAuthProviders() {
  return prisma.authProvider.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, label: true, iconSlug: true, workosProviderId: true },
  })
}

export function findAuthProviderById(providerId: string) {
  return prisma.authProvider.findFirst({
    where: { id: providerId.toLowerCase(), isEnabled: true },
    select: { id: true, label: true, iconSlug: true, workosProviderId: true },
  })
}

export function listDevicesForUser(userId: string, limit = 50) {
  return prisma.userDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
    take: limit,
    select: {
      id: true,
      fingerprint: true,
      label: true,
      deviceType: true,
      deviceBrand: true,
      deviceModel: true,
      osName: true,
      browserName: true,
      lastCountryCode: true,
      trusted: true,
      signInCount: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
  })
}

export function listSessionsForUser(
  userId: string,
  limit = 50
): Promise<
  Array<{
    id: string
    deviceId: string | null
    ipCity: string | null
    ipCountryCode: string | null
    createdAt: bigint
    lastSeenAt: bigint | null
    expiresAt: bigint
  }>
> {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      deviceId: true,
      ipCity: true,
      ipCountryCode: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
  })
}

export function findSessionFullById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, expiresAt: true },
  })
}

/**
 * Record that the user reached this app.
 *
 * The columns are `enrolled_at` / `last_seen_at`, not the usual
 * `created_at` / `updated_at` pair: an existing enrollment keeps the moment it
 * was first created and only its last-seen timestamp moves, which is what makes
 * the row an enrollment record rather than a session log.
 */
export async function upsertEnrollment(
  userId: string,
  appId: string,
  now: number
) {
  await prisma.userAppEnrollment.upsert({
    where: { userId_appId: { userId, appId } },
    create: {
      id: generateId('userAppEnrollment'),
      userId,
      appId,
      enrolledAt: BigInt(now),
      lastSeenAt: BigInt(now),
    },
    update: { lastSeenAt: BigInt(now) },
  })
}

export async function ensureOrgMembership(userId: string, orgId: string) {
  const existing = await prisma.membership.findFirst({
    where: { organizationId: orgId, userId },
  })
  const now = Math.floor(Date.now() / 1000)
  if (existing) {
    if (existing.status !== 'active') {
      await prisma.membership.update({
        where: { id: existing.id },
        data: { status: 'active', updatedAt: BigInt(now) },
      })
    }
    try {
      const { linkMembershipRole, assignMemberApps } =
        await import('@/services/provisioning')
      const membership = await prisma.membership.findUnique({
        where: { id: existing.id },
      })
      if (membership) await linkMembershipRole(membership as never, now)
      await assignMemberApps({ organizationId: orgId, userId, now })
    } catch {}
    return
  }
  const membership = await prisma.membership.create({
    data: {
      id: (await import('@/platform/ids')).generateId('membership'),
      organizationId: orgId,
      userId,
      role: 'member',
      status: 'active',
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
    },
  })
  try {
    const { linkMembershipRole, assignMemberApps } =
      await import('@/services/provisioning')
    await linkMembershipRole(membership as never, now)
    await assignMemberApps({ organizationId: orgId, userId, now })
  } catch {}
}

export function revokeSession(sessionId: string, revokedBy: string | null) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return prisma.session
    .findUnique({
      where: { id: sessionId },
      select: { id: true, expiresAt: true },
    })
    .then(async (existing) => {
      if (!existing) return null
      return prisma.session.update({
        where: { id: sessionId },
        data: {
          revokedAt: now,
          revokedBy,
          expiresAt: existing.expiresAt < now ? existing.expiresAt : now,
          updatedAt: now,
        },
        select: { id: true },
      })
    })
}
