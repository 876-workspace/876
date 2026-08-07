import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'
import { signProviderJwt } from '@/platform/jwt'
import { resetRateLimits } from '@/platform/rate-limit'

const NOW = 1785000000

function mobileNumberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mob_7fJ3',
    userId: 'user_2kL9',
    number: '+18765550100',
    type: 'mobile',
    isPrimary: false,
    verificationStatus: 'unverified',
    verificationId: null,
    verifiedAt: null,
    carrierName: null,
    lineType: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function verificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ver_abc',
    identifier: '+18765550100',
    value: '',
    type: 'phone',
    expiresAt: BigInt(NOW + 600),
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    provider: 'fake',
    providerSid: 'fake_sid',
    subjectType: 'mobile_number',
    subjectId: 'mob_7fJ3',
    channel: 'sms',
    status: 'pending',
    attemptCount: 0,
    lastSentAt: BigInt(NOW),
    canResendAt: BigInt(NOW + 60),
    verifiedAt: null,
    metadata: { send_count: 1 },
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'mobile_number',
  id: 'mob_7fJ3',
  user_id: 'user_2kL9',
  number: '+18765550100',
  type: 'mobile',
  is_primary: false,
  verification_status: 'unverified',
  verification_id: null,
  verified_at: null,
  carrier_name: null,
  line_type: null,
  created_at: NOW,
  updated_at: NOW,
}

const SERIALIZED_VERIFICATION = {
  object: 'mobile_number_verification',
  id: 'ver_abc',
  mobile_number_id: 'mob_7fJ3',
  provider: 'fake',
  provider_sid: 'fake_sid',
  channel: 'sms',
  status: 'pending',
  attempt_count: 0,
  last_sent_at: NOW,
  can_resend_at: NOW + 60,
  verified_at: null,
  expires_at: NOW + 600,
  created_at: NOW,
  updated_at: NOW,
}

const { userMobileNumber, verification, user, auditEvent, apiKey } = vi.hoisted(
  () => ({
    userMobileNumber: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    verification: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  })
)

vi.mock('@/db/client', () => ({
  prisma: { userMobileNumber, verification, user, auditEvent, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const USER_A = 'user_2kL9'
const USER_B = 'user_other'

async function bearerFor(userId: string): Promise<string> {
  return signProviderJwt({
    sub: userId,
    aud: 'client_876app',
    token_use: 'access',
    realm: 'consumer',
    exp: Math.floor(Date.now() / 1000) + 600,
  })
}

async function authHeaders(userId: string) {
  const token = await bearerFor(userId)
  return {
    'X-876-API-Key': APP_KEY,
    Authorization: `Bearer ${token}`,
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  // The fixtures express expiry relative to NOW, so the clock has to be NOW.
  // Against the real clock every verification in this file is already expired.
  // Only `Date` is faked: supertest drives real sockets, and faking timers
  // wholesale would stall the request rather than freeze the clock.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  resetRateLimits()
  resetSettingsForTest({
    ...process.env,
    TWILIO_MODE: 'fake',
    TWILIO_VERIFY_SMS_ENABLED: 'true',
    TWILIO_VERIFY_CALL_ENABLED: 'true',
    TWILIO_VERIFY_WHATSAPP_ENABLED: 'true',
  })

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  userMobileNumber.findFirst.mockResolvedValue(mobileNumberRow())
  userMobileNumber.findMany.mockResolvedValue([mobileNumberRow()])
  userMobileNumber.create.mockResolvedValue(mobileNumberRow())
  userMobileNumber.update.mockResolvedValue(mobileNumberRow())
  userMobileNumber.delete.mockResolvedValue(mobileNumberRow())
  userMobileNumber.updateMany.mockResolvedValue({ count: 1 })
  verification.findUnique.mockResolvedValue(verificationRow())
  verification.create.mockResolvedValue(verificationRow())
  verification.update.mockResolvedValue(verificationRow())
  user.findUnique.mockResolvedValue({
    id: USER_A,
    phone: '+18765550100',
    phoneVerified: true,
  })
  user.update.mockResolvedValue({})
  auditEvent.create.mockResolvedValue({})
})

// ---- CREATE ----

describe('POST /users/me/mobile-numbers', () => {
  it('creates a mobile number', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set(headers)
      .send({ number: '+18765550100', type: 'mobile' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
    expect(userMobileNumber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          number: '+18765550100',
          type: 'mobile',
        }),
      })
    )
  })

  it('rejects an international number missing the leading plus', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set(headers)
      .send({ number: '18765550100', type: 'mobile' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
    expect(userMobileNumber.create).not.toHaveBeenCalled()
  })

  it('requires an API key and a session', async () => {
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .send({ number: '+18765550100' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
    expect(userMobileNumber.create).not.toHaveBeenCalled()
  })

  it('returns 401 when the session is missing', async () => {
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set('X-876-API-Key', APP_KEY)
      .send({ number: '+18765550100' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('is invisible for another user — create duplicate check is scoped', async () => {
    // User A has +18765550100 already; user B creating same number should succeed
    // because get_by_number is scoped to the calling user in Python.
    // But we test that user B cannot reuse the id via retrieval; here we test
    // that the duplicate check does not leak: when B attempts same number, it
    // should be allowed (no existing row for B).
    userMobileNumber.findFirst.mockResolvedValue(null)
    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set(headers)
      .send({ number: '+18765550100', type: 'mobile' })

    expect(response.status).toBe(201)
  })

  it('rejects a duplicate number on the same user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(mobileNumberRow())

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set(headers)
      .send({ number: '+18765550100' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('communications/number-already-used')
  })

  it('rejects unknown fields', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers')
      .set(headers)
      .send({ number: '+18765550100', nonsense: true })

    expect(response.status).toBe(422)
  })
})

// ---- LIST ----

describe('GET /users/me/mobile-numbers', () => {
  it('lists the calling users numbers', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .get('/users/me/mobile-numbers')
      .set(headers)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/users/me/mobile-numbers',
        total_count: 1,
      },
      error: null,
    })
    expect(userMobileNumber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A } })
    )
  })

  it('requires authentication', async () => {
    const response = await request(createApp()).get('/users/me/mobile-numbers')

    expect(response.status).toBe(401)
  })

  it('does not leak another users numbers', async () => {
    userMobileNumber.findMany.mockResolvedValue([])
    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .get('/users/me/mobile-numbers')
      .set(headers)

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(userMobileNumber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_B } })
    )
  })
})

// ---- RETRIEVE ----

describe('GET /users/me/mobile-numbers/:mobile_number_id', () => {
  it('returns the mobile number', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .get('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
    expect(userMobileNumber.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mob_7fJ3', userId: USER_A } })
    )
  })

  it('404s an unknown id', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .get('/users/me/mobile-numbers/mob_gone')
      .set(headers)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })

  it('requires authentication', async () => {
    const response = await request(createApp()).get(
      '/users/me/mobile-numbers/mob_7fJ3'
    )

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    // findFirst with different userId returns null — must be 404 not 403
    userMobileNumber.findFirst.mockImplementation(async (args: unknown) => {
      const where = (args as { where: { userId: string } }).where
      if (where.userId === USER_B) return null
      return mobileNumberRow()
    })

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .get('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })
})

// ---- UPDATE ----

describe('PATCH /users/me/mobile-numbers/:mobile_number_id', () => {
  it('updates the type', async () => {
    const updated = mobileNumberRow({ type: 'work' })
    userMobileNumber.update.mockResolvedValue(updated)

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .patch('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)
      .send({ type: 'work' })

    expect(response.status).toBe(200)
    expect(response.body.data.type).toBe('work')
    expect(userMobileNumber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mob_7fJ3' },
        data: expect.objectContaining({ type: 'work' }),
      })
    )
  })

  it('rejects an invalid type', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .patch('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)
      .send({ type: 'invalid' })

    expect(response.status).toBe(422)
    expect(userMobileNumber.update).not.toHaveBeenCalled()
  })

  it('requires authentication', async () => {
    const response = await request(createApp())
      .patch('/users/me/mobile-numbers/mob_7fJ3')
      .send({ type: 'work' })

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .patch('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)
      .send({ type: 'work' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })
})

// ---- DELETE ----

describe('DELETE /users/me/mobile-numbers/:mobile_number_id', () => {
  it('deletes the mobile number', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .delete('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'mobile_number', id: 'mob_7fJ3', deleted: true },
      error: null,
    })
    expect(userMobileNumber.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mob_7fJ3' } })
    )
  })

  it('clears the user phone projection when deleting a primary number', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({ isPrimary: true })
    )

    const headers = await authHeaders(USER_A)
    await request(createApp())
      .delete('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_A },
        data: expect.objectContaining({ phone: null, phoneVerified: false }),
      })
    )
  })

  it('404s an unknown id', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .delete('/users/me/mobile-numbers/mob_gone')
      .set(headers)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })

  it('requires authentication', async () => {
    const response = await request(createApp()).delete(
      '/users/me/mobile-numbers/mob_7fJ3'
    )

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .delete('/users/me/mobile-numbers/mob_7fJ3')
      .set(headers)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })
})

// ---- CREATE VERIFICATION ----

describe('POST /users/me/mobile-numbers/:mobile_number_id/verifications', () => {
  it('sends a verification', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications')
      .set(headers)
      .send({ channel: 'sms' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: SERIALIZED_VERIFICATION,
      error: null,
    })
    expect(verification.create).toHaveBeenCalled()
  })

  it('rejects an unknown channel', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications')
      .set(headers)
      .send({ channel: 'email' })

    expect(response.status).toBe(422)
  })

  it('requires authentication', async () => {
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications')
      .send({ channel: 'sms' })

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications')
      .set(headers)
      .send({ channel: 'sms' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })

  it('is not shadowed by the :mobile_number_id route', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications')
      .set(headers)
      .send({ channel: 'sms' })

    expect(response.status).toBe(201)
    expect(verification.create).toHaveBeenCalled()
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ---- APPROVE VERIFICATION ----

describe('POST /users/me/mobile-numbers/:mobile_number_id/verifications/:verification_id/approve', () => {
  it('approves with the magic code', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({ verificationId: 'ver_abc' })
    )
    const approvedRow = verificationRow({ status: 'approved', attemptCount: 1 })
    verification.update.mockResolvedValue(approvedRow)
    // A standing `mockResolvedValue` rather than a queue of `…Once` values:
    // `clearMocks` does not drain the once-queue between tests, so any value
    // this test queued and did not consume would leak into the next one and
    // silently override its stub.
    userMobileNumber.update.mockResolvedValue(
      mobileNumberRow({
        verificationStatus: 'verified',
        verifiedAt: BigInt(NOW),
      })
    )

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .set(headers)
      .send({ code: '000000' })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('approved')
  })

  it('accepts makePrimary as camelCase alias', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({ verificationId: 'ver_abc' })
    )
    verification.update.mockResolvedValue(
      verificationRow({ status: 'approved', attemptCount: 1 })
    )
    userMobileNumber.update.mockResolvedValue(
      mobileNumberRow({ verificationStatus: 'verified', isPrimary: true })
    )

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .set(headers)
      .send({ code: '000000', makePrimary: true })

    expect(response.status).toBe(200)
    expect(userMobileNumber.updateMany).toHaveBeenCalled()
  })

  it('rejects a missing code', async () => {
    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .set(headers)
      .send({})

    expect(response.status).toBe(422)
  })

  it('requires authentication', async () => {
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .send({ code: '000000' })

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .set(headers)
      .send({ code: '000000' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })

  it('404s when the verification does not belong to the number', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({ verificationId: 'ver_other' })
    )

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/verifications/ver_abc/approve')
      .set(headers)
      .send({ code: '000000' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/verification-failed')
  })
})

// ---- MAKE PRIMARY ----

describe('POST /users/me/mobile-numbers/:mobile_number_id/make-primary', () => {
  it('makes a verified number primary', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({
        verificationStatus: 'verified',
        verifiedAt: BigInt(NOW),
      })
    )
    const primaryRow = mobileNumberRow({
      verificationStatus: 'verified',
      verifiedAt: BigInt(NOW),
      isPrimary: true,
    })
    userMobileNumber.update.mockResolvedValue(primaryRow)

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/make-primary')
      .set(headers)

    expect(response.status).toBe(200)
    expect(response.body.data.is_primary).toBe(true)
    expect(userMobileNumber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A, isPrimary: true } })
    )
    expect(user.update).toHaveBeenCalled()
  })

  it('rejects an unverified number', async () => {
    userMobileNumber.findFirst.mockResolvedValue(
      mobileNumberRow({ verificationStatus: 'unverified', verifiedAt: null })
    )

    const headers = await authHeaders(USER_A)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/make-primary')
      .set(headers)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/number-not-verified')
  })

  it('requires authentication', async () => {
    const response = await request(createApp()).post(
      '/users/me/mobile-numbers/mob_7fJ3/make-primary'
    )

    expect(response.status).toBe(401)
  })

  it('is invisible for another user', async () => {
    userMobileNumber.findFirst.mockResolvedValue(null)

    const headers = await authHeaders(USER_B)
    const response = await request(createApp())
      .post('/users/me/mobile-numbers/mob_7fJ3/make-primary')
      .set(headers)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
  })
})
