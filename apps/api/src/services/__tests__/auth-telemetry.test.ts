import type { Request } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AuthTelemetryService,
  decodeDeviceSignal,
  type AuthTelemetryRepository,
} from '../auth-telemetry'

const TRUSTED_HEADERS: Record<string, string> = {
  'x-876-client-ip': '203.0.113.42',
  'x-876-client-ua':
    'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'x-876-geo-country': 'JM',
  'x-876-geo-region': 'Kingston',
  'x-876-geo-city': 'Kingston',
  'x-876-geo-asn': 'AS12345',
  'x-876-geo-as-org': 'Flow Jamaica',
  'x-876-realm': 'consumer',
}

function encodeSignal(overrides: Record<string, unknown> = {}): string {
  const payload = {
    version: 1,
    visitorId: 'a'.repeat(32),
    confidence: 'high',
    hints: { platformVersion: '15.0.0', model: 'SM-S928B' },
    components: { canvas: 'deadbeef' },
    ...overrides,
  }
  const raw = Buffer.from(JSON.stringify(payload), 'utf-8')
  return raw.toString('base64url')
}

function makeRequest(
  headers: Record<string, string> = {},
  options: { apiKey?: boolean } = { apiKey: true }
): Request {
  const resolved = { ...TRUSTED_HEADERS, ...headers }
  const reqHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(resolved)) {
    reqHeaders[k.toLowerCase()] = v
  }

  const req = {
    headers: reqHeaders,
    header(name: string) {
      return reqHeaders[name.toLowerCase()]
    },
    ip: '10.0.0.1',
    socket: { remoteAddress: '10.0.0.1' },
    client: { host: '10.0.0.1' },
    state: options.apiKey
      ? { app_id: 'app_1', api_key: { id: 'key_1', appId: 'app_1' } }
      : { app_id: 'app_1' },
  } as unknown as Request

  return req
}

function makeMockRepository(): AuthTelemetryRepository {
  return {
    recordDeviceSeen: vi.fn().mockResolvedValue({ id: 'dev_1' }),
    countRecentFailures: vi.fn().mockResolvedValue(0),
    listDevicesByFingerprint: vi.fn().mockResolvedValue([]),
    getLastAttemptForUser: vi.fn().mockResolvedValue(null),
    createAttempt: vi.fn().mockResolvedValue({ id: 'atmp_1' }),
  }
}

describe('decodeDeviceSignal', () => {
  it('decodes a valid base64url signal', () => {
    const encoded = encodeSignal()
    const result = decodeDeviceSignal(encoded)

    expect(result).toEqual({
      visitorId: 'a'.repeat(32),
      confidence: 'high',
      hints: { platformVersion: '15.0.0', model: 'SM-S928B' },
      components: { canvas: 'deadbeef' },
    })
  })

  it('returns null for null, undefined, or oversized signals', () => {
    expect(decodeDeviceSignal(null)).toBeNull()
    expect(decodeDeviceSignal(undefined)).toBeNull()
    expect(decodeDeviceSignal('A'.repeat(9000))).toBeNull()
  })

  it('returns null for invalid base64 or json', () => {
    expect(decodeDeviceSignal('not-base64!!')).toBeNull()
    const badJson = Buffer.from('{bad json', 'utf-8').toString('base64url')
    expect(decodeDeviceSignal(badJson)).toBeNull()
  })

  it('returns null if visitorId is missing or empty', () => {
    const noVisitor = Buffer.from(
      JSON.stringify({ confidence: 'high' }),
      'utf-8'
    ).toString('base64url')
    expect(decodeDeviceSignal(noVisitor)).toBeNull()

    const emptyVisitor = Buffer.from(
      JSON.stringify({ visitorId: '' }),
      'utf-8'
    ).toString('base64url')
    expect(decodeDeviceSignal(emptyVisitor)).toBeNull()
  })
})

describe('AuthTelemetryService.record', () => {
  let mockRepo: AuthTelemetryRepository
  let service: AuthTelemetryService

  beforeEach(() => {
    mockRepo = makeMockRepository()
    service = new AuthTelemetryService(mockRepo)
  })

  it('records geo and parsed device details for a trusted request', async () => {
    const request = makeRequest({ 'x-876-device': encodeSignal() })

    const result = await service.record({
      request,
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result.id).toBe('atmp_1')
    expect(mockRepo.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'login',
        outcome: 'succeeded',
        userId: 'usr_1',
        ipAddress: '203.0.113.42',
        ipCountryCode: 'JM',
        ipCity: 'Kingston',
        ipAsOrganization: 'Flow Jamaica',
        contextTrusted: true,
        realm: 'consumer',
        deviceBrand: 'Samsung',
        deviceModel: 'SM-S928B',
        osName: 'Android',
        osVersion: '15.0.0',
        isBot: false,
      })
    )
  })

  it('returns context for the session row', async () => {
    const result = await service.record({
      request: makeRequest(),
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result.context).toEqual({
      ip: '203.0.113.42',
      userAgent: TRUSTED_HEADERS['x-876-client-ua'],
      countryCode: 'JM',
      region: 'Kingston',
      city: 'Kingston',
      asn: 'AS12345',
      asOrganization: 'Flow Jamaica',
    })
  })

  it('upserts a device when user and signal are both known', async () => {
    const request = makeRequest({ 'x-876-device': encodeSignal() })

    const result = await service.record({
      request,
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result.deviceId).toBe('dev_1')
    expect(mockRepo.recordDeviceSeen).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        fingerprint: 'a'.repeat(32),
        lastCountryCode: 'JM',
        signal: {
          visitorId: 'a'.repeat(32),
          confidence: 'high',
          hints: { platformVersion: '15.0.0', model: 'SM-S928B' },
        },
      })
    )
    const callArgs = (
      mockRepo.recordDeviceSeen as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0]?.[0]
    expect(callArgs.signal).not.toHaveProperty('components')
  })

  it('does not upsert a device without a resolved user', async () => {
    const request = makeRequest({ 'x-876-device': encodeSignal() })

    const result = await service.record({
      request,
      event: 'login',
      outcome: 'failed',
      identifier: 'a@example.com',
    })

    expect(mockRepo.recordDeviceSeen).not.toHaveBeenCalled()
    expect(result.deviceId).toBeNull()
    expect(mockRepo.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceFingerprint: 'a'.repeat(32),
      })
    )
  })

  it('lowercases the identifier when provided', async () => {
    await service.record({
      request: makeRequest(),
      event: 'login',
      outcome: 'failed',
      identifier: 'Alejandra@Example.COM',
    })

    expect(mockRepo.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'alejandra@example.com',
      })
    )
  })

  it('ignores spoofed headers when API key is missing', async () => {
    const request = makeRequest({}, { apiKey: false })

    await service.record({
      request,
      event: 'login',
      outcome: 'failed',
      identifier: 'a@example.com',
    })

    expect(mockRepo.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        contextTrusted: false,
        ipAddress: '10.0.0.1',
        ipCountryCode: null,
      })
    )
  })

  it('swallows repository creation failures and returns null record', async () => {
    mockRepo.createAttempt = vi
      .fn()
      .mockRejectedValue(new Error('database error'))

    const result = await service.record({
      request: makeRequest(),
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result).toEqual({ id: null, deviceId: null, context: null })
  })

  it('swallows device upsert failures and returns null record', async () => {
    const request = makeRequest({ 'x-876-device': encodeSignal() })
    mockRepo.recordDeviceSeen = vi
      .fn()
      .mockRejectedValue(new Error('device error'))

    const result = await service.record({
      request,
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result).toEqual({ id: null, deviceId: null, context: null })
  })

  it('handles risk calculation lookups failing gracefully', async () => {
    mockRepo.countRecentFailures = vi
      .fn()
      .mockRejectedValue(new Error('count error'))
    mockRepo.listDevicesByFingerprint = vi
      .fn()
      .mockRejectedValue(new Error('device lookup error'))
    mockRepo.getLastAttemptForUser = vi
      .fn()
      .mockRejectedValue(new Error('history error'))

    const request = makeRequest({ 'x-876-device': encodeSignal() })

    const result = await service.record({
      request,
      event: 'login',
      outcome: 'succeeded',
      userId: 'usr_1',
    })

    expect(result.id).toBe('atmp_1')
    expect(mockRepo.createAttempt).toHaveBeenCalled()
  })
})
