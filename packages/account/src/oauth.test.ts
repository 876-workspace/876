import { describe, expect, it, vi } from 'vitest'

import { create876Client } from './client.ts'
import { createSignInWith876, generatePkce } from './oauth.ts'
import type {
  IntrospectParams,
  IntrospectResponse,
  RefreshTokenParams,
} from './index.ts'
import type { TokenResponse } from './oauth.ts'

/**
 * Builds the `$876.oauth` namespace from the unified client. The OAuth client
 * is no longer a standalone factory; this shim keeps the existing coverage
 * pointed at the new surface.
 */
function createOAuthClient(opts: {
  baseUrl: string
  clientId: string
  redirectUri: string
  clientSecret?: string
  apiKey?: string
  fetch?: typeof fetch
}) {
  return create876Client({
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    fetch: opts.fetch,
    oauth: {
      clientId: opts.clientId,
      redirectUri: opts.redirectUri,
      clientSecret: opts.clientSecret,
    },
  }).oauth
}

const baseClient = () =>
  createOAuthClient({
    baseUrl: 'https://auth.example.com',
    clientId: 'client_4gH7kL2m',
    redirectUri: 'https://app.example.com/callback',
  })

const tokenResponse = {
  access_token: 'access_token_123',
  token_type: 'Bearer' as const,
  expires_in: 3600,
  scope: 'openid profile email',
  id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
}

function mockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

describe('$876.oauth', () => {
  describe('getAuthorizationUrl()', () => {
    it('builds an authorization URL with PKCE parameters', () => {
      const client = baseClient()

      const result = client.getAuthorizationUrl({
        codeChallenge: 'a'.repeat(43),
        state: 'state_123',
        nonce: 'nonce_123',
        prompt: 'consent',
      })

      expect(result.error).toBeNull()
      expect(result.data).toBe(
        'https://auth.example.com/oauth/authorize?response_type=code&client_id=client_4gH7kL2m&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&scope=openid+profile+email&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256&state=state_123&nonce=nonce_123&prompt=consent'
      )
    })

    it('omits optional params (state, nonce, prompt) when not provided', () => {
      const client = baseClient()

      const result = client.getAuthorizationUrl({
        codeChallenge: 'a'.repeat(43),
      })

      expect(result.error).toBeNull()
      expect(result.data).not.toContain('state=')
      expect(result.data).not.toContain('nonce=')
      expect(result.data).not.toContain('prompt=')
    })

    it('uses a per-call redirectUri override over the client-level default', () => {
      const client = baseClient()

      const result = client.getAuthorizationUrl({
        codeChallenge: 'a'.repeat(43),
        redirectUri: 'https://other.example.com/callback',
      })

      expect(result.error).toBeNull()
      expect(result.data).toContain(
        'redirect_uri=https%3A%2F%2Fother.example.com%2Fcallback'
      )
    })

    it('accepts offline_access in authorization scopes', () => {
      const client = baseClient()

      const result = client.getAuthorizationUrl({
        codeChallenge: 'a'.repeat(43),
        scope: ['openid', 'email', 'offline_access'],
      })

      expect(result.error).toBeNull()
      expect(result.data).toContain('scope=openid+email+offline_access')
    })

    it('returns an error for a code_challenge that is too short', () => {
      const client = baseClient()

      const result = client.getAuthorizationUrl({ codeChallenge: 'short' })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-input')
    })
  })

  describe('refreshToken()', () => {
    it('posts a refresh-token grant request and accepts rotated refresh tokens', async () => {
      const params = {
        refreshToken: 'refresh_token_123',
      } satisfies RefreshTokenParams
      const refreshedTokenResponse = {
        access_token: 'access_token_456',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        scope: 'openid email offline_access',
        id_token: null,
        refresh_token: 'refresh_token_456',
      } satisfies TokenResponse
      const fetchMock = mockFetch(refreshedTokenResponse)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: fetchMock,
      })

      const result = await client.refreshToken(params)

      expect(result).toEqual({ data: refreshedTokenResponse, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: 'grant_type=refresh_token&refresh_token=refresh_token_123&client_id=client_4gH7kL2m',
        })
      )
    })
  })

  describe('exchangeCodeForToken()', () => {
    it('posts token exchange requests as framework-agnostic form requests', async () => {
      const fetchMock = mockFetch(tokenResponse)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        apiKey: '876_app_secret_test',
        fetch: fetchMock,
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result).toEqual({ data: tokenResponse, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer 876_app_secret_test',
          },
          body: 'grant_type=authorization_code&code=code_123&client_id=client_4gH7kL2m&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&code_verifier=vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv',
        }
      )
    })

    it('includes client_secret for confidential client token exchange', async () => {
      const fetchMock = mockFetch(tokenResponse)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        clientSecret: 'secret_123',
        redirectUri: 'https://app.example.com/callback',
        fetch: fetchMock,
      })

      await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.objectContaining({
          body: 'grant_type=authorization_code&code=code_123&client_id=client_4gH7kL2m&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&code_verifier=vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv&client_secret=secret_123',
        })
      )
    })

    it('maps invalid_grant server error to oauth/invalid-grant', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: mockFetch({ error: 'invalid_grant' }, false),
      })

      const result = await client.exchangeCodeForToken({
        code: 'expired_code',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-grant')
      expect(result.error?.message).toBeTruthy()
    })

    it('maps access_denied server error to oauth/access-denied', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: mockFetch({ error: 'access_denied' }, false),
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/access-denied')
    })

    it('maps login_required server error to oauth/login-required', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: mockFetch({ error: 'login_required' }, false),
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/login-required')
    })

    it('maps invalid_scope server error to oauth/invalid-scope', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: mockFetch({ error: 'invalid_scope' }, false),
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-scope')
    })

    it('returns oauth/invalid-response for a non-JSON server body', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: vi.fn().mockResolvedValue({
          ok: false,
          json: () => Promise.reject(new Error('not json')),
        }),
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-response')
    })

    it('returns network/offline when fetch rejects', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: vi.fn().mockRejectedValue(new Error('Network failure')),
      })

      const result = await client.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('network/offline')
    })
  })

  describe('getUserInfo()', () => {
    it('sends a Bearer-authenticated GET request and returns parsed user info', async () => {
      const userInfo = {
        sub: 'user_123',
        email: 'person@example.com',
        email_verified: true,
        name: 'Person Example',
        given_name: 'Person',
        family_name: 'Example',
      }
      const fetchMock = mockFetch(userInfo)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: fetchMock,
      })

      const result = await client.getUserInfo({
        accessToken: 'access_token_123',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(userInfo)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/userinfo',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_token_123',
          }) as unknown as HeadersInit,
        })
      )
    })

    it('returns network/offline when the userinfo request fails', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: vi.fn().mockRejectedValue(new Error('Network failure')),
      })

      const result = await client.getUserInfo({
        accessToken: 'access_token_123',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('network/offline')
    })
  })

  describe('revokeToken()', () => {
    it('posts a token revocation request and returns the revoked response', async () => {
      const revokeResponse = { revoked: true as const }
      const fetchMock = mockFetch(revokeResponse)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: fetchMock,
      })

      const result = await client.revokeToken({ token: 'access_token_123' })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(revokeResponse)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/revoke',
        expect.objectContaining({
          method: 'POST',
          body: 'token=access_token_123',
        })
      )
    })

    it('returns oauth/invalid-input for missing token', async () => {
      const client = baseClient()

      const result = await client.revokeToken({
        token: '',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-input')
    })
  })

  describe('introspectToken()', () => {
    it('posts an authenticated introspection request', async () => {
      const params = { token: 'access_token_123' } satisfies IntrospectParams
      const introspectResponse = {
        active: true,
        scope: 'openid email',
        app_id: 'rap_example',
        client_id: 'client_4gH7kL2m',
        sub: 'usr_123',
        token_type: 'Bearer' as const,
        exp: 1_800_000_000,
        iat: 1_799_996_400,
      } satisfies IntrospectResponse
      const fetchMock = mockFetch(introspectResponse)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        apiKey: '876_app_secret_test',
        fetch: fetchMock,
      })

      const result = await client.introspectToken(params)

      expect(result).toEqual({ data: introspectResponse, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/introspect',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer 876_app_secret_test',
          },
          body: 'token=access_token_123',
        })
      )
    })
  })

  describe('discover()', () => {
    it('fetches and parses the OpenID Connect discovery document', async () => {
      const discoveryDoc = {
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/oauth/authorize',
        token_endpoint: 'https://auth.example.com/oauth/token',
        userinfo_endpoint: 'https://auth.example.com/oauth/userinfo',
        revocation_endpoint: 'https://auth.example.com/oauth/revoke',
        introspection_endpoint: 'https://auth.example.com/oauth/introspect',
        jwks_uri: 'https://auth.example.com/.well-known/jwks.json',
        response_types_supported: ['code' as const],
        grant_types_supported: [
          'authorization_code' as const,
          'refresh_token' as const,
        ],
        subject_types_supported: ['public' as const],
        id_token_signing_alg_values_supported: ['RS256' as const],
        scopes_supported: [
          'openid' as const,
          'profile' as const,
          'email' as const,
          'offline_access' as const,
        ],
        code_challenge_methods_supported: ['S256' as const],
        token_endpoint_auth_methods_supported: [
          'none' as const,
          'client_secret_basic' as const,
        ],
        claims_supported: ['sub', 'email', 'name'],
      }
      const fetchMock = mockFetch(discoveryDoc)
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: fetchMock,
      })

      const result = await client.discover()

      expect(result.error).toBeNull()
      expect(result.data).toEqual(discoveryDoc)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://auth.example.com/.well-known/openid-configuration',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns oauth/invalid-response when the discovery document shape is malformed', async () => {
      const client = createOAuthClient({
        baseUrl: 'https://auth.example.com',
        clientId: 'client_4gH7kL2m',
        redirectUri: 'https://app.example.com/callback',
        fetch: mockFetch({ issuer: 'not-a-url' }),
      })

      const result = await client.discover()

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('oauth/invalid-response')
    })
  })

  describe('not configured', () => {
    it('returns oauth/client-not-configured when no oauth block is provided', async () => {
      const client = create876Client({ baseUrl: 'https://auth.example.com' })

      const urlResult = client.oauth.getAuthorizationUrl({
        codeChallenge: 'a'.repeat(43),
      })
      expect(urlResult.data).toBeNull()
      expect(urlResult.error?.code).toBe('oauth/client-not-configured')

      const tokenResult = await client.oauth.exchangeCodeForToken({
        code: 'code_123',
        codeVerifier: 'v'.repeat(43),
      })
      expect(tokenResult.data).toBeNull()
      expect(tokenResult.error?.code).toBe('oauth/client-not-configured')
    })
  })
})

describe('createSignInWith876()', () => {
  it('creates the standalone OAuth client factory', () => {
    const client = createSignInWith876({
      baseUrl: 'https://auth.example.com',
      clientId: 'client_4gH7kL2m',
      redirectUri: 'https://app.example.com/callback',
    })

    const result = client.getAuthorizationUrl({
      codeChallenge: 'a'.repeat(43),
    })

    expect(result.error).toBeNull()
    expect(result.data).toContain('client_id=client_4gH7kL2m')
  })
})

describe('generatePkce()', () => {
  it('generates a valid PKCE verifier and challenge pair', async () => {
    const result = await generatePkce()

    expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(result.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/u)
  })

  it('generates unique pairs on each call', async () => {
    const a = await generatePkce()
    const b = await generatePkce()

    expect(a.codeVerifier).not.toBe(b.codeVerifier)
    expect(a.codeChallenge).not.toBe(b.codeChallenge)
  })
})
