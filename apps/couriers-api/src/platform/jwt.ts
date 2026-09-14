import { createHash } from 'node:crypto'

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getSettings } from '@/config'
import { appError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'

const log = getLogger('jwt')

// Five minutes bounds key rotation propagation without fetching on every
// request. `jose` reloads the JWKS after this interval; a failed reload rejects
// the current request rather than treating stale verification as a success.
const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

// A confirmed-active token is trusted for this long before it is introspected
// again, which bounds how long a signed-out session can keep working.
const ACTIVE_CACHE_TTL_MS = 30 * 1000
const ACTIVE_CACHE_MAX_ENTRIES = 1000
const INTROSPECTION_TIMEOUT_MS = 10_000

export type ProviderClaims = JWTPayload & {
  token_use?: 'access' | 'id' | 'service'
  realm?: string
  org_id?: string
  sid?: string
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
 * Verify a bearer token issued by the 876 identity API.
 *
 * Two token shapes are legitimate. An OAuth client token names its client in
 * `aud` and must name this service's configured client. A first-party session
 * token (sealed into the 876 session cookie) deliberately carries no `aud` or
 * `iss` — the acting app is the presented API key — and instead names its
 * session in `sid`.
 *
 * The signature is checked locally against the JWKS, then the identity API
 * confirms through `/oauth/introspect` that the backing session is still live,
 * so a signed-out or revoked session is rejected rather than trusted until its
 * `exp`.
 */
export async function verifyProviderJwt(
  token: string
): Promise<ProviderClaims | null> {
  const { oauth, identityApiUrl } = getSettings()
  if (!oauth.jwksUrl || !identityApiUrl) {
    log.warn(
      {
        has_jwks_url: Boolean(oauth.jwksUrl),
        has_identity_api_url: Boolean(identityApiUrl),
      },
      'oauth.jwt.verification_unconfigured'
    )
    return null
  }

  const claims = await verifySignature(token, oauth.jwksUrl)
  if (!claims || !claimsTargetThisService(claims)) return null

  return (await isActive(token, claims)) ? claims : null
}

async function verifySignature(
  token: string,
  jwksUrl: string
): Promise<ProviderClaims | null> {
  try {
    const { payload } = await jwtVerify(token, keySetFor(jwksUrl), {
      algorithms: ['RS256'],
    })
    return payload as ProviderClaims
  } catch (error) {
    log.debug(
      {
        jwks_url: jwksUrl,
        error_type:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      'oauth.jwt.rejected'
    )
    return null
  }
}

function claimsTargetThisService(claims: ProviderClaims): boolean {
  const { issuer, audience } = getSettings().oauth

  if (claims.token_use !== 'access') {
    log.warn({ reason: 'wrong_token_use' }, 'oauth.jwt.rejected')
    return false
  }

  if (claims.aud !== undefined) {
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!audience || !audiences.includes(audience)) {
      log.warn({ reason: 'foreign_audience' }, 'oauth.jwt.rejected')
      return false
    }
  } else if (typeof claims.sid !== 'string' || !claims.sid) {
    // Without an audience the token is only acceptable as a session token.
    log.warn({ reason: 'no_audience_or_session' }, 'oauth.jwt.rejected')
    return false
  }

  if (claims.iss !== undefined && issuer && claims.iss !== issuer) {
    log.warn({ reason: 'foreign_issuer' }, 'oauth.jwt.rejected')
    return false
  }

  return true
}

async function isActive(token: string, claims: ProviderClaims) {
  const key = createHash('sha256').update(token, 'utf8').digest('hex')
  const now = Date.now()
  const cachedUntil = activeTokens.get(key)
  if (cachedUntil !== undefined && cachedUntil > now) return true
  activeTokens.delete(key)

  const introspection = await introspect(token)
  const active =
    introspection.active === true && introspection.sub === claims.sub
  if (!active) return false

  if (activeTokens.size >= ACTIVE_CACHE_MAX_ENTRIES) {
    const oldest = activeTokens.keys().next().value
    if (oldest !== undefined) activeTokens.delete(oldest)
  }
  activeTokens.set(key, now + ACTIVE_CACHE_TTL_MS)

  return true
}

type Introspection = { active?: unknown; sub?: unknown }

async function introspect(token: string): Promise<Introspection> {
  const { identityApiUrl, api876Key } = getSettings()
  const url = `${identityApiUrl}/oauth/introspect`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${api876Key}`,
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
      'oauth.introspection.unreachable'
    )
    throw identityUnavailable(error)
  }

  if (!response.ok) {
    // The identity API rejecting this service's own key is a configuration
    // outage, not a statement about the user's token.
    log.error({ status: response.status }, 'oauth.introspection.failed')
    throw identityUnavailable()
  }

  const payload: unknown = await response.json().catch(() => null)
  if (payload === null || typeof payload !== 'object') {
    log.error({ reason: 'invalid-response' }, 'oauth.introspection.failed')
    throw identityUnavailable()
  }

  return payload as Introspection
}

function identityUnavailable(cause?: unknown) {
  return appError('auth/identity-unavailable', {
    message: 'Sign-in could not be verified right now. Please try again.',
    httpStatus: 503,
    cause,
  })
}

/** Drop cached key sets and confirmed tokens so tests start clean. */
export function resetProviderJwtKeyCache(): void {
  keySets.clear()
  activeTokens.clear()
}
