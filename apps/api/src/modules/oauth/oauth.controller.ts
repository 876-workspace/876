import type { Request, Response } from 'express'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { validBody, validQuery } from '@/http/middleware/validate'
import { findApiKeyByHash, markApiKeyUsed } from '@/modules/apps'
import { generateId } from '@/platform/ids'
import { getPublicJwk, verifyProviderJwt } from '@/platform/jwt'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import { OAuthErrorResponse, oauthError } from './oauth.errors'
import * as repository from './oauth.repository'
import type { UserRow } from './oauth.repository'
import type {
  AuthorizeQuery,
  ConsentBody,
  EndSessionQuery,
  TokenActionBody,
  TokenBody,
} from './oauth.schemas'
import {
  resolveIdentityClaims,
  supportedClaims,
  supportedScopes,
} from './oauth.scopes'
import * as service from './oauth.service'

/** The OAuth authorization server's HTTP surface. */

const log = getLogger('oauth')

/** The origin to fall back to when no issuer is configured. */
function requestOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host') ?? ''}`
}

function send(res: Response, result: unknown): void {
  if (result instanceof OAuthErrorResponse) {
    res.status(result.status).json(result.body)
    return
  }

  res.status(200).json(result)
}

/**
 * True when the request carries the configured internal key.
 *
 * Only first-party callers hold it — the app's server-side OAuth proxy, which
 * unseals the session cookie. These endpoints are publicly reachable, so
 * without this gate the asserted-identity headers below could be set by anyone.
 */
function hasTrustedInternalKey(req: Request): boolean {
  const expected = getSettings().internalKey
  const provided = req.get('x-internal-key')

  return (
    Boolean(expected) &&
    Boolean(provided) &&
    service.constantTimeEquals(provided as string, expected)
  )
}

/**
 * Resolve the acting user for the authorization and consent endpoints.
 *
 * Identity comes **only** from a first-party caller holding the internal key.
 * There is deliberately no bearer-token fallback: it would let anyone holding
 * an access token drive `/consent/approve` and self-grant scopes without the
 * user ever seeing a consent screen.
 */
async function requireCurrentUser(req: Request): Promise<UserRow> {
  const loginRequired = () =>
    new AppHttpError({
      code: 'provider/login-required',
      message: 'A signed-in 876 account is required.',
      httpStatus: 401,
    })

  if (!hasTrustedInternalKey(req)) throw loginRequired()

  const query = req.valid?.query as { user_id?: string } | undefined
  const userId = query?.user_id || req.get('X-User-Id')
  if (!userId) throw loginRequired()

  const user = await repository.findUserById(userId)
  if (!user) throw loginRequired()

  return user
}

/**
 * The client credentials, from HTTP Basic when present, otherwise the body.
 *
 * A `client_id` in both places that disagrees is rejected rather than resolved
 * in favour of one: the caller is either confused or probing, and neither
 * deserves a token.
 */
function clientCredentials(
  req: Request,
  clientId: string | undefined,
  clientSecret: string | undefined
): { clientId: string | null; clientSecret: string | null } | null {
  const authorization = req.get('Authorization')
  if (!authorization?.startsWith('Basic ')) {
    return {
      clientId: clientId ?? null,
      clientSecret: clientSecret ?? null,
    }
  }

  try {
    const decoded = Buffer.from(
      authorization.slice('Basic '.length),
      'base64'
    ).toString('utf8')
    if (!decoded.includes(':')) {
      return { clientId: clientId ?? null, clientSecret: clientSecret ?? null }
    }

    const separator = decoded.indexOf(':')
    const basicId = decodeURIComponent(decoded.slice(0, separator))
    const basicSecret = decodeURIComponent(decoded.slice(separator + 1))
    if (clientId && clientId !== basicId) return null

    return { clientId: basicId, clientSecret: basicSecret }
  } catch {
    return null
  }
}

/** Authenticate a resource server by its 876 API key. */
async function requireApiKey(req: Request): Promise<{ id: string }> {
  const invalid = () =>
    new AppHttpError({
      code: 'api-key/invalid',
      message: 'API key is invalid.',
      httpStatus: 401,
    })

  const authorization = req.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw invalid()

  const key = authorization.slice('Bearer '.length).trim()
  const now = nowUnixSeconds()
  const record = await findApiKeyByHash(service.sha256Hash(key))
  if (!record || record.revoked) throw invalid()
  if (record.expiresAt !== null && Number(record.expiresAt) < now)
    throw invalid()

  // Not awaited: last-used is telemetry, and a write failure must not turn a
  // valid credential into a rejected one.
  void markApiKeyUsed(record.id, now).catch(() => {})
  return record
}

/* ------------------------------- discovery -------------------------------- */

export function openidConfiguration(req: Request, res: Response): void {
  const issuer = service.resolveIssuer(requestOrigin(req))

  res.status(200).json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    end_session_endpoint: `${issuer}/oauth/end-session`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    introspection_endpoint: `${issuer}/oauth/introspect`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'client_credentials',
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: supportedScopes(),
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: [
      'none',
      'client_secret_basic',
      'client_secret_post',
    ],
    claims_supported: supportedClaims(),
    frontchannel_logout_supported: false,
    backchannel_logout_supported: false,
  })
}

export async function jwks(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ keys: [await getPublicJwk()] })
}

/* ------------------------------- authorize -------------------------------- */

export async function authorize(req: Request, res: Response): Promise<void> {
  const query = validQuery<AuthorizeQuery>(req)

  const { app, scopes } = await service.validateClientRequest({
    responseType: query.response_type,
    clientId: query.client_id,
    redirectUri: query.redirect_uri,
    scope: query.scope,
    requireClientParameters: true,
    responseTypeErrorCode: query.response_type
      ? 'provider/unsupported-response-type'
      : 'provider/invalid-request',
    responseTypeErrorMessage: query.response_type
      ? 'Unsupported response type.'
      : 'Invalid request parameters.',
  })

  const user = await requireCurrentUser(req)
  const promptList = (query.prompt ?? '').split(' ')

  if (promptList.includes('select_account'))
    throw new AppHttpError({
      code: 'provider/account-selection-required',
      message: 'Account selection is required.',
      httpStatus: 401,
    })

  const grant = await repository.findGrant(user.id, app.id)

  if (service.needsConsent({ app, grant, scopes, promptList })) {
    // `prompt=none` means "do not show me any UI", so a consent requirement is
    // an error rather than a redirect.
    if (promptList.includes('none'))
      throw new AppHttpError({
        code: 'provider/consent-required',
        message: 'The app requires account permission before continuing.',
        httpStatus: 403,
      })

    res.status(200).json({
      status: 'consent_required',
      consentPath: service.buildConsentPath({
        responseType: query.response_type,
        clientId: query.client_id,
        redirectUri: query.redirect_uri,
        scope: query.scope,
        ...(query.code_challenge
          ? { codeChallenge: query.code_challenge }
          : {}),
        ...(query.code_challenge_method
          ? { codeChallengeMethod: query.code_challenge_method }
          : {}),
        ...(query.state ? { state: query.state } : {}),
        ...(query.nonce ? { nonce: query.nonce } : {}),
        ...(query.prompt ? { prompt: query.prompt } : {}),
      }),
    })
    return
  }

  const redirectTo = await service.issueAuthorizationCode({
    userId: user.id,
    appId: app.id,
    orgId: req.get('X-Org-Id') || null,
    redirectUri: query.redirect_uri,
    scope: query.scope,
    state: query.state ?? null,
    nonce: query.nonce ?? null,
    codeChallenge: query.code_challenge ?? null,
    codeChallengeMethod: query.code_challenge_method ?? null,
  })

  res.status(200).json({ status: 'authorized', redirectTo })
}

/* --------------------------------- token ---------------------------------- */

export async function token(req: Request, res: Response): Promise<void> {
  const body = validBody<TokenBody>(req)

  const creds = clientCredentials(req, body.client_id, body.client_secret)
  if (!creds) {
    send(
      res,
      oauthError('provider/invalid-client', 'Invalid client credentials.', 401)
    )
    return
  }
  if (!creds.clientId) {
    send(
      res,
      oauthError('provider/invalid-client', 'Client ID is required.', 401)
    )
    return
  }

  const origin = requestOrigin(req)

  if (body.grant_type === 'refresh_token') {
    send(
      res,
      await service.handleRefreshTokenGrant({
        origin,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: body.refresh_token,
      })
    )
    return
  }

  if (body.grant_type === 'client_credentials') {
    send(
      res,
      await service.handleClientCredentialsGrant({
        origin,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        scope: body.scope,
      })
    )
    return
  }

  if (body.grant_type !== 'authorization_code') {
    send(
      res,
      oauthError(
        'provider/unsupported-grant-type',
        'The OAuth grant type is not supported.',
        400
      )
    )
    return
  }

  send(
    res,
    await service.handleAuthorizationCodeGrant({
      origin,
      code: body.code,
      redirectUri: body.redirect_uri,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      codeVerifier: body.code_verifier,
    })
  )
}

/* -------------------------------- userinfo -------------------------------- */

export async function userinfo(req: Request, res: Response): Promise<void> {
  const authorization = req.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    send(
      res,
      oauthError('provider/token-invalid', 'The access token is invalid.', 401)
    )
    return
  }

  const accessToken = authorization.slice('Bearer '.length).trim()
  const claims = await verifyProviderJwt(accessToken)
  // Only an access token authorizes a user. An ID token or a service token
  // presented here would otherwise stand in for a first-party session.
  if (!claims || claims.token_use !== 'access') {
    send(
      res,
      oauthError('provider/token-invalid', 'The access token is invalid.', 401)
    )
    return
  }

  // The signature alone is not enough: a session revoked or ended since the
  // token was minted must stop working before its expiry.
  const session = await repository.findSessionByTokenHash(
    service.sha256Hash(accessToken)
  )
  if (!session) {
    send(
      res,
      oauthError('provider/token-invalid', 'The access token is invalid.', 401)
    )
    return
  }
  if (Number(session.expiresAt) < nowUnixSeconds()) {
    send(
      res,
      oauthError('provider/token-expired', 'The access token has expired.', 401)
    )
    return
  }

  const grantedScopes = String(claims.scope ?? '')
    .split(/\s+/)
    .filter(Boolean)

  res.status(200).json({
    sub: session.user.id,
    ...resolveIdentityClaims(grantedScopes, session.user),
  })
}

/* ------------------------------ end session ------------------------------- */

export async function endSession(req: Request, res: Response): Promise<void> {
  const query = validQuery<EndSessionQuery>(req)
  const issuer = service.resolveIssuer(requestOrigin(req))

  let app = null
  let userId: string | null = null
  let sessionId: string | null = null

  if (query.id_token_hint) {
    const claims = await verifyProviderJwt(query.id_token_hint)
    if (claims && claims.token_use === 'id') {
      userId = typeof claims.sub === 'string' ? claims.sub : null
      sessionId = typeof claims.sid === 'string' ? claims.sid : null
      const aud =
        (typeof claims.aud === 'string' ? claims.aud : null) ??
        query.client_id ??
        null
      if (aud) app = await repository.findAppByClientId(aud)
    }
  }

  if (app === null && query.client_id)
    app = await repository.findAppByClientId(query.client_id)

  if (sessionId && userId) {
    await repository.deleteSession(sessionId, userId)
    log.info(
      {
        user_id: userId,
        session_id: sessionId,
        client_id: query.client_id ?? null,
      },
      'oauth.session.ended'
    )
  }

  // The post-logout target must be one the app registered. An unchecked one is
  // an open redirect, and this endpoint is reachable without any credential.
  let redirectTarget = issuer
  if (
    query.post_logout_redirect_uri &&
    app &&
    (app.allowedLogoutUris ?? []).includes(query.post_logout_redirect_uri)
  )
    redirectTarget = service.buildRedirect(
      query.post_logout_redirect_uri,
      query.state ? { state: query.state } : {}
    )

  res.redirect(302, redirectTarget)
}

/* ------------------------------ revoke/introspect ------------------------- */

export async function revoke(req: Request, res: Response): Promise<void> {
  const apiKey = await requireApiKey(req)
  const body = validBody<TokenActionBody>(req)

  const deleted = await repository.deleteSessionsByTokenHash(
    service.sha256Hash(body.token)
  )

  log.info(
    { api_key_id: apiKey.id, sessions_deleted: deleted },
    'oauth.token.revoked'
  )

  res.status(200).json({ revoked: true })
}

export async function introspect(req: Request, res: Response): Promise<void> {
  // RFC 7662 requires the endpoint be protected; the calling resource server
  // authenticates with its 876 API key, matching /revoke.
  await requireApiKey(req)
  const body = validBody<TokenActionBody>(req)

  const claims = await verifyProviderJwt(body.token)
  if (!claims || claims.token_use !== 'access') {
    res.status(200).json({ active: false })
    return
  }

  const session = await repository.findSessionByTokenHash(
    service.sha256Hash(body.token)
  )
  if (!session || Number(session.expiresAt) < nowUnixSeconds()) {
    res.status(200).json({ active: false })
    return
  }

  res.status(200).json({
    active: true,
    scope: claims.scope ?? null,
    app_id: session.appId,
    client_id: claims.aud ?? null,
    sub: claims.sub ?? null,
    token_type: 'Bearer',
    exp: claims.exp ?? null,
    iat: claims.iat ?? null,
  })
}

/* -------------------------------- consent --------------------------------- */

export async function consent(req: Request, res: Response): Promise<void> {
  const query = validQuery<AuthorizeQuery>(req)

  const { app, scopes } = await service.validateClientRequest({
    responseType: query.response_type,
    clientId: query.client_id,
    redirectUri: query.redirect_uri,
    scope: query.scope,
  })

  const user = await requireCurrentUser(req)
  const grant = await repository.findGrant(user.id, app.id)

  const previouslyGranted =
    grant && grant.revokedAt === null
      ? grant.scopes.filter((scope) =>
          ['openid', 'profile', 'email'].includes(scope)
        )
      : []

  res.status(200).json({
    app: {
      id: app.id,
      name: app.name,
      clientId: app.clientId,
      logoUrl: app.logoUrl,
      homepageUrl: app.homepageUrl,
    },
    user: {
      id: user.id,
      email: user.email,
      name:
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      avatar: user.avatar,
    },
    scopes,
    previouslyGrantedScopes: previouslyGranted,
  })
}

export async function consentApprove(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<ConsentBody>(req)

  const { app, scopes } = await service.validateClientRequest({
    responseType: body.response_type,
    clientId: body.client_id,
    redirectUri: body.redirect_uri,
    scope: body.scope,
  })

  const user = await requireCurrentUser(req)
  const grant = await repository.findGrant(user.id, app.id)

  // The stored grant records only the three identity scopes. Anything else the
  // app asked for is honoured for this authorization but not remembered, so a
  // later request for it has to ask again.
  const merged = [...new Set([...(grant?.scopes ?? []), ...scopes])]
  const storedScopes = ['openid', 'profile', 'email'].filter((scope) =>
    merged.includes(scope)
  )

  await repository.upsertGrant({
    id: generateId('oauthGrant'),
    userId: user.id,
    appId: app.id,
    scopes: storedScopes,
    now: BigInt(nowUnixSeconds()),
  })

  log.info(
    {
      user_id: user.id,
      app_id: app.id,
      client_id: body.client_id,
      scopes: storedScopes,
    },
    'oauth.consent.approved'
  )

  const redirectTo = await service.issueAuthorizationCode({
    userId: user.id,
    appId: app.id,
    orgId: req.get('X-Org-Id') || null,
    redirectUri: body.redirect_uri,
    scope: body.scope,
    state: body.state ?? null,
    nonce: body.nonce ?? null,
    codeChallenge: body.code_challenge ?? null,
    codeChallengeMethod: body.code_challenge_method ?? null,
  })

  res.status(200).json({ status: 'authorized', redirectTo })
}

export async function consentDeny(req: Request, res: Response): Promise<void> {
  const body = validBody<ConsentBody>(req)

  // The redirect URI is still validated on denial: without it, a denial could
  // be pointed anywhere, which is an open redirect that needs no credential.
  await service.validateClientRequest({
    responseType: body.response_type,
    clientId: body.client_id,
    redirectUri: body.redirect_uri,
    scope: null,
    invalidClientCode: 'provider/invalid-redirect-uri',
    invalidClientMessage: 'The redirect URI is not registered for this app.',
    invalidClientStatus: 400,
    validateScopes: false,
  })

  const redirectTo = service.buildRedirect(body.redirect_uri, {
    error: 'access_denied',
    error_description: 'The account owner denied access.',
    ...(body.state ? { state: body.state } : {}),
  })

  res.status(200).json({ status: 'authorized', redirectTo })
}
