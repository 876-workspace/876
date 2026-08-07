/**
 * WorkOS access-token verification against the JWKS endpoint.
 *
 * Ported from `providers/workos/jwks.py`, which used `PyJWKClient(cache_keys=
 * True)`. `jose`'s `createRemoteJWKSet` is the equivalent: it fetches the key
 * set once, caches it, and refetches on an unknown `kid` — so a key rotation is
 * picked up without a restart, and a verification storm does not become a fetch
 * storm.
 *
 * The cache is keyed by URL because a deployment can face more than one WorkOS
 * environment, and a per-call key set would defeat the caching entirely.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getLogger } from '@/platform/logger'

const log = getLogger('workos')

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
 * Verify a WorkOS access token and return its claims, or null on any failure.
 *
 * Returns rather than throws, matching the Python: the caller decides what an
 * unverifiable token means. The audience is deliberately unchecked — WorkOS
 * mints tokens for the client id, which the caller compares against its own
 * identity where that matters.
 */
export async function verifyWorkOsToken(
  token: string,
  jwksUrl: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, keySetFor(jwksUrl), {
      algorithms: ['RS256'],
    })

    return payload
  } catch (error) {
    // The token is never logged: it is a live credential until it expires, and a
    // rejected one is often a valid token presented to the wrong environment.
    log.warn(
      {
        jwks_url: jwksUrl,
        error_type:
          error instanceof Error ? error.constructor.name : typeof error,
      },
      'workos.jwks.verify_failed'
    )

    return null
  }
}

/** Drop the cached key sets. Tests point the same URL at different fixtures. */
export function resetWorkOsJwksCache(): void {
  keySets.clear()
}
