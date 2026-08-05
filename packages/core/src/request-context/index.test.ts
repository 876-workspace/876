import { describe, expect, it } from 'vitest'

import {
  extractRequestContext,
  requestContextHeaders,
  REQUEST_CONTEXT_HEADERS,
} from './index'

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://app.876.app/api/auth/login', {
    method: 'POST',
    headers,
  })
}

describe('extractRequestContext', () => {
  describe('ip precedence', () => {
    it('prefers cf-connecting-ip over every other source', () => {
      const ctx = extractRequestContext(
        requestWith({
          'cf-connecting-ip': '203.0.113.5',
          'true-client-ip': '198.51.100.7',
          'x-forwarded-for': '192.0.2.9',
          'x-real-ip': '192.0.2.10',
        })
      )

      expect(ctx.ip).toBe('203.0.113.5')
    })

    it('falls back to true-client-ip when cloudflare did not set its header', () => {
      const ctx = extractRequestContext(
        requestWith({
          'true-client-ip': '198.51.100.7',
          'x-forwarded-for': '192.0.2.9',
        })
      )

      expect(ctx.ip).toBe('198.51.100.7')
    })

    it('takes the first hop of a multi-hop x-forwarded-for chain', () => {
      const ctx = extractRequestContext(
        requestWith({
          'x-forwarded-for': '192.0.2.9, 70.41.3.18, 150.172.238.178',
        })
      )

      expect(ctx.ip).toBe('192.0.2.9')
    })

    it('trims whitespace around the first x-forwarded-for hop', () => {
      const ctx = extractRequestContext(
        requestWith({ 'x-forwarded-for': '   192.0.2.9   ,  70.41.3.18' })
      )

      expect(ctx.ip).toBe('192.0.2.9')
    })

    it('falls back to x-real-ip when no other source is present', () => {
      const ctx = extractRequestContext(
        requestWith({ 'x-real-ip': '192.0.2.10' })
      )

      expect(ctx.ip).toBe('192.0.2.10')
    })

    it('returns null when the request carries no ip header at all', () => {
      const ctx = extractRequestContext(requestWith({}))

      expect(ctx.ip).toBeNull()
    })
  })

  describe('geo', () => {
    it('reads every cloudflare geo header', () => {
      const ctx = extractRequestContext(
        requestWith({
          'cf-ipcountry': 'jm',
          'cf-region-code': '14',
          'cf-region': 'Kingston',
          'cf-ipcity': 'Kingston',
          'cf-postal-code': 'JMAKN05',
          'cf-timezone': 'America/Jamaica',
          'cf-iplatitude': '17.99702',
          'cf-iplongitude': '-76.79358',
          'cf-asn': '30689',
          'cf-as-organization': 'Flow Jamaica',
        })
      )

      expect(ctx.geo).toEqual({
        countryCode: 'JM',
        regionCode: '14',
        region: 'Kingston',
        city: 'Kingston',
        postalCode: 'JMAKN05',
        timezone: 'America/Jamaica',
        latitude: '17.99702',
        longitude: '-76.79358',
        asn: '30689',
        asOrganization: 'Flow Jamaica',
      })
    })

    it('keeps latitude and longitude as strings so precision is never lost', () => {
      const ctx = extractRequestContext(
        requestWith({
          'cf-iplatitude': '17.99702000',
          'cf-iplongitude': '-76.79358000',
        })
      )

      expect(ctx.geo.latitude).toBe('17.99702000')
      expect(ctx.geo.longitude).toBe('-76.79358000')
    })

    it('normalizes the XX unknown-country sentinel to null', () => {
      const ctx = extractRequestContext(requestWith({ 'cf-ipcountry': 'XX' }))

      expect(ctx.geo.countryCode).toBeNull()
    })

    it('normalizes the T1 tor-exit sentinel to null', () => {
      const ctx = extractRequestContext(requestWith({ 'cf-ipcountry': 'T1' }))

      expect(ctx.geo.countryCode).toBeNull()
    })

    it('treats an empty geo header as null rather than an empty string', () => {
      const ctx = extractRequestContext(requestWith({ 'cf-ipcity': '' }))

      expect(ctx.geo.city).toBeNull()
    })

    it('accepts cf-ip-asn as an alias when cf-asn is absent', () => {
      const ctx = extractRequestContext(requestWith({ 'cf-ip-asn': '30689' }))

      expect(ctx.geo.asn).toBe('30689')
    })

    it('prefers cf-asn over the cf-ip-asn alias', () => {
      const ctx = extractRequestContext(
        requestWith({ 'cf-asn': '30689', 'cf-ip-asn': '11111' })
      )

      expect(ctx.geo.asn).toBe('30689')
    })

    it('returns an all-null geo when no cloudflare headers are present', () => {
      const ctx = extractRequestContext(requestWith({}))

      expect(ctx.geo).toEqual({
        countryCode: null,
        regionCode: null,
        region: null,
        city: null,
        postalCode: null,
        timezone: null,
        latitude: null,
        longitude: null,
        asn: null,
        asOrganization: null,
      })
    })
  })

  describe('user agent, origin, request id and device signal', () => {
    it('reads the user agent, origin, request id and device signal', () => {
      const ctx = extractRequestContext(
        requestWith({
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          origin: 'https://876.app',
          'x-request-id': 'req_abc123',
          'x-876-device': 'eyJ2aXNpdG9ySWQiOiJhYmMifQ',
        })
      )

      expect(ctx.userAgent).toBe(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      )
      expect(ctx.origin).toBe('https://876.app')
      expect(ctx.requestId).toBe('req_abc123')
      expect(ctx.deviceSignal).toBe('eyJ2aXNpdG9ySWQiOiJhYmMifQ')
    })

    it('returns nulls for the optional fields when the headers are absent', () => {
      const ctx = extractRequestContext(requestWith({}))

      expect(ctx.userAgent).toBeNull()
      expect(ctx.origin).toBeNull()
      expect(ctx.requestId).toBeNull()
      expect(ctx.deviceSignal).toBeNull()
    })
  })

  describe('sanitization', () => {
    it('strips CR and LF so a forwarded value cannot inject a second header', () => {
      // `Headers` refuses to hold a CRLF value at all, so the only way a raw one
      // reaches us is from a runtime whose header store is looser than the
      // WHATWG one — which is exactly the case the stripping defends against.
      const raw = {
        'x-real-ip': '192.0.2.10\r\nx-internal-key: leaked',
      } as Record<string, string>
      const ctx = extractRequestContext({
        headers: { get: (name: string) => raw[name.toLowerCase()] ?? null },
      } as unknown as Request)

      expect(ctx.ip).toBe('192.0.2.10x-internal-key: leaked')
      expect(ctx.ip).not.toContain('\r')
      expect(ctx.ip).not.toContain('\n')
    })

    it('caps an ordinary header at 512 characters', () => {
      const ctx = extractRequestContext(
        requestWith({ 'user-agent': 'a'.repeat(2000) })
      )

      expect(ctx.userAgent).toHaveLength(512)
    })

    it('caps the device signal at 8192 characters', () => {
      const ctx = extractRequestContext(
        requestWith({ 'x-876-device': 'a'.repeat(20_000) })
      )

      expect(ctx.deviceSignal).toHaveLength(8192)
    })

    it('trims surrounding whitespace', () => {
      const ctx = extractRequestContext(
        requestWith({ 'x-real-ip': '  192.0.2.10  ' })
      )

      expect(ctx.ip).toBe('192.0.2.10')
    })

    it('treats a whitespace-only header as null', () => {
      const ctx = extractRequestContext(requestWith({ 'user-agent': '   ' }))

      expect(ctx.userAgent).toBeNull()
    })
  })
})

describe('requestContextHeaders', () => {
  it('serializes every populated field to its canonical x-876 header', () => {
    const ctx = extractRequestContext(
      requestWith({
        'cf-connecting-ip': '203.0.113.5',
        'cf-ipcountry': 'JM',
        'cf-region-code': '14',
        'cf-region': 'Kingston',
        'cf-ipcity': 'Kingston',
        'cf-postal-code': 'JMAKN05',
        'cf-timezone': 'America/Jamaica',
        'cf-iplatitude': '17.99702',
        'cf-iplongitude': '-76.79358',
        'cf-asn': '30689',
        'cf-as-organization': 'Flow Jamaica',
        'user-agent': 'Mozilla/5.0',
        'x-876-device': 'signal-blob',
      })
    )

    expect(requestContextHeaders(ctx)).toEqual({
      'x-876-client-ip': '203.0.113.5',
      'x-876-geo-country': 'JM',
      'x-876-geo-region-code': '14',
      'x-876-geo-region': 'Kingston',
      'x-876-geo-city': 'Kingston',
      'x-876-geo-postal': 'JMAKN05',
      'x-876-geo-timezone': 'America/Jamaica',
      'x-876-geo-latitude': '17.99702',
      'x-876-geo-longitude': '-76.79358',
      'x-876-geo-asn': '30689',
      'x-876-geo-as-org': 'Flow Jamaica',
      'x-876-client-ua': 'Mozilla/5.0',
      'x-876-device': 'signal-blob',
    })
  })

  it('omits every null field rather than sending an empty value', () => {
    const ctx = extractRequestContext(
      requestWith({ 'cf-connecting-ip': '203.0.113.5' })
    )

    expect(requestContextHeaders(ctx)).toEqual({
      'x-876-client-ip': '203.0.113.5',
    })
  })

  it('returns an empty object for a request with no context at all', () => {
    expect(
      requestContextHeaders(extractRequestContext(requestWith({})))
    ).toEqual({})
  })

  it('does not forward origin or request id — they are not context headers', () => {
    const ctx = extractRequestContext(
      requestWith({ origin: 'https://876.app', 'x-request-id': 'req_abc123' })
    )

    expect(requestContextHeaders(ctx)).toEqual({})
  })

  it('produces header names that survive as valid Headers keys', () => {
    const ctx = extractRequestContext(
      requestWith({
        'cf-connecting-ip': '203.0.113.5',
        'user-agent': 'Mozilla/5.0',
      })
    )

    const headers = new Headers(requestContextHeaders(ctx))

    expect(headers.get(REQUEST_CONTEXT_HEADERS.ip)).toBe('203.0.113.5')
    expect(headers.get(REQUEST_CONTEXT_HEADERS.userAgent)).toBe('Mozilla/5.0')
  })
})
