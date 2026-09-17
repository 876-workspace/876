import { createHash } from 'node:crypto'

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getLogger } from './logger.js'

const log = getLogger('session')

const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000
const ACTIVE_CACHE_TTL_MS = 30 * 1000
const ACTIVE_CACHE_MAX_ENTRIES = 1000
const INTROSPECTION_TIMEOUT_MS = 10_000

export type SessionClaims = JWTPayload & {
  token_use?: 'access' | 'id' | 'service'
  realm?: string
  org_id?: string
}

export type VerifiedSession = {
  userId: string
  organizationId: string
  realm: string
}

/**
 * Thrown when the identity plane cannot be reached or is misconfigured.
 * Callers map this to a 503: a Core outage must read as an outage, never as
 * a denial and never as an acceptance.
 */
export class SessionIdentityUnavailable extends Error {
  constructor(message = 'The identity service could not be reached.') {
    super(message)
    this.name = 'SessionIdentityUnavailable'
  }
}

type VerifierSettings = {
  coreBaseUrl: string
  serviceKey: string
  issuer: string
  audience: string
  jwksUrl: string
}

function readSettings(): VerifierSettings {
  const coreBaseUrl = (process.env.API_URL ?? '').trim().replace(/\/+$/, '')
  const serviceKey = (process.env.PROJECTS_API_876_KEY ?? '').trim()
  const issuer = (process.env.OAUTH_ISSUER ?? '').trim().replace(/\/+$/, '')
  const audience = (process.env.OAUTH_AUDIENCE ?? '').trim()
  const jwksUrl =
    (process.env.OAUTH_JWKS_URL ?? '').trim() ||
    (coreBaseUrl ? `${coreBaseUrl}/oauth/.well-known/jwks.json` : '')

  if (!coreBaseUrl || !serviceKey || !issuer || !audience || !jwksUrl) {
    throw new SessionIdentityUnavailable(
      'Session verification is not configured.'
    )
  }

  return { coreBaseUrl, serviceKey, issuer, audience, jwksUrl }
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
const activeTokens = new Map<string, number>()

function keySetFor(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const existing = keySets.get(jwksUrl)
  if (existing) return existing

  const created = createRemoteJWKSet(new URL(jwksUrl), {
    timeoutDuration: 10_000,
    cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
  })
  keySets.set(jwksUrl, created)

  return created
}

/**
 * Verifies a Core-issued OAuth bearer token for the Projects session tier.
 *
 * Only Authorization Code + PKCE public-client access tokens minted for the
 * registered native client are accepted: the token must name this service's
 * configured audience and carry the organization it was minted for. The
 * signature is checked locally against the Core JWKS, then Core confirms
 * through `/oauth/introspect` that the backing session is still live, so a
 * signed-out or revoked session is rejected rather than trusted until `exp`.
 *
 * Returns the verified session, `null` for a forged/expired/foreign token,
 * and throws `SessionIdentityUnavailable` when Core cannot answer.
 */
export async function verifySessionToken(
  token: string
): Promise<VerifiedSession | null> {
  const settings = readSettings()

  const claims = await verifySignature(token, settings.jwksUrl)
  if (!claims) return null
  if (!claimsTargetSession(claims, settings)) return null

  const active = await isActive(token, claims, settings)
  if (!active) return null

  return {
    userId: claims.sub as string,
    organizationId: claims.org_id as string,
    realm: claims.realm as string,
  }
}

async function verifySignature(
  token: string,
  jwksUrl: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, keySetFor(jwksUrl), {
      algorithms: ['RS256'],
    })
    return payload as SessionClaims
  } catch (error) {
    log.debug(
      {
        error_type:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      'session.jwt.rejected'
    )
    return null
  }
}

function claimsTargetSession(
  claims: SessionClaims,
  settings: VerifierSettings
): boolean {
  if (claims.token_use !== 'access') {
    log.warn({ reason: 'wrong_token_use' }, 'session.jwt.rejected')
    return false
  }

  if (typeof claims.sub !== 'string' || !claims.sub) {
    log.warn({ reason: 'missing_subject' }, 'session.jwt.rejected')
    return false
  }

  const audiences = Array.isArray(claims.aud)
    ? claims.aud
    : typeof claims.aud === 'string'
      ? [claims.aud]
      : []
  if (!audiences.includes(settings.audience)) {
    log.warn({ reason: 'foreign_audience' }, 'session.jwt.rejected')
    return false
  }

  if (claims.iss !== settings.issuer) {
    log.warn({ reason: 'foreign_issuer' }, 'session.jwt.rejected')
    return false
  }

  if (typeof claims.org_id !== 'string' || !claims.org_id) {
    log.warn({ reason: 'missing_organization' }, 'session.jwt.rejected')
    return false
  }

  if (
    claims.realm !== undefined &&
    claims.realm !== 'consumer' &&
    claims.realm !== 'enterprise'
  ) {
    log.warn({ reason: 'unknown_realm' }, 'session.jwt.rejected')
    return false
  }

  return true
}

async function isActive(
  token: string,
  claims: SessionClaims,
  settings: VerifierSettings
): Promise<boolean> {
  const key = createHash('sha256').update(token, 'utf8').digest('hex')
  const now = Date.now()
  const cachedUntil = activeTokens.get(key)
  if (cachedUntil !== undefined && cachedUntil > now) return true
  activeTokens.delete(key)

  const introspection = await introspect(token, settings)
  if (introspection.active !== true) {
    log.warn({ reason: 'session_inactive' }, 'session.jwt.rejected')
    return false
  }
  if (introspection.sub !== claims.sub) {
    log.warn({ reason: 'subject_mismatch' }, 'session.jwt.rejected')
    return false
  }

  if (activeTokens.size >= ACTIVE_CACHE_MAX_ENTRIES) {
    const oldest = activeTokens.keys().next().value
    if (oldest !== undefined) activeTokens.delete(oldest)
  }
  activeTokens.set(key, now + ACTIVE_CACHE_TTL_MS)

  return true
}

type Introspection = { active?: unknown; sub?: unknown }

async function introspect(
  token: string,
  settings: VerifierSettings
): Promise<Introspection> {
  const url = `${settings.coreBaseUrl}/oauth/introspect`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${settings.serviceKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(INTROSPECTION_TIMEOUT_MS),
    })
  } catch (error) {
    log.error(
      {
        error_type:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      'session.introspection.unreachable'
    )
    throw new SessionIdentityUnavailable()
  }

  if (!response.ok) {
    log.error({ status: response.status }, 'session.introspection.failed')
    throw new SessionIdentityUnavailable()
  }

  const body: unknown = await response.json().catch(() => null)
  const payload = unwrapEnvelope(body)
  if (payload === null) {
    log.error({ reason: 'invalid-response' }, 'session.introspection.failed')
    throw new SessionIdentityUnavailable()
  }

  return payload
}

function unwrapEnvelope(body: unknown): Introspection | null {
  if (typeof body !== 'object' || body === null) return null
  const record = body as Record<string, unknown>
  const payload = 'data' in record ? record.data : body
  if (typeof payload !== 'object' || payload === null) return null
  return payload as Introspection
}
