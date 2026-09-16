import { describe, expect, it } from 'vitest'

import {
  assertSafeWebhookUrl,
  checkWebhookUrlSync,
  createSecureLookup,
  isBlockedAddress,
} from '../ssrf.js'

describe('isBlockedAddress new v4 ranges', () => {
  const blockedV4 = [
    '224.0.0.1',
    '224.0.0.251',
    '239.255.255.255',
    '240.0.0.1',
    '255.255.255.255',
    '192.0.0.1',
    '192.0.0.255',
    '198.18.0.1',
    '198.19.255.255',
    '192.0.2.1',
    '198.51.100.5',
    '203.0.113.9',
  ]
  for (const address of blockedV4) {
    it(`blocks ${address}`, () => {
      expect(isBlockedAddress(address)).toBe(true)
    })
  }

  const allowedV4 = [
    '223.255.255.255',
    '192.0.1.1',
    '192.0.3.1',
    '198.17.255.255',
    '198.20.0.1',
    '198.51.99.1',
    '198.51.101.1',
    '203.0.112.1',
    '203.0.114.1',
    '8.8.8.8',
  ]
  for (const address of allowedV4) {
    it(`allows ${address}`, () => {
      expect(isBlockedAddress(address)).toBe(false)
    })
  }
})

describe('isBlockedAddress new v6 ranges', () => {
  const blockedV6 = [
    'ff00::1',
    'ff02::1',
    'ff05::abcd',
    '2001:db8::1',
    '2001:db8:ffff::1',
  ]
  for (const address of blockedV6) {
    it(`blocks ${address}`, () => {
      expect(isBlockedAddress(address)).toBe(true)
    })
  }

  it('blocks NAT64 embedding loopback', () => {
    expect(isBlockedAddress('64:ff9b::127.0.0.1')).toBe(true)
  })

  it('blocks NAT64 embedding private address', () => {
    expect(isBlockedAddress('64:ff9b::10.0.0.1')).toBe(true)
  })

  it('blocks NAT64 embedding link-local metadata', () => {
    expect(isBlockedAddress('64:ff9b::169.254.169.254')).toBe(true)
  })

  it('blocks NAT64 embedding documentation v4', () => {
    expect(isBlockedAddress('64:ff9b::192.0.2.1')).toBe(true)
  })

  it('allows NAT64 embedding public address', () => {
    expect(isBlockedAddress('64:ff9b::5db8:d822')).toBe(false)
  })

  it('allows NAT64 embedding public dns address', () => {
    expect(isBlockedAddress('64:ff9b::808:808')).toBe(false)
  })
})

describe('secure lookup guard', () => {
  function runLookup(
    hostname: string,
    resolver: (host: string) => Promise<Array<{ address: string; family: number }>>,
    options: unknown = { all: true }
  ): Promise<{ err: Error | null; value: unknown }> {
    const lookup = createSecureLookup(resolver)
    return new Promise((resolve) => {
      lookup(hostname, options, (err: Error | null, value: unknown) => {
        resolve({ err, value })
      })
    })
  }

  it('rejects when any resolved address is blocked', async () => {
    const outcome = await runLookup('hooks.example.com', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ])
    expect(outcome.err).not.toBeNull()
  })

  it('rejects single blocked resolution', async () => {
    const outcome = await runLookup('hooks.example.com', async () => [
      { address: '169.254.169.254', family: 4 },
    ])
    expect(outcome.err).not.toBeNull()
  })

  it('returns the first allowed address when all resolve public', async () => {
    const outcome = await runLookup('hooks.example.com', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '1.1.1.1', family: 4 },
    ])
    expect(outcome.err).toBeNull()
    const addresses = outcome.value as Array<{ address: string; family: number }>
    expect(addresses[0]?.address).toBe('93.184.216.34')
  })

  it('rejects empty resolutions', async () => {
    const outcome = await runLookup('hooks.example.com', async () => [])
    expect(outcome.err).not.toBeNull()
  })
})

describe('ip literal path needs no dns', () => {
  it('accepts a public ip literal without calling dns', async () => {
    const result = await assertSafeWebhookUrl('https://93.184.216.34/hook', async () => {
      throw new Error('dns must not run for literals')
    })
    expect(result).toEqual({ ok: true, hostname: '93.184.216.34' })
  })

  it('rejects a blocked ip literal without calling dns', async () => {
    const result = await assertSafeWebhookUrl('https://10.0.0.1/hook', async () => {
      throw new Error('dns must not run for literals')
    })
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects multicast literals', async () => {
    const result = await assertSafeWebhookUrl('https://224.0.0.1/hook', async () => {
      throw new Error('dns must not run for literals')
    })
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })

  it('rejects broadcast literals', async () => {
    const result = await assertSafeWebhookUrl('https://255.255.255.255/hook', async () => {
      throw new Error('dns must not run for literals')
    })
    expect(result).toEqual({ ok: false, reason: 'blocked-address' })
  })
})

describe('sync url checks for transport', () => {
  it('rejects http', () => {
    expect(checkWebhookUrlSync('http://hooks.example.com/x').ok).toBe(false)
  })

  it('rejects embedded credentials', () => {
    expect(checkWebhookUrlSync('https://user:pass@hooks.example.com/x').ok).toBe(false)
  })
})
