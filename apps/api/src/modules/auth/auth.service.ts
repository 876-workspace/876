import { createHash, randomBytes } from 'node:crypto'

import { getSettings } from '@/config'
import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { generateId } from '@/platform/ids'
import {
  accountEntry,
  mergeAccounts,
  sealSession,
  unsealSession,
  type AccountEntry,
} from '@/platform/session'
import { createAuthService } from '@/services/auth'
import { AuthTelemetryService } from '@/services/auth-telemetry'

import * as repository from './auth.repository'
import { serializeAuthEvent, serializeSession } from './auth.serializers'

const log = getLogger('auth')
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 400
const BANNED_MESSAGE =
  'Your account has been suspended for violating our Terms of Service. If you believe this is a mistake, please contact support.'

// ---------------------------------------------------------------------------
// Cookie helpers — exact match to `domains/auth/session_state.py`
// ---------------------------------------------------------------------------

export function requireCookieSecret(): string {
  const secret = getSettings().session.cookieSecret
  if (!secret) {
    throw new AppHttpError({
      code: 'auth/internal-error',
      message: 'Session cookie signing is not configured.',
      httpStatus: 500,
    })
  }
  return secret
}

export function getSessionCookieName(): string {
  return getSettings().session.cookieName
}

export function isCookieSecure(): boolean {
  return getSettings().session.cookieSecure
}

export function readSessionPayload(
  req: {
    cookies?: Record<string, string>
    headers: Record<string, string | undefined>
  } & { get?: (n: string) => string | undefined },
  secret: string
) {
  // Support both express req.cookies and raw header parsing
  const cookieName = getSessionCookieName()
  let cookie: string | undefined
  if ((req as { cookies?: Record<string, string> }).cookies) {
    cookie = (req as { cookies: Record<string, string> }).cookies[cookieName]
  }
  if (!cookie) {
    const cookieHeader =
      (req.headers['cookie'] as string | undefined) ??
      (req.get?.('cookie') as string | undefined)
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`))
      if (match) cookie = decodeURIComponent(match[1]!)
    }
  }
  if (!cookie) return null
  return unsealSession(cookie, secret)
}

export function readExistingAccounts(
  req: unknown,
  secret: string
): AccountEntry[] {
  const payload = readSessionPayload(req as never, secret)
  if (!payload) return []
  const accounts = (payload as { accounts?: unknown }).accounts
  return Array.isArray(accounts) ? (accounts as AccountEntry[]) : []
}

export function setSessionCookie(
  res: {
    cookie: (name: string, value: string, opts: Record<string, unknown>) => void
  },
  sealed: string
) {
  res.cookie(getSessionCookieName(), sealed, {
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
    secure: isCookieSecure(),
  })
}

export function clearSessionCookie(res: {
  clearCookie: (name: string, opts: Record<string, unknown>) => void
}) {
  // Same attributes as set, per cutover contract — otherwise browser keeps it
  res.clearCookie(getSessionCookieName(), {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: isCookieSecure(),
  })
}

function ensureNotBanned(user: { banned: boolean }) {
  if (user.banned) {
    throw new AppHttpError({
      code: 'auth/account-banned',
      message: BANNED_MESSAGE,
      httpStatus: 403,
    })
  }
}

async function establishSession(params: {
  req: unknown
  res: { cookie: (n: string, v: string, o: Record<string, unknown>) => void }
  localUser: repository.UserRow
  accessToken: string | null
  realm: string
  orgId: string | null
  event: string
  appId: string | null
}) {
  ensureNotBanned(params.localUser)
  const secret = requireCookieSecret()
  const now = nowUnixSeconds()
  const sessionId = generateId('session')
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken, 'utf8').digest('hex')

  // Telemetry — failure-isolated
  let attempt: {
    deviceId: string | null
    context: {
      ip: string | null
      userAgent: string | null
      countryCode: string | null
      region: string | null
      city: string | null
      asn: string | null
      asOrganization: string | null
    } | null
  } = {
    deviceId: null,
    context: null,
  }
  try {
    const telemetry = new AuthTelemetryService()
    attempt = await telemetry.record({
      request: params.req as never,
      event: params.event,
      outcome: 'succeeded',
      userId: params.localUser.id,
      appId: params.appId,
      sessionId,
      identifier: params.localUser.email,
    })
  } catch {
    // telemetry never blocks sign-in
  }
  const ctx = attempt.context

  await repository.createSessionRow({
    id: sessionId,
    userId: params.localUser.id,
    appId: params.appId,
    tokenHash,
    expiresAt: BigInt(now + SESSION_TTL_SECONDS),
    ipAddress: ctx?.ip ?? null,
    userAgent: ctx?.userAgent ?? null,
    ipCountryCode: ctx?.countryCode ?? null,
    ipRegion: ctx?.region ?? null,
    ipCity: ctx?.city ?? null,
    ipAsn: ctx?.asn ?? null,
    ipAsOrganization: ctx?.asOrganization ?? null,
    deviceId: attempt.deviceId,
    lastSeenAt: BigInt(now),
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  if (params.appId) {
    try {
      await repository.upsertEnrollment(params.localUser.id, params.appId, now)
    } catch {
      log.warn(
        { user_id: params.localUser.id, app_id: params.appId },
        'enrollment.upsert_failed'
      )
    }
  }

  const userData = {
    id: params.localUser.id,
    email: params.localUser.email,
    firstName: params.localUser.firstName,
    lastName: params.localUser.lastName,
    emailVerified: params.localUser.emailVerified,
    avatar: params.localUser.avatar,
    username: params.localUser.username,
  }
  const entry = accountEntry(userData, sessionId, {
    realm: params.realm,
    orgId: params.orgId,
  })
  const accounts = mergeAccounts(
    readExistingAccounts(params.req, secret),
    entry
  )
  const sealed = sealSession({
    userData,
    accessToken: params.accessToken,
    secret,
    ttlSeconds: SESSION_TTL_SECONDS,
    sessionId,
    accounts,
    realm: params.realm,
    orgId: params.orgId,
  })
  setSessionCookie(params.res, sealed)
}

async function ensureOrgMembership(userId: string, orgId: string) {
  await repository.ensureOrgMembership(userId, orgId)
}

export async function completeAuth(params: {
  req: unknown
  res: { cookie: (n: string, v: string, o: Record<string, unknown>) => void }
  result: {
    status: 'ok'
    session: {
      accessToken: string
      user: {
        id: string
        email: string
        firstName: string | null
        lastName: string | null
        emailVerified: boolean
        avatar: string | null
      }
      organizationId: string | null
    }
  }
  realm?: string | null
  event?: string
  appId?: string | null
}) {
  const realmHeader =
    (
      params.req as {
        headers?: Record<string, string | undefined>
        get?: (n: string) => string | undefined
      }
    )?.headers?.['x-876-realm'] ??
    (params.req as { get?: (n: string) => string | undefined })?.get?.(
      'x-876-realm'
    ) ??
    (params.req as { header?: (n: string) => string | undefined })?.header?.(
      'x-876-realm'
    )
  const realm =
    params.realm ??
    (typeof realmHeader === 'string' ? realmHeader : 'consumer') ??
    'consumer'
  const normalizedRealm = realm === 'enterprise' ? 'enterprise' : 'consumer'

  const localUser = await repository.ensureFromWorkos(
    params.result.session.user as never
  )

  let orgId: string | null = null
  const workosOrgId = params.result.session.organizationId
  if (workosOrgId) {
    const org = await repository.findOrganizationByWorkosId(workosOrgId)
    if (org) {
      orgId = org.id
      await ensureOrgMembership(localUser.id, org.id)
    }
  }

  await establishSession({
    req: params.req,
    res: params.res,
    localUser,
    accessToken: params.result.session.accessToken,
    realm: normalizedRealm,
    orgId,
    event: params.event ?? 'login',
    appId: params.appId ?? null,
  })

  return serializeSession(localUser as never)
}

// ---------------------------------------------------------------------------
// Auth operations that delegate to `src/services/auth.ts`
// ---------------------------------------------------------------------------

export async function establishSessionForUser(params: {
  req: unknown
  res: { cookie: (n: string, v: string, o: Record<string, unknown>) => void }
  user: repository.UserRow
  event?: string
  appId?: string | null
}) {
  // Direct session establishment for an existing local user (OAuth flow)
  // — mirrors `_establish_session` called from `create_session_from_oauth`
  const secret = requireCookieSecret()
  // Realm for OAuth session — uses X-876-Realm header if present, defaults to consumer
  const realmHeader =
    (params.req as { headers?: Record<string, string | undefined> })?.headers?.[
      'x-876-realm'
    ] ??
    (params.req as { get?: (n: string) => string | undefined })?.get?.(
      'x-876-realm'
    )
  const realm = realmHeader === 'enterprise' ? 'enterprise' : 'consumer'
  await establishSession({
    req: params.req,
    res: params.res,
    localUser: params.user,
    accessToken: null,
    realm,
    orgId: null,
    event: params.event ?? 'callback',
    appId: params.appId ?? null,
  })
}

export function getAuthService() {
  return createAuthService()
}

export async function resolveEmail(identifier: string) {
  let email: string
  if (identifier.includes('@')) {
    const { validateEmail } = await import('@/services/auth')
    email = validateEmail(identifier)
  } else {
    const normalized = identifier.trim().toLowerCase()
    if (
      normalized.length < 3 ||
      normalized.length > 32 ||
      !/^[A-Za-z0-9._-]+$/.test(normalized)
    ) {
      throw new AppHttpError({
        code: 'auth/invalid-identifier',
        message: 'Please enter a valid username or email.',
        httpStatus: 400,
      })
    }
    const user = await repository.findUserByUsername(normalized)
    if (!user) {
      throw new AppHttpError({
        code: 'auth/invalid-credentials',
        message: 'The username or password you entered is incorrect.',
        httpStatus: 401,
      })
    }
    const { validateEmail } = await import('@/services/auth')
    email = validateEmail(user.email)
  }

  const user = await repository.findUserByEmail(email)
  const exists = user !== null
  let business = false
  if (user) {
    business = await repository.hasAnyMembership(user.id)
  }
  return { email, exists, business, methods: exists ? ['password'] : [] }
}

export async function recordFailure(
  req: unknown,
  event: string,
  identifier: string | null,
  failureCode?: string | null,
  outcome: string = 'failed',
  userId?: string | null
) {
  try {
    const telemetry = new AuthTelemetryService()
    await telemetry.record({
      request: req as never,
      event,
      outcome,
      identifier,
      userId: userId ?? null,
      failureCode: failureCode ?? null,
    })
  } catch {
    // telemetry never throws to caller
  }
}

// Re-exports for controller convenience
export { serializeAuthEvent }
