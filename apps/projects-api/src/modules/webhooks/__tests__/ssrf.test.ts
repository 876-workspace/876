import { describe, expect, it } from 'vitest'

import {
  assertSafeWebhookUrl,
  isBlockedAddress,
  type DnsLookup,
} from '../../../platform/ssrf.js'

const publicLookup: DnsLookup = async () => ['93.184.216.34']

describe('isBlockedAddress', () => {
  const blocked = [
    '127.0.0.1',
    '127.0.0.53',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '169.254.10.20',
    '100.64.0.1',
    '100.100.100.200',
    '100.127.255.255',
    '0.0.0.0',
    '192.0.0.192',
    '::1',
    '::',
    'fe80::1',
    'fe80::a634:d7ff:fec9:1234',
    'fc00::1',
    'fd00:ec2::254',
    '::ffff:127.0.0.1',
    '::ffff:10.1.2.3',
    '2001:db8::1',
    'not-an-ip',
  ]
  for (const address of blocked) {
    it(`blocks ${address}`, () => {
      expect(isBlockedAddress(address)).toBe(true)
    })
  }

  const allowed = [
    '93.184.216.34',
    '8.8.8.8',
    '172.15.255.255',
    '172.32.0.1',
    '100.63.255.255',
    '100.128.0.1',
    '192.167.255.255',
    '1.1.1.1',
    '2606:2800:220:1:248:1893:25c8:1946',
  ]
  for (const address of allowed) {
    it(`allows ${address}`, () => {
      expect(isBlockedAddress(address)).toBe(false)
    })
  }
})

describe('assertSafeWebhookUrl', () => {
  it('accepts an https url resolving to a public address', async () => {
    const result = await assertSafeWebhookUrl(
      'https://hooks.example.com/deliver',
      publicLookup
    )
    expect(result).toEqual({ ok: true, hostname: 'hooks.example.com' })
  })

  it('rejects http urls', async () => {
    const result = await assertSafeWebhookUrl(
      'http://hooks.example.com/deliver',
      publicLookup
    )
    expect(result).toEqual({ ok: false, reason: 'https-required' })
  })

  it('rejects urls with embedded credentials', async () => {
    const result = await assertSafeWebhookUrl(
      'https://user:pass@hooks.example.com/x',
      publicLookup
    )
    expect(result).toEqual({ ok: false, reason: 'credentials-in-url' })
  })

  it('rejects unparseable urls', async () => {
    const result = await assertSafeWebhookUrl('::::', publicLookup)
    expect(result).toEqual({ ok: false, reason: 'unparseable-url' })
  })

  it('rejects localhost without dns', async () => {
    const result = await assertSafeWebhookUrl(
      'https://localhost/hook',
      async () => {
        throw new Error('lookup should not run')
      }
    )
    expect(result).toEqual({ ok: false, reason: 'blocked-hostname' })
  })

  it('rejects literal loopback ips', async () => {
    const result = await assertSafeWebhookUrl(
      'https://127.0.0.1/hook',
      publicLookup
    )
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects literal ipv6 loopback', async () => {
    const result = await assertSafeWebhookUrl(
      'https://[::1]/hook',
      publicLookup
    )
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects hosts resolving to private addresses', async () => {
    const result = await assertSafeWebhookUrl(
      'https://internal.example.com/hook',
      async () => ['10.1.2.3', '93.184.216.34']
    )
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects hosts resolving to cloud metadata addresses', async () => {
    const result = await assertSafeWebhookUrl(
      'https://hooks.example.com/hook',
      async () => ['169.254.169.254']
    )
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects hosts that fail dns resolution', async () => {
    const result = await assertSafeWebhookUrl(
      'https://missing.example.com/hook',
      async () => {
        throw new Error('ENOTFOUND')
      }
    )
    expect(result).toEqual({ ok: false, reason: 'dns-resolution-failed' })
  })

  it('rejects numeric-ip hostnames', async () => {
    const result = await assertSafeWebhookUrl(
      'https://2130706433/hook',
      publicLookup
    )
    expect(result).toEqual({ ok: false, reason: 'numeric-ip-hostname' })
  })
})
