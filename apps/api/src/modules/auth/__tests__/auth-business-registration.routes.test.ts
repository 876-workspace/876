import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiKey, authService, completeAuth, recordFailure } = vi.hoisted(() => ({
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  authService: { registerBusiness: vi.fn() },
  completeAuth: vi.fn(),
  recordFailure: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('../auth.service', () => ({
  getAuthService: () => authService,
  completeAuth,
  recordFailure,
}))

const { createApp } = await import('@/application')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY }
const VALID_BODY = {
  email: 'owner@example.com',
  password: 'Password123!',
  firstName: 'Ada',
  lastName: 'Lovelace',
  organizationName: 'Analytical Engines',
  countryCode: 'JM',
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_1',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  authService.registerBusiness.mockResolvedValue({
    status: 'ok',
    user: { id: 'wos_user_1' },
  })
  completeAuth.mockResolvedValue({
    object: 'session',
    id: 'ses_1',
  })
})

describe('POST /auth/register-business country contract', () => {
  it('requires a canonical country routing fact', async () => {
    const body: Partial<typeof VALID_BODY> = { ...VALID_BODY }
    delete body.countryCode

    const response = await request(createApp())
      .post('/auth/register-business')
      .set(AUTH)
      .send(body)

    expect(response.status).toBe(422)
    expect(authService.registerBusiness).not.toHaveBeenCalled()
  })

  it('rejects country codes outside the shared catalog', async () => {
    const response = await request(createApp())
      .post('/auth/register-business')
      .set(AUTH)
      .send({ ...VALID_BODY, countryCode: 'ZZ' })

    expect(response.status).toBe(422)
    expect(authService.registerBusiness).not.toHaveBeenCalled()
  })

  it('rejects conflicting camel- and snake-case aliases', async () => {
    const response = await request(createApp())
      .post('/auth/register-business')
      .set(AUTH)
      .send({ ...VALID_BODY, country_code: 'US' })

    expect(response.status).toBe(422)
    expect(authService.registerBusiness).not.toHaveBeenCalled()
  })

  it('normalizes the accepted country before registration', async () => {
    const response = await request(createApp())
      .post('/auth/register-business')
      .set(AUTH)
      .send({ ...VALID_BODY, countryCode: ' jm ' })

    expect(response.status).toBe(200)
    expect(authService.registerBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'JM', sourceAppId: 'app_1' })
    )
  })
})
