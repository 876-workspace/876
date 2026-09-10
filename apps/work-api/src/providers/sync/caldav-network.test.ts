import { afterEach, describe, expect, it } from 'vitest'

import {
  isSafeCaldavAddress,
  requireSafeCaldavUrl,
  resolveSafeCaldavTarget,
} from './caldav-network.js'

const originalAllowlist = process.env.WORK_CALDAV_ALLOWED_ORIGINS

afterEach(() => {
  if (originalAllowlist === undefined)
    delete process.env.WORK_CALDAV_ALLOWED_ORIGINS
  else process.env.WORK_CALDAV_ALLOWED_ORIGINS = originalAllowlist
})

describe('CalDAV outbound network policy', () => {
  it('rejects HTTP localhost destinations', () => {
    expect(() => requireSafeCaldavUrl('http://localhost:8080/dav')).toThrow(
      expect.objectContaining({ code: 'provider-invalid-response' })
    )
  })

  it('rejects HTTPS loopback IPv4 destinations', () => {
    expect(() => requireSafeCaldavUrl('https://127.0.0.1/dav')).toThrow(
      expect.objectContaining({ code: 'provider-invalid-response' })
    )
  })

  it('rejects URLs with embedded credentials', () => {
    expect(() =>
      requireSafeCaldavUrl('https://user:password@calendar.example.com/dav')
    ).toThrow(expect.objectContaining({ code: 'provider-invalid-response' }))
  })

  it('rejects private RFC1918 IPv4 addresses', () => {
    expect([
      isSafeCaldavAddress('10.20.30.40'),
      isSafeCaldavAddress('172.16.0.1'),
      isSafeCaldavAddress('192.168.1.5'),
    ]).toEqual([false, false, false])
  })

  it('rejects link-local metadata IPv4 addresses', () => {
    expect(isSafeCaldavAddress('169.254.169.254')).toBe(false)
  })

  it('rejects carrier-grade NAT IPv4 addresses', () => {
    expect(isSafeCaldavAddress('100.64.12.3')).toBe(false)
  })

  it('rejects loopback and unique-local IPv6 addresses', () => {
    expect([
      isSafeCaldavAddress('::1'),
      isSafeCaldavAddress('fc00::1234'),
      isSafeCaldavAddress('fd12:3456:789a::1'),
    ]).toEqual([false, false, false])
  })

  it('rejects link-local IPv6 addresses', () => {
    expect(isSafeCaldavAddress('fe80::1')).toBe(false)
  })

  it('rejects IPv4-mapped IPv6 addresses that embed private IPv4', () => {
    expect(isSafeCaldavAddress('::ffff:192.168.1.20')).toBe(false)
  })

  it('allows globally routable IPv4 and IPv6 addresses', () => {
    expect([
      isSafeCaldavAddress('93.184.216.34'),
      isSafeCaldavAddress('2606:2800:220:1:248:1893:25c8:1946'),
    ]).toEqual([true, true])
  })

  it('rejects a DNS answer set when any resolved address is unsafe', async () => {
    const result = resolveSafeCaldavTarget(
      new URL('https://calendar.example.com/dav'),
      async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.9', family: 4 },
      ]
    )

    await expect(result).rejects.toMatchObject({
      code: 'provider-invalid-response',
    })
  })

  it('returns a validated public DNS target for connection pinning', async () => {
    const result = await resolveSafeCaldavTarget(
      new URL('https://calendar.example.com:8443/dav'),
      async () => [{ address: '93.184.216.34', family: 4 }]
    )

    expect(result).toEqual({
      address: '93.184.216.34',
      family: 4,
      hostname: 'calendar.example.com',
      port: 8443,
    })
  })

  it('rejects origins outside a configured deployment allowlist', () => {
    process.env.WORK_CALDAV_ALLOWED_ORIGINS = 'https://dav.example.com'

    expect(() => requireSafeCaldavUrl('https://other.example.com/dav')).toThrow(
      expect.objectContaining({ code: 'provider-invalid-response' })
    )
  })

  it('accepts an exact origin in the configured deployment allowlist', () => {
    process.env.WORK_CALDAV_ALLOWED_ORIGINS =
      'https://dav.example.com, https://calendar.example.com:8443'

    expect(
      requireSafeCaldavUrl('https://calendar.example.com:8443/users/a')
        .origin
    ).toBe('https://calendar.example.com:8443')
  })

  it('fails closed when the configured allowlist contains a path', () => {
    process.env.WORK_CALDAV_ALLOWED_ORIGINS = 'https://dav.example.com/private'

    expect(() => requireSafeCaldavUrl('https://dav.example.com/dav')).toThrow(
      expect.objectContaining({ code: 'provider-not-configured' })
    )
  })
})
