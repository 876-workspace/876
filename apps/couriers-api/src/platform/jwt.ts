import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

const log = getLogger('jwt')

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
  })
  keySets.set(jwksUrl, created)

  return created
}

/**
 * Verify a bearer token issued by the platform OAuth server.
 *
 * The platform signs access tokens with its RSA key and publishes the matching
 * public key through its JWKS endpoint. Issuer and audience remain unchecked,
 * matching the platform verifier: its issuer varies across preview hosts and
 * the receiving route owns any audience constraint.
 */
export async function verifyProviderJwt(
  token: string
): Promise<ProviderClaims | null> {
  const { jwksUrl } = getSettings().oauth
  if (!jwksUrl) return null

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

/** Drop cached remote key sets so tests can replace their JWKS fixture. */
export function resetProviderJwtKeyCache(): void {
  keySets.clear()
}
