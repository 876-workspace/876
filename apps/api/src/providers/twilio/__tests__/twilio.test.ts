import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSettings, type Settings } from '@/config'
import { AppHttpError } from '@/platform/errors'

import {
  TwilioMessagingProvider,
  TwilioPhoneVerificationProvider,
} from '../adapter'
import { TwilioClient } from '../client'
import {
  maskPhoneNumber,
  normalizeTwilioError,
  providerUnavailable,
} from '../errors'
import { FakeTwilioProvider } from '../fake'
import {
  DisabledTwilioProvider,
  clearSharedClients,
  getMessagingProvider,
  getPhoneLookupProvider,
  getPhoneVerificationProvider,
  getVoiceProvider,
  getWebhookVerifier,
} from '../index'
import {
  callCreateForm,
  messageCreateForm,
  parseTwilioVerification,
  twilioErrorDetails,
} from '../types'

/** Settings with every Twilio channel fully credentialed and live. */
function liveSettings(overrides: Partial<Settings['twilio']> = {}): Settings {
  const base = getSettings()
  return {
    ...base,
    twilio: {
      ...base.twilio,
      mode: 'live',
      accountSid: 'AC00000000000000000000000000000001',
      apiKey: 'SK00000000000000000000000000000001',
      apiKeySecret: 'secret-value',
      authToken: 'auth-token-value',
      verifyServiceSid: 'VA00000000000000000000000000000001',
      messagingServiceSid: 'MG00000000000000000000000000000001',
      voiceFromNumber: '+18765550100',
      webhookBaseUrl: 'https://api.876.app/webhooks',
      lookupEnabled: true,
      verifyLive: true,
      messagingLive: true,
      voiceLive: true,
      lookupLive: true,
      ...overrides,
    },
  } as Settings
}

describe('maskPhoneNumber', () => {
  it.each([
    ['+18765550123', '+***0123'],
    ['(876) 555-0123', '+***0123'],
    ['1234', '****'],
    ['12', '****'],
    ['abc', '****'],
  ])('masks %s to %s', (input, expected) => {
    expect(maskPhoneNumber(input)).toBe(expected)
  })

  it.each([null, undefined, ''])('returns null for %s', (input) => {
    expect(maskPhoneNumber(input)).toBeNull()
  })

  it('never leaks more than the last four digits', () => {
    expect(maskPhoneNumber('+18765550123')).not.toContain('876555')
  })
})

describe('twilioErrorDetails', () => {
  it('extracts the code, resource reference, and message', () => {
    expect(
      twilioErrorDetails({
        code: 60200,
        more_info: 'https://twilio/60200',
        message: 'Invalid',
      })
    ).toEqual(['60200', 'https://twilio/60200', 'Invalid'])
  })

  it('falls back to sid when more_info is absent', () => {
    expect(twilioErrorDetails({ code: '1', sid: 'SM1' })).toEqual([
      '1',
      'SM1',
      null,
    ])
  })

  it.each([null, undefined, 'a string', 42, ['a']])(
    'returns empty details for the non-object payload %s',
    (payload) => {
      expect(twilioErrorDetails(payload)).toEqual(['', null, null])
    }
  )
})

describe('normalizeTwilioError', () => {
  it.each([
    ['20429', 'communications/rate-limited', 429],
    ['60200', 'communications/verification-failed', 400],
    ['60202', 'communications/max-attempts-reached', 429],
    ['60203', 'communications/rate-limited', 429],
    ['60205', 'communications/verification-expired', 400],
    ['60212', 'communications/invalid-phone-number', 400],
  ])('maps Twilio code %s to %s', (twilioCode, code, httpStatus) => {
    const error = normalizeTwilioError({
      status: 400,
      body: { code: twilioCode },
    })

    expect(error).toBeInstanceOf(AppHttpError)
    expect(error.code).toBe(code)
    expect(error.httpStatus).toBe(httpStatus)
  })

  it.each([
    [
      404,
      'communications/verification-failed',
      400,
      'The verification was not found.',
    ],
    [429, 'communications/rate-limited', 429, 'Please wait and try again.'],
    [
      500,
      'communications/provider-unavailable',
      503,
      'The communications provider is temporarily unavailable.',
    ],
  ])('falls back on HTTP %s to %s', (status, code, httpStatus, message) => {
    const error = normalizeTwilioError({ status, body: {} })

    expect(error.code).toBe(code)
    expect(error.httpStatus).toBe(httpStatus)
    expect(error.message).toBe(message)
  })

  it('never puts the upstream message in the client-facing error', () => {
    // Twilio validation messages echo request parameters, including the full
    // destination number.
    const error = normalizeTwilioError({
      status: 400,
      body: {
        code: '60212',
        message: "The 'To' number +18765550123 is not valid.",
      },
    })

    expect(error.message).toBe('Enter a valid phone number.')
    expect(JSON.stringify(error.toClientError())).not.toContain('18765550123')
  })

  it('omits the server-only HTTP status from the client body', () => {
    const error = normalizeTwilioError({ status: 400, body: { code: '60205' } })

    expect(error.toClientError()).toEqual({
      code: 'communications/verification-expired',
      message: 'The verification has expired.',
    })
  })
})

describe('providerUnavailable', () => {
  it('maps any transport failure to a 503 with a fixed message', () => {
    const error = providerUnavailable(new TypeError('fetch failed'))

    expect(error.code).toBe('communications/provider-unavailable')
    expect(error.httpStatus).toBe(503)
    expect(error.message).toBe(
      'The communications provider is temporarily unavailable.'
    )
  })

  it('never leaks the underlying error text', () => {
    const error = providerUnavailable(
      new Error('connect ECONNREFUSED 10.0.0.5:443')
    )

    expect(JSON.stringify(error.toClientError())).not.toContain('10.0.0.5')
  })
})

describe('request form builders', () => {
  it('omits the optional message fields that are null', () => {
    const form = messageCreateForm({
      toNumber: '+18765550123',
      messagingServiceSid: 'MG1',
      body: null,
      contentSid: null,
      statusCallback: null,
    })

    expect([...form.entries()]).toEqual([
      ['To', '+18765550123'],
      ['MessagingServiceSid', 'MG1'],
    ])
  })

  it('includes the optional message fields that are present', () => {
    const form = messageCreateForm({
      toNumber: '+18765550123',
      messagingServiceSid: 'MG1',
      body: 'hello',
      contentSid: 'HX1',
      statusCallback: 'https://api.876.app/webhooks/twilio/status',
    })

    expect(form.get('Body')).toBe('hello')
    expect(form.get('ContentSid')).toBe('HX1')
    expect(form.get('StatusCallback')).toBe(
      'https://api.876.app/webhooks/twilio/status'
    )
  })

  it('requests the progress callbacks only when a status callback is given', () => {
    const withCallback = callCreateForm({
      toNumber: '+18765550123',
      fromNumber: '+18765550100',
      twimlUrl: 'https://api.876.app/twiml',
      statusCallback: 'https://api.876.app/webhooks/twilio/voice',
    })
    const without = callCreateForm({
      toNumber: '+18765550123',
      fromNumber: '+18765550100',
      twimlUrl: 'https://api.876.app/twiml',
      statusCallback: null,
    })

    // Without this field Twilio sends only the completed callback.
    expect(withCallback.get('StatusCallbackEvent')).toBe(
      'initiated ringing answered completed'
    )
    expect(without.get('StatusCallbackEvent')).toBeNull()
  })
})

describe('parseTwilioVerification', () => {
  it('narrows the documented fields and carries unknown keys through', () => {
    expect(
      parseTwilioVerification({
        sid: 'VE1',
        status: 'pending',
        to: '+18765550123',
        channel: 'sms',
        valid: false,
        date_created: '2026-08-07T00:00:00Z',
        lookup: { carrier: {} },
      })
    ).toEqual({
      sid: 'VE1',
      status: 'pending',
      to: '+18765550123',
      channel: 'sms',
      valid: false,
      date_created: '2026-08-07T00:00:00Z',
      lookup: { carrier: {} },
    })
  })

  it('replaces a wrongly typed field rather than passing it through', () => {
    // The narrowing has to survive the extras spread, or a numeric sid reaches
    // a serializer typed as string and fails somewhere far from here.
    const parsed = parseTwilioVerification({
      sid: 12345,
      status: null,
      valid: 'yes',
    })

    expect(parsed.sid).toBe('')
    expect(parsed.status).toBe('')
    expect(parsed.to).toBe('')
    expect(parsed.valid).toBe(false)
  })
})

describe('FakeTwilioProvider', () => {
  const fake = new FakeTwilioProvider()

  it('approves only the magic code', async () => {
    await expect(
      fake.approveVerification({ toNumber: '+18765550123', code: '000000' })
    ).resolves.toMatchObject({ status: 'approved', valid: true })

    await expect(
      fake.approveVerification({ toNumber: '+18765550123', code: '000001' })
    ).resolves.toMatchObject({ status: 'pending', valid: false })
  })

  it('creates a pending verification with a deterministic sid', async () => {
    const first = await fake.createVerification({
      toNumber: '+18765550123',
      channel: 'sms',
    })
    const second = await fake.createVerification({
      toNumber: '+18765550123',
      channel: 'sms',
    })

    expect(first).toEqual(second)
    expect(first.provider).toBe('fake')
    expect(first.status).toBe('pending')
    expect(first.providerSid).toMatch(/^fake_[0-9a-f]{24}$/)
  })

  it('gives different numbers different sids', async () => {
    const a = await fake.createVerification({
      toNumber: '+18765550123',
      channel: 'sms',
    })
    const b = await fake.createVerification({
      toNumber: '+18765550124',
      channel: 'sms',
    })

    expect(a.providerSid).not.toBe(b.providerSid)
  })

  it('makes no network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await fake.createLookup({ number: '+18765550123' })
    await fake.createMessage({
      toNumber: '+18765550123',
      body: 'hi',
      channel: 'sms',
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('DisabledTwilioProvider', () => {
  const disabled = new DisabledTwilioProvider()

  it.each([
    ['createVerification', () => disabled.createVerification()],
    ['approveVerification', () => disabled.approveVerification()],
    ['createLookup', () => disabled.createLookup()],
    ['createMessage', () => disabled.createMessage()],
    ['createCall', () => disabled.createCall()],
  ])('fails %s closed before any request is attempted', (_label, call) => {
    expect(call).toThrow(
      expect.objectContaining({
        code: 'communications/not-configured',
        httpStatus: 503,
      })
    )
  })
})

describe('provider selection', () => {
  beforeEach(() => {
    clearSharedClients()
  })

  it('returns the fake provider in fake mode, whatever the channel flags say', () => {
    const settings = liveSettings({ mode: 'fake' })

    expect(getPhoneVerificationProvider(settings)).toBeInstanceOf(
      FakeTwilioProvider
    )
    expect(getPhoneLookupProvider(settings)).toBeInstanceOf(FakeTwilioProvider)
    expect(getMessagingProvider(settings)).toBeInstanceOf(FakeTwilioProvider)
    expect(getVoiceProvider(settings)).toBeInstanceOf(FakeTwilioProvider)
  })

  it('returns the disabled provider in disabled mode', () => {
    const settings = liveSettings({
      mode: 'disabled',
      verifyLive: false,
      messagingLive: false,
      voiceLive: false,
      lookupLive: false,
    })

    expect(getPhoneVerificationProvider(settings)).toBeInstanceOf(
      DisabledTwilioProvider
    )
    expect(getPhoneLookupProvider(settings)).toBeInstanceOf(
      DisabledTwilioProvider
    )
    expect(getMessagingProvider(settings)).toBeInstanceOf(
      DisabledTwilioProvider
    )
    expect(getVoiceProvider(settings)).toBeInstanceOf(DisabledTwilioProvider)
  })

  it('returns the live provider only when that channel is fully credentialed', () => {
    expect(getPhoneVerificationProvider(liveSettings())).toBeInstanceOf(
      TwilioPhoneVerificationProvider
    )
    expect(getMessagingProvider(liveSettings())).toBeInstanceOf(
      TwilioMessagingProvider
    )
  })

  it.each([
    ['verify', 'verifyLive', getPhoneVerificationProvider],
    ['messaging', 'messagingLive', getMessagingProvider],
    ['voice', 'voiceLive', getVoiceProvider],
    ['lookup', 'lookupLive', getPhoneLookupProvider],
  ] as const)(
    'disables the %s channel when its own resource is unconfigured',
    (_label, flag, factory) => {
      // A mode flip alone must never start billing real traffic.
      expect(factory(liveSettings({ [flag]: false }))).toBeInstanceOf(
        DisabledTwilioProvider
      )
    }
  )

  it('disables lookup when the paid opt-in is off even with credentials', () => {
    expect(
      getPhoneLookupProvider(liveSettings({ lookupEnabled: false }))
    ).toBeInstanceOf(DisabledTwilioProvider)
  })

  it('reuses one client across factories for the same credential pair', () => {
    const settings = liveSettings()
    const first = getPhoneVerificationProvider(settings) as unknown as {
      client: TwilioClient
    }
    const second = getMessagingProvider(settings) as unknown as {
      client: TwilioClient
    }

    expect(first.client).toBe(second.client)
  })

  it('builds a distinct client for a different credential pair', () => {
    const first = getPhoneVerificationProvider(liveSettings()) as unknown as {
      client: TwilioClient
    }
    const second = getPhoneVerificationProvider(
      liveSettings({ apiKey: 'SK00000000000000000000000000000002' })
    ) as unknown as { client: TwilioClient }

    expect(first.client).not.toBe(second.client)
  })
})

describe('getWebhookVerifier', () => {
  it.each([
    ['the auth token', { authToken: '' }],
    ['the public base URL', { webhookBaseUrl: '' }],
  ])(
    'returns null when %s is unset, so every webhook is rejected',
    (_label, overrides) => {
      expect(getWebhookVerifier(liveSettings(overrides))).toBeNull()
    }
  )

  it('returns a verifier when both are configured', () => {
    expect(getWebhookVerifier(liveSettings())).not.toBeNull()
  })
})

describe('TwilioClient', () => {
  const client = new TwilioClient({ apiKey: 'SK1', apiKeySecret: 'secret' })
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('posts a form-encoded verification with basic auth and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        sid: 'VE1',
        status: 'pending',
        to: '+18765550123',
        channel: 'sms',
      })
    )

    const result = await client.createVerification({
      serviceSid: 'VA1',
      toNumber: '+18765550123',
      channel: 'sms',
    })

    expect(result).toMatchObject({ sid: 'VE1', status: 'pending' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://verify.twilio.com/v2/Services/VA1/Verifications')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('To=%2B18765550123&Channel=sms')
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Basic ${Buffer.from('SK1:secret').toString('base64')}`
    )
  })

  it('requests line-type intelligence only when asked', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ phone_number: '+18765550123' }))

    await client.createLookup({ number: '+18765550123' })
    await client.createLookup({ number: '+18765550123', includeLineType: true })

    expect(fetchMock.mock.calls[0]![0]).not.toContain('Fields=')
    expect(fetchMock.mock.calls[1]![0]).toContain(
      'Fields=line_type_intelligence'
    )
  })

  it('normalizes a Twilio error response into a platform error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: 60202, message: 'Max attempts' }, 429)
    )

    await expect(
      client.createVerification({
        serviceSid: 'VA1',
        toNumber: '+1',
        channel: 'sms',
      })
    ).rejects.toMatchObject({
      code: 'communications/max-attempts-reached',
      httpStatus: 429,
    })
  })

  it('normalizes a transport failure into provider-unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(
      client.createVerification({
        serviceSid: 'VA1',
        toNumber: '+1',
        channel: 'sms',
      })
    ).rejects.toMatchObject({
      code: 'communications/provider-unavailable',
      httpStatus: 503,
    })
  })

  it('does not throw on a success response that is not an object', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))

    await expect(
      client.createVerification({
        serviceSid: 'VA1',
        toNumber: '+1',
        channel: 'sms',
      })
    ).resolves.toMatchObject({ sid: '', status: '' })
  })
})
