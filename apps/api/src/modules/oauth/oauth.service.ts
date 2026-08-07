import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { signProviderJwt } from '@/platform/jwt'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import { oauthError, OAuthErrorResponse } from './oauth.errors'
import * as repository from './oauth.repository'
import type { AppRow, UserRow } from './oauth.repository'
import type { TokenResponse } from './oauth.schemas'
import { grantsOfflineAccess, resolveIdentityClaims } from './oauth.scopes'

/** The OAuth authorization server. */

const log = getLogger('oauth')

/** App kinds 876 owns itself, which skip the consent screen. */
const FIRST_PARTY_APP_KINDS = new Set(['internal', 'platform', 'product'])

const AUTHORIZATION_CODE_TTL_SECONDS = 10 * 60

/* ------------------------------- primitives ------------------------------- */

export function sha256Hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url')
}

export function generateProviderToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString('base64url')}`
}

/**
 * A redirect target is safe only over HTTPS, or over HTTP to a loopback host.
 *
 * Plain HTTP to anywhere else would put the authorization code on the wire in
 * clear text, where the whole point of PKCE is that it cannot be replayed by
 * whoever reads it.
 */
export function isRedirectUriSafe(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    if (parsed.protocol === 'https:') return true

    return (
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsed.hostname)
    )
  } catch {
    return false
  }
}

/**
 * The issuer this deployment advertises.
 *
 * Configuration first, and the request's own origin only as a last resort: a
 * token signed under an issuer taken from a spoofable header would validate
 * against whatever the caller claimed.
 */
export function resolveIssuer(requestOrigin: string): string {
  const settings = getSettings()
  const issuer =
    settings.oauth.issuer || settings.oauth.siteUrl || requestOrigin

  return issuer.replace(/\/+$/, '')
}

/**
 * A client secret is required when the app is confidential or has one stored.
 *
 * A public client must present *no* secret — accepting an empty one from a
 * confidential client, or ignoring a supplied one on a public client, are both
 * ways an attacker probes for a weaker authentication path.
 */
export function isClientSecretValid(
  app: Pick<AppRow, 'clientType' | 'clientSecretHash'>,
  clientSecret: string | null | undefined
): boolean {
  const requiresSecret =
    app.clientType === 'confidential' || Boolean(app.clientSecretHash)
  if (!requiresSecret) return !clientSecret
  if (!clientSecret || !app.clientSecretHash) return false

  return constantTimeEquals(sha256Hash(clientSecret), app.clientSecretHash)
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }

  return timingSafeEqual(left, right)
}

/** Append parameters to a redirect URI, preserving any it already carries. */
export function buildRedirect(
  redirectUri: string,
  params: Record<string, string>
): string {
  const url = new URL(redirectUri)
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value)

  return url.toString()
}

/* ---------------------------- client validation --------------------------- */

export type ValidatedClient = { app: AppRow; scopes: string[] }

export type ValidateClientOptions = {
  responseType: string
  clientId: string
  redirectUri: string
  scope?: string | null
  requireClientParameters?: boolean
  responseTypeErrorCode?: string
  responseTypeErrorMessage?: string
  invalidClientCode?: string
  invalidClientMessage?: string
  invalidClientStatus?: number
  validateScopes?: boolean
}

/**
 * The checks every authorization-endpoint request passes before anything else.
 *
 * The redirect URI is matched against the app's registered list **and**
 * re-checked for transport safety. Registration alone is not enough: a
 * registered `http://` URI on a public host would still leak the code.
 */
export async function validateClientRequest(
  options: ValidateClientOptions
): Promise<ValidatedClient> {
  if (options.responseType !== 'code')
    throw new AppHttpError({
      code: options.responseTypeErrorCode ?? 'provider/invalid-request',
      message:
        options.responseTypeErrorMessage ?? 'Invalid request parameters.',
      httpStatus: 400,
    })

  if (
    options.requireClientParameters &&
    (!options.clientId || !options.redirectUri)
  )
    throw new AppHttpError({
      code: 'provider/invalid-request',
      message: 'Invalid request parameters.',
      httpStatus: 400,
    })

  const app = await repository.findAppByClientId(options.clientId)
  if (!app)
    throw new AppHttpError({
      code: options.invalidClientCode ?? 'provider/invalid-client',
      message: options.invalidClientMessage ?? 'The OAuth client is invalid.',
      httpStatus: options.invalidClientStatus ?? 401,
    })

  if (
    !(app.allowedRedirectUris ?? []).includes(options.redirectUri) ||
    !isRedirectUriSafe(options.redirectUri)
  )
    throw new AppHttpError({
      code: 'provider/invalid-redirect-uri',
      message: 'The redirect URI is not registered for this app.',
      httpStatus: 400,
    })

  const scopes = (options.scope || 'openid').split(' ')
  if (options.validateScopes !== false) {
    const allowed = new Set(app.scopesAllowed ?? [])
    if (scopes.some((scope) => !allowed.has(scope)))
      throw new AppHttpError({
        code: 'provider/invalid-scope',
        message: 'The requested scope is not allowed for this app.',
        httpStatus: 400,
      })
  }

  return { app, scopes }
}

/* ------------------------------ token issuance ---------------------------- */

/**
 * Mint an access token, optionally an ID token and a refresh token, and persist
 * the session.
 *
 * `authTime` is when the user actually authenticated: pass it for the initial
 * code exchange so an OIDC ID token is issued, and `null` on refresh, where no
 * new authentication happened and no new ID token may be minted.
 */
export async function issueTokenResponse(params: {
  origin: string
  app: AppRow
  user: UserRow
  scope: string
  nonce: string | null
  authTime: number | null
  orgId?: string | null
}): Promise<TokenResponse> {
  const settings = getSettings()
  const issuer = resolveIssuer(params.origin)
  const now = nowUnixSeconds()
  const sessionId = generateId('session')
  const expiresIn = settings.oauth.accessTokenTtlSeconds
  const expiresAt = now + expiresIn
  const grantedScopes = params.scope.split(/\s+/).filter(Boolean)
  const orgId = params.orgId ?? null
  const realm = orgId ? 'enterprise' : 'consumer'

  const accessToken = await signProviderJwt({
    iss: issuer,
    sub: params.user.id,
    aud: params.app.clientId,
    exp: expiresAt,
    iat: now,
    sid: sessionId,
    scope: params.scope,
    token_use: 'access',
    realm,
    ...(orgId ? { org_id: orgId } : {}),
  })

  let idToken: string | null = null
  if (params.authTime !== null && grantedScopes.includes('openid'))
    idToken = await signProviderJwt({
      iss: issuer,
      sub: params.user.id,
      aud: params.app.clientId,
      exp: expiresAt,
      iat: now,
      sid: sessionId,
      token_use: 'id',
      nonce: params.nonce,
      auth_time: params.authTime,
      realm,
      ...(orgId ? { org_id: orgId } : {}),
      ...resolveIdentityClaims(grantedScopes, params.user),
    })

  await repository.createSession({
    id: sessionId,
    userId: params.user.id,
    appId: params.app.id,
    tokenHash: sha256Hash(accessToken),
    expiresAt: BigInt(expiresAt),
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })

  let refreshToken: string | null = null
  if (grantsOfflineAccess(grantedScopes)) {
    refreshToken = generateProviderToken('876_rt')
    await repository.createRefreshToken({
      id: generateId('refreshToken'),
      tokenHash: sha256Hash(refreshToken),
      userId: params.user.id,
      appId: params.app.id,
      sessionId,
      scope: params.scope,
      expiresAt: BigInt(now + settings.oauth.refreshTokenTtlSeconds),
      createdAt: BigInt(now),
    })
  }

  log.info(
    {
      user_id: params.user.id,
      app_id: params.app.id,
      client_id: params.app.clientId,
      session_id: sessionId,
      scope: params.scope,
      realm,
      has_refresh: refreshToken !== null,
      has_id_token: idToken !== null,
      org_id: orgId,
    },
    'oauth.token.issued'
  )

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: params.scope,
    id_token: idToken,
    refresh_token: refreshToken,
  }
}

/* --------------------------------- grants --------------------------------- */

export async function handleAuthorizationCodeGrant(params: {
  origin: string
  code: string | undefined
  redirectUri: string | undefined
  clientId: string
  clientSecret: string | null
  codeVerifier: string | undefined
}): Promise<TokenResponse | OAuthErrorResponse> {
  if (!params.code || !params.redirectUri)
    return oauthError(
      'provider/invalid-request',
      'Missing code or redirect_uri.',
      400
    )

  const record = await repository.findAuthorizationCode(sha256Hash(params.code))
  if (!record)
    return oauthError(
      'provider/code-not-found',
      'The authorization code is invalid.',
      400
    )
  if (record.usedAt !== null)
    return oauthError(
      'provider/code-used',
      'The authorization code has already been used.',
      400
    )
  if (Number(record.expiresAt) < nowUnixSeconds())
    return oauthError(
      'provider/code-expired',
      'The authorization code has expired.',
      400
    )
  if (record.redirectUri !== params.redirectUri)
    return oauthError(
      'provider/invalid-redirect-uri',
      'The redirect URI is not registered for this app.',
      400
    )
  if (record.app.clientId !== params.clientId)
    return oauthError(
      'provider/invalid-client',
      'The OAuth client is invalid.',
      401
    )
  if (!isClientSecretValid(record.app, params.clientSecret))
    return oauthError(
      'provider/invalid-client-secret',
      'The OAuth client secret is invalid.',
      401
    )

  // PKCE. The stored challenge is compared against the hash of the presented
  // verifier, so intercepting the code alone is not enough to redeem it.
  if (record.codeChallenge !== sha256Base64Url(params.codeVerifier ?? '')) {
    log.warn(
      {
        code_id: record.id,
        app_id: record.appId,
        client_id: params.clientId,
      },
      'oauth.token.pkce_failed'
    )
    return oauthError(
      'provider/invalid-code-verifier',
      'The PKCE code verifier is invalid.',
      400
    )
  }

  // The guarded consume is the real single-use enforcement: two concurrent
  // exchanges both pass the read above, and only one may win here.
  if (
    !(await repository.consumeAuthorizationCode(
      record.id,
      BigInt(nowUnixSeconds())
    ))
  ) {
    log.warn(
      {
        code_id: record.id,
        user_id: record.userId,
        app_id: record.appId,
        client_id: params.clientId,
      },
      'oauth.authorization_code.reuse_detected'
    )
    return oauthError(
      'provider/code-used',
      'The authorization code has already been used.',
      400
    )
  }

  return issueTokenResponse({
    origin: params.origin,
    app: record.app,
    user: record.user,
    scope: record.scope,
    nonce: record.nonce,
    authTime: Number(record.authTime),
    orgId: record.orgId,
  })
}

export async function handleClientCredentialsGrant(params: {
  origin: string
  clientId: string
  clientSecret: string | null
  scope: string | undefined
}): Promise<TokenResponse | OAuthErrorResponse> {
  const app = await repository.findAppByClientId(params.clientId)
  if (!app)
    return oauthError(
      'provider/invalid-client',
      'The OAuth client is invalid.',
      401
    )

  if (app.clientType !== 'confidential')
    return oauthError(
      'provider/unauthorized-client',
      'The client_credentials grant requires a confidential client.',
      400
    )

  if (!isClientSecretValid(app, params.clientSecret))
    return oauthError(
      'provider/invalid-client-secret',
      'The OAuth client secret is invalid.',
      401
    )

  const requested = new Set(
    params.scope ? params.scope.split(/\s+/).filter(Boolean) : []
  )
  const allowed = new Set(app.scopesAllowed ?? [])
  // There is no user in this grant, so the user-centric scopes cannot be
  // granted — an `openid` token with no subject would be meaningless, and a
  // refresh token has nothing to refresh.
  allowed.delete('openid')
  allowed.delete('offline_access')

  if (requested.size > 0 && [...requested].some((s) => !allowed.has(s)))
    return oauthError(
      'provider/invalid-scope',
      'One or more requested scopes are not permitted.',
      400
    )

  const grantedScope = [...(requested.size > 0 ? requested : allowed)]
    .sort()
    .join(' ')

  log.info(
    { client_id: app.clientId, app_id: app.id, scope: grantedScope },
    'oauth.token.client_credentials_issued'
  )

  const settings = getSettings()
  const now = nowUnixSeconds()
  const expiresIn = settings.oauth.accessTokenTtlSeconds

  const accessToken = await signProviderJwt({
    iss: resolveIssuer(params.origin),
    sub: app.clientId,
    aud: app.clientId,
    exp: now + expiresIn,
    iat: now,
    scope: grantedScope,
    // Deliberately not 'access': a service token has no user behind it, and the
    // session guards accept only `access`, so this can never stand in for one.
    token_use: 'service',
  })

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: grantedScope,
    id_token: null,
    refresh_token: null,
  }
}

export async function handleRefreshTokenGrant(params: {
  origin: string
  clientId: string
  clientSecret: string | null
  refreshToken: string | undefined
}): Promise<TokenResponse | OAuthErrorResponse> {
  if (!params.refreshToken)
    return oauthError(
      'provider/invalid-request',
      'A refresh token is required.',
      400
    )

  const record = await repository.findRefreshToken(
    sha256Hash(params.refreshToken)
  )
  if (!record)
    return oauthError(
      'provider/code-not-found',
      'The refresh token is invalid.',
      400
    )

  const app = await repository.findAppById(record.appId)
  if (!app || app.clientId !== params.clientId)
    return oauthError(
      'provider/invalid-client',
      'The OAuth client is invalid.',
      401
    )

  if (!isClientSecretValid(app, params.clientSecret))
    return oauthError(
      'provider/invalid-client-secret',
      'The OAuth client secret is invalid.',
      401
    )

  const now = nowUnixSeconds()
  if (record.revokedAt !== null || Number(record.expiresAt) < now)
    return oauthError(
      'provider/token-expired',
      'The refresh token has expired.',
      400
    )

  // Rotation reuse detection. Presenting a token after it was rotated means
  // someone replayed a stolen copy, so the whole family for this user and app
  // is revoked rather than just the presented token.
  if (record.usedAt !== null) {
    log.warn(
      {
        user_id: record.userId,
        app_id: record.appId,
        client_id: params.clientId,
        refresh_token_id: record.id,
        session_id: record.sessionId,
      },
      'oauth.refresh.reuse_detected'
    )
    await repository.revokeRefreshTokenFamily(
      record.userId,
      record.appId,
      BigInt(now)
    )
    return oauthError(
      'provider/code-used',
      'The refresh token has already been used.',
      400
    )
  }

  // Marked used, not revoked. A later replay must fall through to the branch
  // above and revoke the family; revoking here would instead trip the
  // expired/revoked guard and hide the theft signal.
  if (!(await repository.consumeRefreshToken(record.id, BigInt(now))))
    return oauthError(
      'provider/code-used',
      'The refresh token has already been used.',
      400
    )

  const user = await repository.findUserById(record.userId)
  if (!user)
    return oauthError(
      'provider/login-required',
      'The account is no longer available.',
      400
    )

  return issueTokenResponse({
    origin: params.origin,
    app,
    user,
    scope: record.scope,
    nonce: null,
    authTime: null,
  })
}

/* -------------------------------- authorize ------------------------------- */

export function needsConsent(params: {
  app: AppRow
  grant: repository.GrantRow | null
  scopes: string[]
  promptList: string[]
}): boolean {
  // 876's own apps do not ask: the user is already inside the platform, and a
  // consent screen for the platform consenting to itself is noise.
  if (FIRST_PARTY_APP_KINDS.has(params.app.appKind)) return false
  if (params.promptList.includes('consent')) return true

  const revoked = !params.grant || params.grant.revokedAt !== null
  const granted = new Set(params.grant?.scopes ?? [])

  return revoked || !params.scopes.every((scope) => granted.has(scope))
}

export function buildConsentPath(params: {
  responseType: string
  clientId: string
  redirectUri: string
  scope: string
  codeChallenge?: string
  codeChallengeMethod?: string
  state?: string
  nonce?: string
  prompt?: string
}): string {
  const query = new URLSearchParams({
    response_type: params.responseType,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scope,
  })
  if (params.codeChallenge) query.set('code_challenge', params.codeChallenge)
  if (params.codeChallengeMethod)
    query.set('code_challenge_method', params.codeChallengeMethod)
  if (params.state) query.set('state', params.state)
  if (params.nonce) query.set('nonce', params.nonce)
  if (params.prompt) query.set('prompt', params.prompt)

  return `/oauth/consent?${query.toString()}`
}

/** Mint an authorization code and build the redirect that carries it. */
export async function issueAuthorizationCode(params: {
  userId: string
  appId: string
  orgId: string | null
  redirectUri: string
  scope: string
  state: string | null
  nonce: string | null
  codeChallenge: string | null
  codeChallengeMethod: string | null
}): Promise<string> {
  const code = generateProviderToken('876_code')
  const now = nowUnixSeconds()

  await repository.createAuthorizationCode({
    id: generateId('authorizationCode'),
    codeHash: sha256Hash(code),
    userId: params.userId,
    appId: params.appId,
    orgId: params.orgId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge ?? '',
    codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
    scope: params.scope,
    state: params.state,
    nonce: params.nonce,
    authTime: BigInt(now),
    expiresAt: BigInt(now + AUTHORIZATION_CODE_TTL_SECONDS),
    createdAt: BigInt(now),
  })

  return buildRedirect(params.redirectUri, {
    code,
    ...(params.state ? { state: params.state } : {}),
  })
}
