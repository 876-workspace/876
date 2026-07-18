import type { z } from 'zod'

import { createOAuthError, mapOAuthErrorCode } from './errors.ts'
import type {
  AuthorizationUrlParams,
  DiscoveryDocument,
  IntrospectParams,
  IntrospectResponse,
  OAuthError,
  OAuthResult,
  PkcePair,
  RefreshTokenParams,
  RevokeParams,
  RevokeResponse,
  TokenParams,
  TokenResponse,
  UserInfo,
  UserInfoParams,
} from './types/oauth.ts'
import {
  oauth876AuthorizationUrlParamsSchema,
  oauth876DiscoveryDocumentSchema,
  oauth876IntrospectParamsSchema,
  oauth876IntrospectResponseSchema,
  oauth876RefreshTokenParamsSchema,
  oauth876RevokeParamsSchema,
  oauth876RevokeResponseSchema,
  oauth876TokenParamsSchema,
  oauth876TokenResponseSchema,
  oauth876UserInfoParamsSchema,
  oauth876UserInfoSchema,
} from './types/oauth.ts'

const oauthEndpoints = {
  authorize: '/oauth/authorize',
  token: '/oauth/token',
  userinfo: '/oauth/userinfo',
  revoke: '/oauth/revoke',
  introspect: '/oauth/introspect',
  discovery: '/.well-known/openid-configuration',
} as const

/** Resolved runtime config backing the `$876.oauth.*` namespace. */
export type OAuthRuntime = {
  baseUrl: string
  clientId: string
  redirectUri: string
  clientSecret: string | undefined
  apiKey: string | undefined
  fetch: typeof fetch
  /** False when the unified client was created without an `oauth` config block. */
  configured: boolean
}

/**
 * Builds the OAuth/OIDC method namespace for the unified 876 client.
 *
 * These methods build authorization URLs and perform token, userinfo, revoke,
 * and discovery requests for "Sign in with 876" relying-party flows. Browser
 * code may use public-client operations such as authorization URL generation.
 * Keep `clientSecret` server-side only. Consumed internally by
 * {@link create876Client}; not exported as a standalone factory.
 *
 * @param runtime - Resolved OAuth runtime configuration.
 * @returns OAuth helper methods that use `{ data, error }` result envelopes.
 */
export function createOAuthMethods(runtime: OAuthRuntime) {
  return {
    /**
     * Builds the authorization URL for the browser redirect step.
     *
     * @param params - Scopes, PKCE challenge, and optional state/nonce/prompt.
     * @returns A result envelope containing the URL string.
     * @see GET /oauth/authorize
     */
    getAuthorizationUrl(params: AuthorizationUrlParams): OAuthResult<string> {
      if (!runtime.configured)
        return {
          data: null,
          error: createOAuthError('oauth/client-not-configured'),
        }
      const validation = validateParams(
        oauth876AuthorizationUrlParamsSchema,
        params
      )
      if (validation.error) return validation

      const url = new URL(
        resolveOAuthUrl(runtime.baseUrl, oauthEndpoints.authorize)
      )
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', runtime.clientId)
      url.searchParams.set(
        'redirect_uri',
        validation.data.redirectUri ?? runtime.redirectUri
      )
      url.searchParams.set('scope', validation.data.scope.join(' '))
      url.searchParams.set('code_challenge', validation.data.codeChallenge)
      url.searchParams.set('code_challenge_method', 'S256')
      if (validation.data.state)
        url.searchParams.set('state', validation.data.state)
      if (validation.data.nonce)
        url.searchParams.set('nonce', validation.data.nonce)
      if (validation.data.prompt)
        url.searchParams.set('prompt', validation.data.prompt)

      return { data: url.toString(), error: null }
    },

    /**
     * Exchanges an authorization code for an OAuth token response.
     *
     * Call this from server-side callback handling when using confidential
     * clients or whenever a `clientSecret` is configured.
     *
     * @param params - Authorization code and PKCE verifier.
     * @returns A result envelope containing token fields.
     * @see POST /oauth/token
     */
    exchangeCodeForToken(
      params: TokenParams
    ): Promise<OAuthResult<TokenResponse>> {
      const validation = validateParams(oauth876TokenParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: validation.data.code,
        client_id: runtime.clientId,
        redirect_uri: validation.data.redirectUri ?? runtime.redirectUri,
        code_verifier: validation.data.codeVerifier,
      })
      if (runtime.clientSecret) body.set('client_secret', runtime.clientSecret)

      return sendOAuthRequest(
        runtime,
        'POST',
        oauthEndpoints.token,
        oauth876TokenResponseSchema,
        { body }
      )
    },

    /**
     * Exchanges a refresh token for a new access token.
     *
     * The 876 OAuth provider rotates refresh tokens. If the response contains a
     * `refresh_token`, persist the new value and discard the old one.
     *
     * @param params - Refresh token issued by a prior token response.
     * @returns A result envelope containing a refreshed token response.
     * @see POST /oauth/token
     */
    refreshToken(
      params: RefreshTokenParams
    ): Promise<OAuthResult<TokenResponse>> {
      const validation = validateParams(
        oauth876RefreshTokenParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: validation.data.refreshToken,
        client_id: runtime.clientId,
      })
      if (runtime.clientSecret) body.set('client_secret', runtime.clientSecret)

      return sendOAuthRequest(
        runtime,
        'POST',
        oauthEndpoints.token,
        oauth876TokenResponseSchema,
        { body }
      )
    },

    /**
     * Retrieves OpenID Connect userinfo for an access token.
     *
     * @param params - Access token to present as a bearer token.
     * @returns A result envelope containing OIDC user claims.
     * @see GET /oauth/userinfo
     */
    getUserInfo(params: UserInfoParams): Promise<OAuthResult<UserInfo>> {
      const validation = validateParams(oauth876UserInfoParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)

      return sendOAuthRequest(
        runtime,
        'GET',
        oauthEndpoints.userinfo,
        oauth876UserInfoSchema,
        { bearerToken: validation.data.accessToken }
      )
    },

    /**
     * Revokes an access or refresh token.
     *
     * @param params - Token to revoke.
     * @returns A result envelope containing the revoke response.
     * @see POST /oauth/revoke
     */
    revokeToken(params: RevokeParams): Promise<OAuthResult<RevokeResponse>> {
      const validation = validateParams(oauth876RevokeParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)

      return sendOAuthRequest(
        runtime,
        'POST',
        oauthEndpoints.revoke,
        oauth876RevokeResponseSchema,
        { body: new URLSearchParams({ token: validation.data.token }) }
      )
    },

    /**
     * Introspects an OAuth access token.
     *
     * This endpoint is intended for server-side app callers. The OAuth runtime
     * must include an app API key so the request can authenticate as the client.
     *
     * @param params - Token to introspect.
     * @returns A result envelope containing RFC 7662-style token metadata.
     * @see POST /oauth/introspect
     */
    introspectToken(
      params: IntrospectParams
    ): Promise<OAuthResult<IntrospectResponse>> {
      const validation = validateParams(oauth876IntrospectParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)

      return sendOAuthRequest(
        runtime,
        'POST',
        oauthEndpoints.introspect,
        oauth876IntrospectResponseSchema,
        { body: new URLSearchParams({ token: validation.data.token }) }
      )
    },

    /**
     * Fetches the OpenID Provider discovery document.
     *
     * @returns A result envelope containing issuer, endpoint, and capability metadata.
     * @see GET /.well-known/openid-configuration
     */
    discover(): Promise<OAuthResult<DiscoveryDocument>> {
      return sendOAuthRequest(
        runtime,
        'GET',
        oauthEndpoints.discovery,
        oauth876DiscoveryDocumentSchema
      )
    },
  }
}

export type OAuthClient = ReturnType<typeof createOAuthMethods>

export type {
  AuthorizationUrlParams,
  DiscoveryDocument,
  IntrospectParams,
  IntrospectResponse,
  OAuthError,
  OAuthResult,
  PkcePair,
  RefreshTokenParams,
  RevokeParams,
  RevokeResponse,
  TokenParams,
  TokenResponse,
  UserInfo,
  UserInfoParams,
} from './types/oauth.ts'

/** Options for the public "Sign in with 876" OAuth client. */
export type SignInWith876Options = {
  /** Issuer origin, e.g. `https://876-app.vercel.app`. */
  baseUrl: string
  /** The registered OAuth client ID. */
  clientId: string
  /** A redirect URI registered for this client. */
  redirectUri: string
  /** Client secret for confidential clients. Server-side only — never ship to a browser. */
  clientSecret?: string
  /** Optional fetch implementation (defaults to the global `fetch`). */
  fetch?: typeof fetch
}

/**
 * Creates a standalone "Sign in with 876" OAuth client for third-party relying
 * parties.
 *
 * This is the public, request-only entry point for the OAuth/OIDC flow: build an
 * authorization URL, exchange the code for tokens, fetch userinfo, revoke, and
 * discover. Pair with {@link generatePkce}. It never touches first-party session
 * state or credentials — that is the boundary between this and `create876Client`.
 *
 * @param options - Issuer base URL, client ID, redirect URI, optional secret.
 * @returns The OAuth method namespace (`getAuthorizationUrl`, `exchangeCodeForToken`, …).
 *
 * @example
 * const oauth = createSignInWith876({ baseUrl, clientId, redirectUri })
 * const { codeVerifier, codeChallenge } = await generatePkce()
 * const { data: url } = oauth.getAuthorizationUrl({ scope: ['openid', 'profile'], codeChallenge })
 */
export function createSignInWith876(
  options: SignInWith876Options
): OAuthClient {
  return createOAuthMethods({
    baseUrl: options.baseUrl,
    clientId: options.clientId,
    redirectUri: options.redirectUri,
    clientSecret: options.clientSecret,
    apiKey: undefined,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    configured: true,
  })
}

/**
 * Generates a PKCE verifier/challenge pair using Web Crypto.
 *
 * Store the `codeVerifier` securely for the callback step and send only the
 * `codeChallenge` in the authorization URL.
 *
 * @returns A PKCE pair for the OAuth authorization code flow.
 */
export async function generatePkce(): Promise<PkcePair> {
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  )

  return {
    codeVerifier,
    codeChallenge: base64UrlEncode(new Uint8Array(digest)),
  }
}

type RequestInitOptions = {
  body?: URLSearchParams
  bearerToken?: string
}

async function sendOAuthRequest<TSuccess>(
  runtime: OAuthRuntime,
  method: 'GET' | 'POST',
  path: string,
  successSchema: z.ZodType<TSuccess>,
  options: RequestInitOptions = {}
): Promise<OAuthResult<TSuccess>> {
  if (!runtime.configured)
    return {
      data: null,
      error: createOAuthError('oauth/client-not-configured'),
    }
  try {
    const headers: Record<string, string> = {}
    if (method === 'POST')
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (options.bearerToken)
      headers.Authorization = `Bearer ${options.bearerToken}`
    else if (runtime.apiKey) headers.Authorization = `Bearer ${runtime.apiKey}`

    const init: RequestInit = {
      method,
      headers,
    }
    if (options.body) init.body = options.body.toString()

    const response = await runtime.fetch(
      resolveOAuthUrl(runtime.baseUrl, path),
      init
    )
    const payload: unknown = await response.json().catch(() => null)
    if (payload === null) return oauthInvalidResponse()

    if (!response.ok) return normalizeOAuthError(payload)

    const responsePayload = isOAuthResultPayload(payload)
      ? payload.data
      : payload
    const parsed = successSchema.safeParse(responsePayload)
    if (!parsed.success) return oauthInvalidResponse()

    return { data: parsed.data, error: null }
  } catch {
    return { data: null, error: createOAuthError('network/offline') }
  }
}

function validateParams<TParams>(
  schema: z.ZodType<TParams>,
  params: unknown
): { data: TParams; error: null } | { data: null; error: OAuthError } {
  const parsed = schema.safeParse(params)
  if (!parsed.success)
    return { data: null, error: createOAuthError('oauth/invalid-input') }

  return { data: parsed.data, error: null }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)

  return bytes
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  const base64 = globalThis.btoa(binary)

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function resolveOAuthUrl(baseUrl: string, path: string): string {
  return new URL(
    path,
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  ).toString()
}

function oauthInvalidResponse(): OAuthResult<never> {
  return { data: null, error: createOAuthError('oauth/invalid-response') }
}

function normalizeOAuthError(payload: unknown): OAuthResult<never> {
  if (typeof payload !== 'object' || payload === null)
    return oauthInvalidResponse()

  const error = isOAuthResultPayload(payload)
    ? payload.error
    : 'error' in payload
      ? payload.error
      : undefined
  if (typeof error === 'string')
    return { data: null, error: createOAuthError(mapOAuthErrorCode(error)) }

  if (typeof error !== 'object' || error === null) return oauthInvalidResponse()

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : undefined
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined
  if (!code) return oauthInvalidResponse()

  const oauthCode = code.startsWith('provider/')
    ? code.slice('provider/'.length).replaceAll('-', '_')
    : code

  return {
    data: null,
    error: createOAuthError(
      mapOAuthErrorCode(oauthCode),
      message ? { message } : {}
    ),
  }
}

function isOAuthResultPayload(
  payload: unknown
): payload is { data: unknown; error: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    'error' in payload
  )
}
