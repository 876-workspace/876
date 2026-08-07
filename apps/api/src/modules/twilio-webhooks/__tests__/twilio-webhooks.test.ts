import { createHmac } from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as config from '@/config'

const { communicationWebhookEvent, communicationMessage, communicationCall } =
  vi.hoisted(() => ({
    communicationWebhookEvent: { findFirst: vi.fn(), create: vi.fn() },
    communicationMessage: { findFirst: vi.fn(), update: vi.fn() },
    communicationCall: { findFirst: vi.fn(), update: vi.fn() },
  }))

vi.mock('@/db/client', () => ({
  prisma: {
    communicationWebhookEvent,
    communicationMessage,
    communicationCall,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const AUTH_TOKEN = 'test-twilio-auth-token'
const BASE_URL = 'https://api.876.test'
const NOW = 1785000000

const BASE_SETTINGS = config.getSettings()

function withTwilio(overrides: Record<string, unknown> = {}) {
  vi.spyOn(config, 'getSettings').mockReturnValue({
    ...BASE_SETTINGS,
    twilio: {
      ...BASE_SETTINGS.twilio,
      authToken: AUTH_TOKEN,
      webhookBaseUrl: BASE_URL,
      ...overrides,
    },
  } as never)
}

/**
 * Twilio's documented scheme: the full URL, then `key + value` for every form
 * parameter with keys sorted, HMAC-SHA1 under the auth token, base64.
 *
 * Computed here independently of the implementation rather than by calling it,
 * so the test would still fail if the verifier and the signer drifted together.
 */
function sign(path: string, params: Record<string, string>): string {
  let payload = `${BASE_URL}${path}`
  for (const key of Object.keys(params).sort()) payload += key + params[key]

  return createHmac('sha1', AUTH_TOKEN).update(payload, 'utf8').digest('base64')
}

function post(path: string, params: Record<string, string>) {
  return request(createApp())
    .post(path)
    .set('X-Twilio-Signature', sign(path, params))
    .type('form')
    .send(params)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  withTwilio()

  communicationWebhookEvent.findFirst.mockResolvedValue(null)
  communicationWebhookEvent.create.mockResolvedValue({})
  communicationMessage.findFirst.mockResolvedValue({
    id: 'msg_1',
    status: 'sent',
  })
  communicationMessage.update.mockResolvedValue({})
  communicationCall.findFirst.mockResolvedValue({
    id: 'cal_1',
    status: 'ringing',
    startedAt: null,
  })
  communicationCall.update.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('signature verification', () => {
  const PARAMS = { MessageSid: 'SM1', MessageStatus: 'delivered' }

  it('accepts a correctly signed callback', async () => {
    const response = await post('/webhooks/twilio/messages/status', PARAMS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { processed: true },
      error: null,
    })
  })

  it('rejects a callback with no signature header', async () => {
    const response = await request(createApp())
      .post('/webhooks/twilio/messages/status')
      .type('form')
      .send(PARAMS)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe(
      'communications/invalid-webhook-signature'
    )
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('rejects a signature computed over different parameters', async () => {
    // The tampered value is what a forged callback would change.
    const response = await request(createApp())
      .post('/webhooks/twilio/messages/status')
      .set(
        'X-Twilio-Signature',
        sign('/webhooks/twilio/messages/status', PARAMS)
      )
      .type('form')
      .send({ ...PARAMS, MessageStatus: 'failed' })

    expect(response.status).toBe(403)
    expect(communicationMessage.update).not.toHaveBeenCalled()
  })

  it('rejects a signature computed over a different path', async () => {
    const response = await request(createApp())
      .post('/webhooks/twilio/calls/status')
      .set(
        'X-Twilio-Signature',
        sign('/webhooks/twilio/messages/status', PARAMS)
      )
      .type('form')
      .send(PARAMS)

    expect(response.status).toBe(403)
  })

  it('rejects every callback when the auth token is unset', async () => {
    // A permissive fallback would leave these endpoints open to anyone who can
    // reach them.
    withTwilio({ authToken: '' })

    const response = await post('/webhooks/twilio/messages/status', PARAMS)

    expect(response.status).toBe(403)
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('rejects every callback when the public base URL is unset', async () => {
    withTwilio({ webhookBaseUrl: '' })

    const response = await post('/webhooks/twilio/messages/status', PARAMS)

    expect(response.status).toBe(403)
  })

  it('verifies against the configured URL, not a forwarded host header', async () => {
    // Rebuilding the URL from Host lets whoever sets that header choose the
    // string being signed, which is the whole attack this check stops.
    const response = await request(createApp())
      .post('/webhooks/twilio/messages/status')
      .set(
        'X-Twilio-Signature',
        sign('/webhooks/twilio/messages/status', PARAMS)
      )
      .set('X-Forwarded-Host', 'evil.test')
      .set('Host', 'evil.test')
      .type('form')
      .send(PARAMS)

    expect(response.status).toBe(200)
  })

  it('includes unknown Twilio parameters in the signed payload', async () => {
    // Twilio signs every field it sends, including ones this service has never
    // seen, so discarding them would reject legitimate future callbacks.
    const params = { ...PARAMS, SomeFutureField: 'x', AccountSid: 'AC1' }

    const response = await post('/webhooks/twilio/messages/status', params)

    expect(response.status).toBe(200)
  })
})

describe('POST /webhooks/twilio/messages/status', () => {
  it('applies a forward transition and stamps delivered_at', async () => {
    const response = await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'delivered',
    })

    expect(response.status).toBe(200)
    expect(communicationMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg_1' },
      data: {
        status: 'delivered',
        updatedAt: BigInt(NOW),
        deliveredAt: BigInt(NOW),
      },
    })
  })

  it('ignores a lower-ranked status arriving late', async () => {
    // Twilio retries and delivers out of order; a late `sent` must not
    // overwrite `delivered`.
    communicationMessage.findFirst.mockResolvedValue({
      id: 'msg_1',
      status: 'delivered',
    })

    const response = await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'sent',
    })

    expect(response.status).toBe(200)
    expect(communicationMessage.update).not.toHaveBeenCalled()
  })

  it('ignores any update after a terminal outcome', async () => {
    communicationMessage.findFirst.mockResolvedValue({
      id: 'msg_1',
      status: 'failed',
    })

    await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'delivered',
    })

    expect(communicationMessage.update).not.toHaveBeenCalled()
  })

  it('records the provider error code on a terminal status', async () => {
    await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'undelivered',
      ErrorCode: '30003',
    })

    expect(communicationMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg_1' },
      data: {
        status: 'undelivered',
        updatedAt: BigInt(NOW),
        failedAt: BigInt(NOW),
        providerErrorCode: '30003',
      },
    })
  })

  it('answers processed:false for a duplicate payload', async () => {
    communicationWebhookEvent.findFirst.mockResolvedValue({ id: 'whe_1' })

    const response = await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'delivered',
    })

    expect(response.body.data).toEqual({ processed: false })
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
    expect(communicationMessage.update).not.toHaveBeenCalled()
  })

  it('treats a concurrent duplicate insert as a duplicate, not a failure', async () => {
    // Two retries can land at once; without catching the unique violation one
    // would 500 and Twilio would retry it again.
    communicationWebhookEvent.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' })
    )

    const response = await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM1',
      MessageStatus: 'delivered',
    })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ processed: false })
  })

  it('falls back to SmsSid when MessageSid is absent', async () => {
    const response = await post('/webhooks/twilio/messages/status', {
      SmsSid: 'SM2',
      MessageStatus: 'delivered',
    })

    expect(response.status).toBe(200)
    expect(communicationMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerSid: 'SM2' } })
    )
  })

  it('answers processed:false when no identifier is present', async () => {
    const response = await post('/webhooks/twilio/messages/status', {
      MessageStatus: 'delivered',
    })

    expect(response.body.data).toEqual({ processed: false })
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('records the event even when the message is unknown', async () => {
    // The callback still happened; dropping the record would let a retry be
    // processed again later if the message row appeared in between.
    communicationMessage.findFirst.mockResolvedValue(null)

    const response = await post('/webhooks/twilio/messages/status', {
      MessageSid: 'SM_unknown',
      MessageStatus: 'delivered',
    })

    expect(response.body.data).toEqual({ processed: true })
    expect(communicationWebhookEvent.create).toHaveBeenCalledTimes(1)
  })
})

describe('POST /webhooks/twilio/messages/inbound', () => {
  it('accepts the callback without retaining the message body', async () => {
    const response = await post('/webhooks/twilio/messages/inbound', {
      MessageSid: 'SM1',
      Body: 'something a member of the public wrote',
    })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ processed: true })
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
    expect(communicationMessage.update).not.toHaveBeenCalled()
  })

  it('still requires a valid signature', async () => {
    const response = await request(createApp())
      .post('/webhooks/twilio/messages/inbound')
      .type('form')
      .send({ MessageSid: 'SM1' })

    expect(response.status).toBe(403)
  })
})

describe('POST /webhooks/twilio/calls/status', () => {
  it('stamps started_at the first time the call is in flight', async () => {
    const response = await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'in-progress',
    })

    expect(response.status).toBe(200)
    expect(communicationCall.update).toHaveBeenCalledWith({
      where: { id: 'cal_1' },
      data: {
        status: 'in-progress',
        updatedAt: BigInt(NOW),
        startedAt: BigInt(NOW),
      },
    })
  })

  it('does not move started_at once it is set', async () => {
    communicationCall.findFirst.mockResolvedValue({
      id: 'cal_1',
      status: 'ringing',
      startedAt: BigInt(NOW - 30),
    })

    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'in-progress',
    })

    const data = communicationCall.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('startedAt')
  })

  it('stores the duration and derives the answer time on completion', async () => {
    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'completed',
      CallDuration: '42',
    })

    expect(communicationCall.update).toHaveBeenCalledWith({
      where: { id: 'cal_1' },
      data: {
        status: 'completed',
        updatedAt: BigInt(NOW),
        completedAt: BigInt(NOW),
        durationSeconds: 42,
        answeredAt: BigInt(NOW - 42),
      },
    })
  })

  it('prefers a reported AnsweredAt over the derived one', async () => {
    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'completed',
      CallDuration: '42',
      AnsweredAt: String(NOW - 10),
    })

    const data = communicationCall.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.answeredAt).toBe(BigInt(NOW - 10))
  })

  it('ignores a malformed duration rather than storing a plausible number', async () => {
    // parseInt('42abc') is 42 in JavaScript where Python's int() raises.
    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'completed',
      CallDuration: '42abc',
    })

    const data = communicationCall.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('durationSeconds')
    expect(data).not.toHaveProperty('answeredAt')
  })

  it('ignores a blank duration rather than reading it as zero', async () => {
    // Number(' ') is 0 in JavaScript where Python's int(' ') raises.
    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'completed',
      CallDuration: ' ',
    })

    const data = communicationCall.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).not.toHaveProperty('durationSeconds')
  })

  it('records the error code on a non-completed terminal state', async () => {
    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'busy',
      ErrorCode: '13224',
    })

    expect(communicationCall.update).toHaveBeenCalledWith({
      where: { id: 'cal_1' },
      data: {
        status: 'busy',
        updatedAt: BigInt(NOW),
        completedAt: BigInt(NOW),
        providerErrorCode: '13224',
      },
    })
  })

  it('ignores any update after a terminal call state', async () => {
    communicationCall.findFirst.mockResolvedValue({
      id: 'cal_1',
      status: 'completed',
      startedAt: BigInt(NOW - 60),
    })

    await post('/webhooks/twilio/calls/status', {
      CallSid: 'CA1',
      CallStatus: 'in-progress',
    })

    expect(communicationCall.update).not.toHaveBeenCalled()
  })
})

describe('POST /webhooks/twilio/calls/inbound', () => {
  it('records the call and answers with empty TwiML', async () => {
    const response = await post('/webhooks/twilio/calls/inbound', {
      CallSid: 'CA9',
      From: '+18765550142',
    })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/xml')
    expect(response.text).toBe('<Response/>')
    expect(communicationWebhookEvent.create).toHaveBeenCalledTimes(1)
  })

  it('still requires a valid signature', async () => {
    const response = await request(createApp())
      .post('/webhooks/twilio/calls/inbound')
      .type('form')
      .send({ CallSid: 'CA9' })

    expect(response.status).toBe(403)
    expect(communicationWebhookEvent.create).not.toHaveBeenCalled()
  })
})

describe('POST /webhooks/twilio/voice', () => {
  const KEY = 'voice.test'

  function keySignature(templateKey: string): string {
    return createHmac('sha256', AUTH_TOKEN).update(templateKey).digest('hex')
  }

  function postVoice(query: string, params: Record<string, string> = {}) {
    const path = `/webhooks/twilio/voice${query}`
    return request(createApp())
      .post(path)
      .set('X-Twilio-Signature', sign(path, params))
      .type('form')
      .send(params)
  }

  it('serves the TwiML for a correctly signed template key', async () => {
    const response = await postVoice(
      `?template_key=${KEY}&signature=${keySignature(KEY)}`
    )

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/xml')
    expect(response.text).toBe(
      '<Response><Say>876 test notification</Say></Response>'
    )
  })

  it('refuses a template key whose signature does not match', async () => {
    // Without this, the URL could be edited into serving another template.
    const response = await postVoice(
      `?template_key=${KEY}&signature=${'0'.repeat(64)}`
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
  })

  it('refuses a key signed for a different template', async () => {
    const response = await postVoice(
      `?template_key=${KEY}&signature=${keySignature('voice.other')}`
    )

    expect(response.status).toBe(400)
  })

  it('refuses an unknown template even when correctly signed', async () => {
    const response = await postVoice(
      `?template_key=voice.evil&signature=${keySignature('voice.evil')}`
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
  })

  it('refuses a request with no template key', async () => {
    const response = await postVoice('')

    expect(response.status).toBe(400)
  })

  it('requires the Twilio signature as well as the key signature', async () => {
    const response = await request(createApp())
      .post(
        `/webhooks/twilio/voice?template_key=${KEY}&signature=${keySignature(KEY)}`
      )
      .type('form')
      .send({})

    expect(response.status).toBe(403)
  })
})
