import {
  createPublicKey,
  createPrivateKey,
  generateKeyPairSync,
  createHash,
  type KeyObject,
} from 'node:crypto'

import { SignJWT, jwtVerify, exportJWK, type JWTPayload } from 'jose'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

/**
 * The provider signing key and the JWTs minted from it.
 *
 * This lives in `platform/` rather than in the OAuth module because two
 * different layers need it and they may not import each other: the OAuth module
 * mints tokens, and the HTTP auth guards verify them — and `http/` is forbidden
 * from importing a module (.claude/rules/express-api.md).
 */

const log = getLogger('jwt')

/** Claims carried by a token this service issued. */
export type ProviderClaims = JWTPayload & {
  sub?: string
  aud?: string | string[]
  sid?: string
  scope?: string
  /**
   * Which kind of token this is. Only `access` authorizes a user — see
   * `requireSession`.
   */
  token_use?: 'access' | 'id' | 'service'
  realm?: string
  org_id?: string
}

let cachedPrivateKey: KeyObject | null = null
let cachedPublicKey: KeyObject | null = null
let cachedKeyId: string | null = null

/**
 * The dev-only fallback key, generated once per process.
 *
 * Every instance and every restart would sign with a different key, and the
 * JWKS would publish a key nobody else can verify against — so it is refused in
 * production rather than minting forgeable, unverifiable tokens.
 */
function generateFallbackKey(): KeyObject {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  log.warn({ reason: 'no_configured_key' }, 'oauth.signing_key.ephemeral')
  return privateKey
}

export function getPrivateKey(): KeyObject {
  if (cachedPrivateKey) return cachedPrivateKey

  const { oauth, isProduction } = getSettings()
  if (!oauth.privateKey) {
    if (isProduction)
      throw new Error(
        'OAUTH_PRIVATE_KEY must be configured in production; refusing to sign tokens with an ephemeral in-process key.'
      )

    cachedPrivateKey = generateFallbackKey()
    return cachedPrivateKey
  }

  // Env vars carry the PEM with literal `\n` sequences far more often than real
  // newlines, and a PEM that still holds them fails to parse.
  const pem = oauth.privateKey.replace(/\\n/g, '\n').trim()
  const key = createPrivateKey(pem)
  if (key.asymmetricKeyType !== 'rsa')
    throw new Error('OAUTH_PRIVATE_KEY must be an RSA private key.')

  cachedPrivateKey = key
  return cachedPrivateKey
}

export function getPublicKey(): KeyObject {
  if (!cachedPublicKey) cachedPublicKey = createPublicKey(getPrivateKey())
  return cachedPublicKey
}

/**
 * The `kid` published in the JWKS and stamped on every signed token.
 *
 * Derived from the public key when unset, so a deployment that rotates the key
 * without setting OAUTH_KEY_ID still publishes a distinct identifier.
 */
export function getKeyId(): string {
  if (cachedKeyId) return cachedKeyId

  const { oauth } = getSettings()
  if (oauth.keyId) {
    cachedKeyId = String(oauth.keyId)
    return cachedKeyId
  }

  const der = getPublicKey().export({ type: 'spki', format: 'der' })
  const fingerprint = createHash('sha256')
    .update(der)
    .digest('hex')
    .slice(0, 16)
  cachedKeyId = `876-${fingerprint}`
  return cachedKeyId
}

/** The public JWK, as served at `/oauth/.well-known/jwks.json`. */
export async function getPublicJwk(): Promise<Record<string, unknown>> {
  const jwk = await exportJWK(getPublicKey())
  return { ...jwk, alg: 'RS256', kid: getKeyId(), use: 'sig' }
}

export async function signProviderJwt(claims: ProviderClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: getKeyId(), typ: 'JWT' })
    .sign(getPrivateKey())
}

/**
 * Verify a token this service issued, returning its claims or `null`.
 *
 * Returns rather than throws so a caller decides what a bad token means — a
 * guard rejects, while an optional-authentication path falls through to
 * anonymous. Issuer and audience are deliberately not checked here: a single
 * deployment serves several issuer hostnames (Codespaces, preview, production),
 * and the audience is the client the token was minted for, which the caller
 * checks against its own identity where that matters.
 */
export async function verifyProviderJwt(
  token: string
): Promise<ProviderClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getPublicKey(), {
      algorithms: ['RS256'],
    })
    return payload as ProviderClaims
  } catch (error) {
    // The token itself is never logged: it is a live credential until it
    // expires, and a rejected one is often a valid token sent to the wrong
    // service.
    log.debug({ err: error }, 'oauth.jwt.rejected')
    return null
  }
}

/** Drop the cached key material. Tests reconfigure the environment between suites. */
export function resetJwtKeyCache(): void {
  cachedPrivateKey = null
  cachedPublicKey = null
  cachedKeyId = null
}
