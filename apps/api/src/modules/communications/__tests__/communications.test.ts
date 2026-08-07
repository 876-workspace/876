import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as config from '@/config'

const {
  communicationMessage,
  communicationCall,
  communicationPhoneLookup,
  apiKey,
  lookupProvider,
  messagingProvider,
  voiceProvider,
} = vi.hoisted(() => ({
  communicationMessage: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  communicationCall: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  communicationPhoneLookup: { findUnique: vi.fn(), upsert: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  lookupProvider: { createLookup: vi.fn() },
  messagingProvider: { createMessage: vi.fn(), retrieveMessage: vi.fn() },
  voiceProvider: { createCall: vi.fn(), retrieveCall: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    communicationMessage,
    communicationCall,
    communicationPhoneLookup,
    apiKey,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

// Only the three factories are replaced; `channelDisabled` and `notConfigured`
// stay real, so the tests assert the error codes the provider layer actually
// produces rather than codes restated in the test.
vi.mock('@/providers/twilio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/providers/twilio')>()),
  getPhoneLookupProvider: () => lookupProvider,
  getMessagingProvider: () => messagingProvider,
  getVoiceProvider: () => voiceProvider,
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const KEY_ONLY = { 'X-876-API-Key': APP_KEY }
const AUTH = { ...KEY_ONLY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000
const NUMBER = '+18765550142'

const BASE_SETTINGS = config.getSettings()

/** Every channel defaults to off, so a happy path has to turn one on. */
function withTwilio(overrides: Record<string, unknown> = {}) {
  vi.spyOn(config, 'getSettings').mockReturnValue({
    ...BASE_SETTINGS,
    twilio: {
      ...BASE_SETTINGS.twilio,
      smsEnabled: true,
      whatsappEnabled: true,
      voiceEnabled: true,
      lookupEnabled: true,
      authToken: 'test-auth-token',
      webhookBaseUrl: 'https://api.876.test/',
      messagingServiceSid: 'MG0000000000000000000000000000000',
      whatsappContentSid: 'HX0000000000000000000000000000000',
      ...overrides,
    },
  } as never)
}

function messageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_7hK2',
    provider: 'twilio',
    providerSid: 'SM0001',
    channel: 'sms',
    direction: 'outbound',
    status: 'queued',
    toNumber: NUMBER,
    fromNumber: '+18765550100',
    messagingServiceSid: 'MG0000000000000000000000000000000',
    contentSid: null,
    bodyPreview: 'Template: sms.test',
    bodyHash: 'a'.repeat(64),
    userId: null,
    organizationId: null,
    appId: 'app_4qR8',
    clientReference: null,
    idempotencyKey: 'idem-1',
    providerErrorCode: null,
    sentAt: BigInt(NOW),
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function callRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cal_3nP9',
    provider: 'twilio',
    providerSid: 'CA0001',
    direction: 'outbound',
    status: 'queued',
    toNumber: NUMBER,
    fromNumber: '+18765550100',
    templateKey: 'voice.test',
    userId: null,
    organizationId: null,
    appId: 'app_4qR8',
    clientReference: null,
    idempotencyKey: 'idem-1',
    durationSeconds: null,
    providerErrorCode: null,
    startedAt: BigInt(NOW),
    answeredAt: null,
    completedAt: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function lookupRow(overrides: Record<string, unknown> = {}) {
  return {
    number: NUMBER,
    valid: true,
    e164: NUMBER,
    nationalFormat: '(876) 555-0142',
    countryCode: 'JM',
    carrierName: 'Digicel',
    lineType: null,
    mobileCountryCode: null,
    mobileNetworkCode: null,
    lineTypeRequested: false,
    createdAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED_MESSAGE = {
  object: 'communication_message',
  id: 'msg_7hK2',
  provider: 'twilio',
  provider_sid: 'SM0001',
  channel: 'sms',
  direction: 'outbound',
  status: 'queued',
  to_number: NUMBER,
  from_number: '+18765550100',
  messaging_service_sid: 'MG0000000000000000000000000000000',
  content_sid: null,
  template_key: 'sms.test',
  body_preview: 'Template: sms.test',
  body_hash: 'a'.repeat(64),
  user_id: null,
  organization_id: null,
  app_id: 'app_4qR8',
  client_reference: null,
  idempotency_key: 'idem-1',
  provider_error_code: null,
  sent_at: NOW,
  delivered_at: null,
  read_at: null,
  failed_at: null,
  created_at: NOW,
  updated_at: NOW,
}

const SERIALIZED_CALL = {
  object: 'communication_call',
  id: 'cal_3nP9',
  provider: 'twilio',
  provider_sid: 'CA0001',
  direction: 'outbound',
  status: 'queued',
  to_number: NUMBER,
  from_number: '+18765550100',
  template_key: 'voice.test',
  user_id: null,
  organization_id: null,
  app_id: 'app_4qR8',
  client_reference: null,
  idempotency_key: 'idem-1',
  duration_seconds: null,
  provider_error_code: null,
  started_at: NOW,
  answered_at: null,
  completed_at: null,
  created_at: NOW,
  updated_at: NOW,
}

const MESSAGE_BODY = {
  toNumber: NUMBER,
  channel: 'sms',
  templateKey: 'sms.test',
  idempotencyKey: 'idem-1',
  appId: 'app_4qR8',
}

const CALL_BODY = {
  toNumber: NUMBER,
  templateKey: 'voice.test',
  idempotencyKey: 'idem-1',
  appId: 'app_4qR8',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  withTwilio()

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})

  communicationMessage.findUnique.mockResolvedValue(null)
  communicationMessage.findMany.mockResolvedValue([messageRow()])
  communicationMessage.create.mockResolvedValue(messageRow())
  communicationMessage.update.mockResolvedValue(messageRow())
  communicationMessage.count.mockResolvedValue(1)

  communicationCall.findUnique.mockResolvedValue(null)
  communicationCall.findMany.mockResolvedValue([callRow()])
  communicationCall.create.mockResolvedValue(callRow())
  communicationCall.update.mockResolvedValue(callRow())
  communicationCall.count.mockResolvedValue(1)

  communicationPhoneLookup.findUnique.mockResolvedValue(null)
  communicationPhoneLookup.upsert.mockResolvedValue(lookupRow())

  messagingProvider.createMessage.mockResolvedValue({
    provider: 'twilio',
    providerSid: 'SM0001',
    status: 'queued',
    toNumber: NUMBER,
    fromNumber: '+18765550100',
  })
  voiceProvider.createCall.mockResolvedValue({
    provider: 'twilio',
    providerSid: 'CA0001',
    status: 'initiated',
    toNumber: NUMBER,
    fromNumber: '+18765550100',
  })
  lookupProvider.createLookup.mockResolvedValue({
    provider: 'twilio',
    number: NUMBER,
    nationalFormat: '(876) 555-0142',
    countryCode: 'JM',
    valid: true,
    carrierName: 'Digicel',
    lineType: null,
    mobileCountryCode: null,
    mobileNetworkCode: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('POST /communications/phone-lookups', () => {
  it('fetches and caches a number the platform has not seen', async () => {
    const response = await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'phone_lookup',
        valid: true,
        e164: NUMBER,
        national_format: '(876) 555-0142',
        country_code: 'JM',
        carrier_name: 'Digicel',
        line_type: null,
        mobile_country_code: null,
        mobile_network_code: null,
        line_type_requested: false,
        created_at: NOW,
      },
      error: null,
    })
    expect(lookupProvider.createLookup).toHaveBeenCalledTimes(1)
  })

  it('serves a fresh cached row without billing the provider', async () => {
    // Lookup is billed per query, so the cache is a cost control.
    communicationPhoneLookup.findUnique.mockResolvedValue(lookupRow())

    const response = await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER })

    expect(response.status).toBe(200)
    expect(lookupProvider.createLookup).not.toHaveBeenCalled()
    expect(communicationPhoneLookup.upsert).not.toHaveBeenCalled()
  })

  it('refetches when the cached row has aged past the TTL', async () => {
    communicationPhoneLookup.findUnique.mockResolvedValue(
      lookupRow({
        createdAt: BigInt(NOW - BASE_SETTINGS.twilio.lookupCacheTtlSeconds - 1),
      })
    )

    await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER })

    expect(lookupProvider.createLookup).toHaveBeenCalledTimes(1)
  })

  it('does not satisfy a line-type request from a row that lacks it', async () => {
    withTwilio({ lookupLineTypeEnabled: true })
    communicationPhoneLookup.findUnique.mockResolvedValue(
      lookupRow({ lineTypeRequested: false })
    )

    await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER, includeLineType: true })

    expect(lookupProvider.createLookup).toHaveBeenCalledWith({
      number: NUMBER,
      includeLineType: true,
    })
  })

  it('does not request the paid line-type package on the caller say-so alone', async () => {
    // The package is billed separately; asking for it is never sufficient.
    withTwilio({ lookupLineTypeEnabled: false })

    await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER, includeLineType: true })

    expect(lookupProvider.createLookup).toHaveBeenCalledWith({
      number: NUMBER,
      includeLineType: false,
    })
  })

  it('refuses when lookup is disabled', async () => {
    withTwilio({ lookupEnabled: false })

    const response = await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: NUMBER })

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('communications/not-configured')
    expect(lookupProvider.createLookup).not.toHaveBeenCalled()
  })

  it('rejects a number that is not E.164', async () => {
    // The shape check is the phone primitive's, not Zod's, so this is the
    // platform's 400 rather than a 422 validation failure.
    const response = await request(createApp())
      .post('/communications/phone-lookups')
      .set(AUTH)
      .send({ number: '8765550142' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-phone-number')
    expect(lookupProvider.createLookup).not.toHaveBeenCalled()
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/communications/phone-lookups')
      .set(KEY_ONLY)
      .send({ number: NUMBER })

    expect(response.status).toBe(401)
  })
})

describe('POST /communications/messages', () => {
  it('records the intent, sends, then stamps the provider result', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_MESSAGE, error: null })

    // The row is written before the provider is called, so an uncertain timeout
    // leaves an idempotency key behind for the retry to find.
    expect(communicationMessage.create).toHaveBeenCalledTimes(1)
    expect(messagingProvider.createMessage).toHaveBeenCalledTimes(1)
    expect(communicationMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerSid: 'SM0001',
          status: 'queued',
          sentAt: BigInt(NOW),
        }),
      })
    )
  })

  it('never lets the caller supply message content', async () => {
    // The body reaching Twilio comes from the server template, not the request.
    await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    expect(messagingProvider.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ body: '876 test notification' })
    )
  })

  it('stores a template label rather than the message text', async () => {
    await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    const data = communicationMessage.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.bodyPreview).toBe('Template: sms.test')
    // No column carries the rendered text. Checked field by field rather than
    // by stringifying the row, which throws on the BigInt timestamps.
    expect(Object.values(data)).not.toContain('876 test notification')
  })

  it('returns the existing message for a repeated idempotency key', async () => {
    communicationMessage.findUnique.mockResolvedValue(messageRow())

    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_MESSAGE, error: null })
    expect(communicationMessage.create).not.toHaveBeenCalled()
    expect(messagingProvider.createMessage).not.toHaveBeenCalled()
  })

  it('scopes idempotency by app, then organization, then user, then platform', async () => {
    await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, appId: null, organizationId: 'org_1' })

    expect(communicationMessage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idempotencyScope_idempotencyKey: {
            idempotencyScope: 'org_1',
            idempotencyKey: 'idem-1',
          },
        },
      })
    )
  })

  it('falls back to a literal platform scope when nothing is attributed', async () => {
    // A null scope would not constrain: Postgres treats each NULL in a unique
    // index as distinct, so an unattributed send would have no idempotency.
    await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, appId: null })

    expect(communicationMessage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idempotencyScope_idempotencyKey: {
            idempotencyScope: 'platform',
            idempotencyKey: 'idem-1',
          },
        },
      })
    )
  })

  it('marks the row failed when the provider rejects the send', async () => {
    messagingProvider.createMessage.mockRejectedValue(new Error('twilio down'))

    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    expect(response.status).toBe(500)
    expect(communicationMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          failedAt: BigInt(NOW),
        }),
      })
    )
  })

  it('refuses an unknown template', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, templateKey: 'sms.marketing' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
    expect(communicationMessage.create).not.toHaveBeenCalled()
  })

  it('refuses a template belonging to the other channel', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, channel: 'whatsapp', templateKey: 'sms.test' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
  })

  it('refuses a disabled channel, after the idempotency check', async () => {
    withTwilio({ smsEnabled: false })

    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send(MESSAGE_BODY)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('communications/channel-disabled')
    expect(communicationMessage.create).not.toHaveBeenCalled()
  })

  it('refuses WhatsApp when no approved content SID is configured', async () => {
    // A content SID is issued per Twilio account once a template is approved,
    // so it cannot be a literal — without it there is nothing valid to send.
    withTwilio({ whatsappContentSid: '' })

    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({
        ...MESSAGE_BODY,
        channel: 'whatsapp',
        templateKey: 'whatsapp.test',
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
  })

  it('rejects an unknown field', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, body: 'inject me' })

    expect(response.status).toBe(422)
    expect(communicationMessage.create).not.toHaveBeenCalled()
  })

  it('rejects an unsupported channel', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(AUTH)
      .send({ ...MESSAGE_BODY, channel: 'telegram' })

    expect(response.status).toBe(422)
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/communications/messages')
      .set(KEY_ONLY)
      .send(MESSAGE_BODY)

    expect(response.status).toBe(401)
    expect(messagingProvider.createMessage).not.toHaveBeenCalled()
  })
})

describe('GET /communications/messages', () => {
  it('returns a page with a total count', async () => {
    const response = await request(createApp())
      .get('/communications/messages')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_MESSAGE],
        has_more: false,
        url: '/communications/messages',
        total_count: 1,
      },
      error: null,
    })
  })

  it('threads the status filter into both the page and the count', async () => {
    await request(createApp())
      .get('/communications/messages?status=failed')
      .set(AUTH)

    expect(communicationMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'failed' } })
    )
    expect(communicationMessage.count).toHaveBeenCalledWith({
      where: { status: 'failed' },
    })
  })

  it('returns an empty page for an unknown cursor', async () => {
    communicationMessage.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/communications/messages?starting_after=msg_gone')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(response.body.data.has_more).toBe(false)
  })

  it('rejects a limit above the maximum', async () => {
    const response = await request(createApp())
      .get('/communications/messages?limit=500')
      .set(AUTH)

    expect(response.status).toBe(422)
  })
})

describe('GET /communications/messages/:message_id', () => {
  it('returns the message', async () => {
    communicationMessage.findUnique.mockResolvedValue(messageRow())

    const response = await request(createApp())
      .get('/communications/messages/msg_7hK2')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_MESSAGE, error: null })
  })

  it('404s an unknown message', async () => {
    const response = await request(createApp())
      .get('/communications/messages/msg_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/not-found')
  })

  it('reports a null template key when the preview is not a template label', async () => {
    communicationMessage.findUnique.mockResolvedValue(
      messageRow({ bodyPreview: 'something else' })
    )

    const response = await request(createApp())
      .get('/communications/messages/msg_7hK2')
      .set(AUTH)

    expect(response.body.data.template_key).toBeNull()
  })
})

describe('POST /communications/calls', () => {
  it('records the intent, places the call, then stamps the result', async () => {
    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED_CALL, error: null })
    expect(communicationCall.create).toHaveBeenCalledTimes(1)
    expect(communicationCall.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerSid: 'CA0001',
          startedAt: BigInt(NOW),
        }),
      })
    )
  })

  it('signs the TwiML URL so it cannot be edited into another template', async () => {
    await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    const { twimlUrl } = voiceProvider.createCall.mock.calls[0]?.[0] as {
      twimlUrl: string
    }
    const url = new URL(twimlUrl)
    expect(url.origin + url.pathname).toBe(
      'https://api.876.test/webhooks/twilio/voice'
    )
    expect(url.searchParams.get('template_key')).toBe('voice.test')
    expect(url.searchParams.get('signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('never lets the caller supply TwiML or a URL', async () => {
    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send({ ...CALL_BODY, twimlUrl: 'https://evil.test/twiml' })

    expect(response.status).toBe(422)
    expect(voiceProvider.createCall).not.toHaveBeenCalled()
  })

  it('returns the existing call for a repeated idempotency key', async () => {
    communicationCall.findUnique.mockResolvedValue(callRow())

    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(201)
    expect(communicationCall.create).not.toHaveBeenCalled()
    expect(voiceProvider.createCall).not.toHaveBeenCalled()
  })

  it('marks the row failed when the provider rejects the call', async () => {
    voiceProvider.createCall.mockRejectedValue(new Error('twilio down'))

    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(500)
    expect(communicationCall.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          completedAt: BigInt(NOW),
        }),
      })
    )
  })

  it('refuses an unknown voice template', async () => {
    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send({ ...CALL_BODY, templateKey: 'voice.custom' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('communications/invalid-template')
  })

  it('refuses when voice is disabled', async () => {
    withTwilio({ voiceEnabled: false })

    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('communications/channel-disabled')
  })

  it('refuses when the public webhook configuration is missing', async () => {
    // Without a reachable, signable TwiML URL the call would either fail at
    // Twilio or be placed against a URL anyone could forge.
    withTwilio({ webhookBaseUrl: '' })

    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('communications/not-configured')
    expect(communicationCall.create).not.toHaveBeenCalled()
  })

  it('refuses when the auth token that signs the URL is missing', async () => {
    withTwilio({ authToken: '' })

    const response = await request(createApp())
      .post('/communications/calls')
      .set(AUTH)
      .send(CALL_BODY)

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('communications/not-configured')
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .post('/communications/calls')
      .set(KEY_ONLY)
      .send(CALL_BODY)

    expect(response.status).toBe(401)
    expect(voiceProvider.createCall).not.toHaveBeenCalled()
  })
})

describe('GET /communications/calls', () => {
  it('returns a page with a total count', async () => {
    const response = await request(createApp())
      .get('/communications/calls')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED_CALL],
        has_more: false,
        url: '/communications/calls',
        total_count: 1,
      },
      error: null,
    })
  })

  it('threads the status filter into both the page and the count', async () => {
    await request(createApp())
      .get('/communications/calls?status=completed')
      .set(AUTH)

    expect(communicationCall.count).toHaveBeenCalledWith({
      where: { status: 'completed' },
    })
  })
})

describe('GET /communications/calls/:call_id', () => {
  it('returns the call', async () => {
    communicationCall.findUnique.mockResolvedValue(callRow())

    const response = await request(createApp())
      .get('/communications/calls/cal_3nP9')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED_CALL, error: null })
  })

  it('404s an unknown call', async () => {
    const response = await request(createApp())
      .get('/communications/calls/cal_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('communications/not-found')
  })

  it('is not matched by the list route', async () => {
    await request(createApp()).get('/communications/calls/cal_3nP9').set(AUTH)

    expect(communicationCall.findMany).not.toHaveBeenCalled()
  })
})
