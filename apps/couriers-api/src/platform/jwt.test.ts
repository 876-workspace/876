import { decodeJwt, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'

import { resetProviderJwtKeyCache, verifyProviderJwt } from './jwt'

const ISSUER = 'https://identity.example.test'
const AUDIENCE = 'client_couriers'
const JWKS_URL = `${ISSUER}/oauth/.well-known/jwks.json`

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  API_876_KEY: '876_app_secret_test_key_for_couriers_api',
  API_INTERNAL_KEY: 'test-internal-key',
  API_URL: ISSUER,
  OAUTH_ISSUER: ISSUER,
  OAUTH_AUDIENCE: AUDIENCE,
  OAUTH_JWKS_URL: JWKS_URL,
  SENTRY_DSN: '',
}

afterEach(() => {
  resetProviderJwtKeyCache()
  resetSettingsForTest(testEnv)
  vi.unstubAllGlobals()
})

function stubIdentity(jwk: Record<string, unknown>) {
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url.endsWith('/oauth/introspect')) {
        const token = new URLSearchParams(String(init?.body)).get('token') ?? ''
        return new Response(
          JSON.stringify({ active: true, sub: decodeJwt(token).sub })
        )
      }
      return new Response(
        JSON.stringify({
          keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
        })
      )
    }
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('verifyProviderJwt', () => {
  it('uses one fetched JWKS for multiple valid RS256 access tokens inside its cache TTL', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const sign = (subject: string) =>
      new SignJWT({ token_use: 'access' })
        .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
        .setIssuer(ISSUER)
        .setSubject(subject)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey)
    const firstToken = await sign('user_123')
    const secondToken = await sign('user_456')
    const fetchMock = stubIdentity(await exportJWK(publicKey))
    resetSettingsForTest(testEnv)

    await expect(verifyProviderJwt(firstToken)).resolves.toMatchObject({
      sub: 'user_123',
      token_use: 'access',
    })
    await expect(verifyProviderJwt(secondToken)).resolves.toMatchObject({
      sub: 'user_456',
      token_use: 'access',
    })
    const jwksCalls = fetchMock.mock.calls.filter(
      ([input]) => !String(input).endsWith('/oauth/introspect')
    )
    expect(jwksCalls).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns null without any network call when the identity API URL is unset', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await new SignJWT({ token_use: 'access', sid: 'ses_1' })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
      .setSubject('user_123')
      .setExpirationTime('5m')
      .sign(privateKey)
    const fetchMock = stubIdentity(await exportJWK(publicKey))
    resetSettingsForTest({ ...testEnv, API_URL: '' })

    await expect(verifyProviderJwt(token)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
