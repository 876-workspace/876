import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

/** Every query the OAuth authorization server makes. */

const APP_SELECT = {
  id: true,
  name: true,
  slug: true,
  clientId: true,
  clientType: true,
  clientSecretHash: true,
  appKind: true,
  logoUrl: true,
  homepageUrl: true,
  allowedRedirectUris: true,
  allowedLogoutUris: true,
  scopesAllowed: true,
} as const

const USER_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const

export type AppRow = Prisma.AppGetPayload<{ select: typeof APP_SELECT }>
export type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>

export function findAppByClientId(clientId: string): Promise<AppRow | null> {
  return prisma.app.findFirst({ where: { clientId }, select: APP_SELECT })
}

export function findAppById(appId: string): Promise<AppRow | null> {
  return prisma.app.findUnique({ where: { id: appId }, select: APP_SELECT })
}

export function findUserById(userId: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })
}

/* --------------------------------- grants -------------------------------- */

export type GrantRow = {
  id: string
  scopes: string[]
  revokedAt: bigint | null
}

export function findGrant(
  userId: string,
  appId: string
): Promise<GrantRow | null> {
  return prisma.oauthGrant.findFirst({
    where: { userId, appId },
    select: { id: true, scopes: true, revokedAt: true },
  })
}

export async function upsertGrant(params: {
  id: string
  userId: string
  appId: string
  scopes: string[]
  now: bigint
}): Promise<void> {
  const existing = await findGrant(params.userId, params.appId)

  if (existing) {
    // Approving again un-revokes: the user has just consented, so leaving the
    // revocation stamp would make the fresh grant read as withdrawn.
    await prisma.oauthGrant.update({
      where: { id: existing.id },
      data: {
        scopes: params.scopes,
        revokedAt: null,
        updatedAt: params.now,
      },
    })
    return
  }

  await prisma.oauthGrant.create({
    data: {
      id: params.id,
      userId: params.userId,
      appId: params.appId,
      scopes: params.scopes,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })
}

/* ---------------------------- authorization codes ------------------------- */

export type AuthorizationCodeData = {
  id: string
  codeHash: string
  userId: string
  appId: string
  orgId: string | null
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope: string
  state: string | null
  nonce: string | null
  authTime: bigint
  expiresAt: bigint
  createdAt: bigint
}

export async function createAuthorizationCode(
  data: AuthorizationCodeData
): Promise<void> {
  await prisma.authorizationCode.create({ data })
}

export type AuthorizationCodeRow = {
  id: string
  userId: string
  appId: string
  orgId: string | null
  redirectUri: string
  codeChallenge: string
  scope: string
  nonce: string | null
  authTime: bigint
  expiresAt: bigint
  usedAt: bigint | null
  app: AppRow
  user: UserRow
}

export function findAuthorizationCode(
  codeHash: string
): Promise<AuthorizationCodeRow | null> {
  return prisma.authorizationCode.findUnique({
    where: { codeHash },
    select: {
      id: true,
      userId: true,
      appId: true,
      orgId: true,
      redirectUri: true,
      codeChallenge: true,
      scope: true,
      nonce: true,
      authTime: true,
      expiresAt: true,
      usedAt: true,
      app: { select: APP_SELECT },
      user: { select: USER_SELECT },
    },
  })
}

/**
 * Consume a code, reporting whether this call is the one that consumed it.
 *
 * The `usedAt: null` guard is the whole point: two concurrent exchanges of the
 * same code both pass the earlier read, and only one may win. A read-then-write
 * without the guard hands tokens to both, which is exactly the replay this
 * endpoint has to stop.
 */
export async function consumeAuthorizationCode(
  codeId: string,
  now: bigint
): Promise<boolean> {
  const { count } = await prisma.authorizationCode.updateMany({
    where: { id: codeId, usedAt: null },
    data: { usedAt: now },
  })
  return count > 0
}

/* ------------------------------- sessions -------------------------------- */

export async function createSession(data: {
  id: string
  userId: string
  appId: string
  tokenHash: string
  expiresAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  await prisma.session.create({ data: { ...data, token: null } })
}

export function findSessionByTokenHash(tokenHash: string): Promise<{
  id: string
  appId: string | null
  expiresAt: bigint
  user: UserRow
} | null> {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      appId: true,
      expiresAt: true,
      user: { select: USER_SELECT },
    },
  })
}

export async function deleteSessionsByTokenHash(
  tokenHash: string
): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { tokenHash } })
  return count
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId, userId } })
}

/* ---------------------------- refresh tokens ----------------------------- */

export type RefreshTokenRow = {
  id: string
  userId: string
  appId: string
  sessionId: string | null
  scope: string
  expiresAt: bigint
  usedAt: bigint | null
  revokedAt: bigint | null
}

export function findRefreshToken(
  tokenHash: string
): Promise<RefreshTokenRow | null> {
  return prisma.oauthRefreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      appId: true,
      sessionId: true,
      scope: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
    },
  })
}

export async function createRefreshToken(data: {
  id: string
  tokenHash: string
  userId: string
  appId: string
  sessionId: string
  scope: string
  expiresAt: bigint
  createdAt: bigint
}): Promise<void> {
  await prisma.oauthRefreshToken.create({ data })
}

/** Consume a refresh token, reporting whether this call won the race. */
export async function consumeRefreshToken(
  tokenId: string,
  now: bigint
): Promise<boolean> {
  const { count } = await prisma.oauthRefreshToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt: now },
  })
  return count > 0
}

/**
 * Revoke every live refresh token for one user and app.
 *
 * Used on reuse detection: a token presented after it was rotated means the
 * family is compromised, and the whole family goes rather than just the
 * presented one.
 */
export async function revokeRefreshTokenFamily(
  userId: string,
  appId: string,
  now: bigint
): Promise<number> {
  const { count } = await prisma.oauthRefreshToken.updateMany({
    where: { userId, appId, revokedAt: null },
    data: { revokedAt: now },
  })
  return count
}
