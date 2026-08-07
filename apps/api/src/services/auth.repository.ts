import { prisma } from '@/db/client'

// All database access for the auth service.
// Only this file may import the Prisma client for this service.

export type AuthUserRow = {
  id: string
  workosUserId: string
  email: string
  username: string | null
  emailVerified: boolean
  firstName: string
  lastName: string
  avatar: string | null
  phone: string | null
  platformRole: string | null
  status: string
}

const USER_SELECT = {
  id: true,
  workosUserId: true,
  email: true,
  username: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  avatar: true,
  phone: true,
  platformRole: true,
  status: true,
} as const

export function findUserByUsername(
  username: string
): Promise<AuthUserRow | null> {
  return prisma.user.findFirst({
    where: { username },
    select: USER_SELECT,
  })
}

export function findUserByWorkosId(
  workosUserId: string
): Promise<AuthUserRow | null> {
  return prisma.user.findFirst({
    where: { workosUserId, deletedAt: null },
    select: USER_SELECT,
  })
}

export function findUserByEmail(email: string): Promise<AuthUserRow | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: USER_SELECT,
  })
}

export function createUser(data: {
  id: string
  workosUserId: string
  email: string
  emailVerified: boolean
  firstName: string
  lastName: string
  avatar: string | null
  platformRole: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<AuthUserRow> {
  return prisma.user.create({ data, select: USER_SELECT })
}

export function updateUser(
  userId: string,
  data: {
    workosUserId?: string
    email?: string
    emailVerified?: boolean
    firstName?: string
    lastName?: string
    avatar?: string | null
    status?: string
    updatedAt: bigint
  }
): Promise<AuthUserRow> {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SELECT,
  })
}

/** Feature slugs granted to every new consumer account. */
export function listConsumerDefaultFeatures(): Promise<{ id: string }[]> {
  return prisma.feature.findMany({
    where: { consumerDefaultEnabled: true, enabled: true },
    select: { id: true },
  })
}

export async function upsertUserFeature(data: {
  id: string
  userId: string
  featureId: string
  status: string
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  const { id, userId, featureId, status, syncedAt, createdAt, updatedAt } = data
  await prisma.userFeature.upsert({
    where: { userId_featureId: { userId, featureId } },
    create: { id, userId, featureId, status, syncedAt, createdAt, updatedAt },
    update: { status, syncedAt, updatedAt },
  })
}

/** Whether the user belongs to any organization. */
export async function hasAnyMembership(userId: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  })
  return membership !== null
}

export async function createMembership(data: {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  await prisma.membership.create({ data })
}

export type OrganizationRow = {
  id: string
  slug: string
}

export async function createOrganization(data: {
  id: string
  workosOrganizationId: string | null
  name: string
  slug: string
  status: string
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
}): Promise<OrganizationRow> {
  const { metadata, ...rest } = data
  return prisma.organization.create({
    data: {
      ...rest,
      metadata:
        metadata === null || metadata === undefined ? undefined : metadata,
    },
    select: { id: true, slug: true },
  })
}

export type EmailOtpChallengeRow = {
  email: string
  canResendAt: bigint | null
  expiresAt: bigint
}

export function findEmailOtpChallenge(
  email: string
): Promise<EmailOtpChallengeRow | null> {
  return prisma.authEmailOtpChallenge.findUnique({
    where: { email },
    select: { email: true, canResendAt: true, expiresAt: true },
  })
}

export async function upsertEmailOtpChallenge(data: {
  email: string
  pendingAuthToken: string
  emailVerificationId: string
  canResendAt: bigint
  expiresAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  const {
    email,
    pendingAuthToken,
    emailVerificationId,
    canResendAt,
    expiresAt,
    createdAt,
    updatedAt,
  } = data
  await prisma.authEmailOtpChallenge.upsert({
    where: { email },
    create: {
      email,
      pendingAuthToken,
      emailVerificationId,
      canResendAt,
      expiresAt,
      createdAt,
      updatedAt,
      lastSentAt: updatedAt,
    },
    update: {
      pendingAuthToken,
      emailVerificationId,
      canResendAt,
      expiresAt,
      updatedAt,
      lastSentAt: updatedAt,
      sendCount: { increment: 1 },
    },
  })
}
