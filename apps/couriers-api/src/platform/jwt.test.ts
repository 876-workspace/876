import { exportJWK, generateKeyPair, SignJWT } from 'jose'
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

describe('verifyProviderJwt', () => {
  it('uses one fetched JWKS for multiple valid RS256 access tokens inside its cache TTL', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey)
    const firstToken = await new SignJWT({ token_use: 'access' })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
      .setIssuer(ISSUER)
      .setSubject('user_123')
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    const secondToken = await new SignJWT({ token_use: 'access' })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
      .setIssuer(ISSUER)
      .setSubject('user_456')
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
        })
      )
    )

    vi.stubGlobal('fetch', fetchMock)
    resetSettingsForTest(testEnv)

    await expect(verifyProviderJwt(firstToken)).resolves.toMatchObject({
      sub: 'user_123',
      token_use: 'access',
    })
    await expect(verifyProviderJwt(secondToken)).resolves.toMatchObject({
      sub: 'user_456',
      token_use: 'access',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
