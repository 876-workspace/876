import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'

import { resetProviderJwtKeyCache, verifyProviderJwt } from './jwt'

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  API_876_KEY: '876_app_secret_test_key_for_couriers_api',
  API_INTERNAL_KEY: 'test-internal-key',
  OAUTH_JWKS_URL: 'https://platform.example.test/oauth/.well-known/jwks.json',
  SENTRY_DSN: '',
}

afterEach(() => {
  resetProviderJwtKeyCache()
  resetSettingsForTest(testEnv)
  vi.unstubAllGlobals()
})

describe('verifyProviderJwt', () => {
  it('accepts an RS256 platform access token signed by the configured JWKS', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey)
    const token = await new SignJWT({ token_use: 'access', realm: 'consumer' })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
      .setSubject('user_123')
      .setAudience('app_couriers')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
          })
        )
      )
    )
    resetSettingsForTest(testEnv)

    await expect(verifyProviderJwt(token)).resolves.toMatchObject({
      sub: 'user_123',
      token_use: 'access',
    })
  })

  it('rejects an HMAC token, even when its key matches a legacy cookie secret', async () => {
    const token = await new SignJWT({ token_use: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user_123')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('test-session-cookie-secret-32-chars!!'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    resetSettingsForTest(testEnv)

    await expect(verifyProviderJwt(token)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
