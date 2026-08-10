import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

const log = getLogger('jwt')

// Five minutes bounds key rotation propagation without fetching on every
// request. `jose` reloads the JWKS after this interval; a failed reload rejects
// the current request rather than treating stale verification as a success.
const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

export type ProviderClaims = JWTPayload & {
  token_use?: 'access' | 'id' | 'service'
  realm?: string
  org_id?: string
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

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
 * Verify a bearer token issued by the platform OAuth server.
 *
 * The platform signs access tokens with its RSA key and publishes the matching
 * public key through its JWKS endpoint. The service only accepts the issuer
 * and audience the identity API minted for this resource server.
 */
export async function verifyProviderJwt(
  token: string
): Promise<ProviderClaims | null> {
  const { issuer, audience, jwksUrl } = getSettings().oauth
  if (!issuer || !audience || !jwksUrl) {
    log.warn(
      {
        has_audience: Boolean(audience),
        has_issuer: Boolean(issuer),
        has_jwks_url: Boolean(jwksUrl),
      },
      'oauth.jwt.verification_unconfigured'
    )
    return null
  }

  try {
    const { payload } = await jwtVerify(token, keySetFor(jwksUrl), {
      algorithms: ['RS256'],
      issuer,
      audience,
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

/** Drop cached remote key sets so tests can replace their JWKS fixture. */
export function resetProviderJwtKeyCache(): void {
  keySets.clear()
}
