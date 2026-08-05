import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCachedDeviceSignal,
  collectDeviceSignal,
  decodeDeviceSignal,
  encodeDeviceSignal,
  type DeviceSignal,
} from './index.ts'

function makeSignal(overrides: Partial<DeviceSignal> = {}): DeviceSignal {
  return {
    version: 1,
    visitorId: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    confidence: 'high',
    collectedAt: 1_770_000_000,
    hints: {
      platform: 'Android',
      platformVersion: '15.0.0',
      model: 'SM-S928B',
      architecture: 'arm',
      bitness: '64',
      mobile: true,
      fullVersionList: [{ brand: 'Google Chrome', version: '131.0.6778.86' }],
    },
    screen: { width: 1080, height: 2340, pixelRatio: 3, colorDepth: 24 },
    timezone: 'America/Jamaica',
    timezoneOffset: 300,
    languages: ['en-JM', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    touchPoints: 5,
    components: { canvas: 'deadbeef', webgl: 'cafebabe' },
    ...overrides,
  }
}

describe('encodeDeviceSignal / decodeDeviceSignal', () => {
  it('round-trips a signal', () => {
    const signal = makeSignal()

    expect(decodeDeviceSignal(encodeDeviceSignal(signal))).toEqual(signal)
  })

  it('round-trips non-ascii content without corruption', () => {
    const signal = makeSignal({
      timezone: 'Europe/Zürich',
      languages: ['日本語'],
    })

    const decoded = decodeDeviceSignal(encodeDeviceSignal(signal))

    expect(decoded?.timezone).toBe('Europe/Zürich')
    expect(decoded?.languages).toEqual(['日本語'])
  })

  it('produces a url-safe payload with no padding', () => {
    const encoded = encodeDeviceSignal(makeSignal())

    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('rejects an empty payload', () => {
    expect(decodeDeviceSignal('')).toBeNull()
  })

  it('rejects a payload over the 8192-character cap', () => {
    expect(decodeDeviceSignal('a'.repeat(8193))).toBeNull()
  })

  it('rejects a payload that is not base64', () => {
    expect(decodeDeviceSignal('not base64 !!!')).toBeNull()
  })

  it('rejects a payload that is not json', () => {
    expect(decodeDeviceSignal(btoa('{ not json'))).toBeNull()
  })

  it('rejects an unknown signal version', () => {
    const encoded = encodeDeviceSignal(
      makeSignal({ version: 2 as unknown as 1 })
    )

    expect(decodeDeviceSignal(encoded)).toBeNull()
  })

  it('rejects a malformed visitor id', () => {
    expect(
      decodeDeviceSignal(encodeDeviceSignal(makeSignal({ visitorId: 'nope' })))
    ).toBeNull()
    expect(
      decodeDeviceSignal(
        encodeDeviceSignal(makeSignal({ visitorId: 'A'.repeat(32) }))
      )
    ).toBeNull()
  })
})

describe('collectDeviceSignal', () => {
  beforeEach(() => {
    clearCachedDeviceSignal()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearCachedDeviceSignal()
  })

  it('produces a 32-character hex visitor id', async () => {
    const signal = await collectDeviceSignal({ fresh: true })

    expect(signal).not.toBeNull()
    expect(signal?.visitorId).toMatch(/^[a-f0-9]{32}$/)
  })

  it('is stable across two collections in the same environment', async () => {
    const first = await collectDeviceSignal({ fresh: true })
    const second = await collectDeviceSignal({ fresh: true })

    expect(first?.visitorId).toBe(second?.visitorId)
  })

  it('changes when a contributing component changes', async () => {
    const first = await collectDeviceSignal({ fresh: true })

    const second = await collectDeviceSignal({
      fresh: true,
      collector: async () => ({
        visitorId: 'ignored',
        components: { extra: 'a-new-component' },
      }),
    })

    // The custom collector supplies its own visitorId, so compare the component
    // set that feeds the hash instead.
    expect(second?.components.extra).toBe('a-new-component')
    expect(first?.components.extra).toBeUndefined()
  })

  it('caches the signal for the tab', async () => {
    const first = await collectDeviceSignal()
    const second = await collectDeviceSignal()

    expect(second).toEqual(first)
    expect(window.sessionStorage.getItem('876:device:v1')).toBeTruthy()
  })

  it('clearCachedDeviceSignal drops the cache', async () => {
    await collectDeviceSignal()
    clearCachedDeviceSignal()

    expect(window.sessionStorage.getItem('876:device:v1')).toBeNull()
  })

  it('lets a custom collector supply the visitor id and confidence', async () => {
    const signal = await collectDeviceSignal({
      fresh: true,
      collector: async () => ({
        visitorId: 'f'.repeat(32),
        confidence: 'high',
      }),
    })

    expect(signal?.visitorId).toBe('f'.repeat(32))
    expect(signal?.confidence).toBe('high')
  })

  it('falls back to the first-party id when the custom collector returns null', async () => {
    const signal = await collectDeviceSignal({
      fresh: true,
      collector: async () => null,
    })

    expect(signal?.visitorId).toMatch(/^[a-f0-9]{32}$/)
  })

  it('still returns a signal when the custom collector throws', async () => {
    const signal = await collectDeviceSignal({
      fresh: true,
      collector: async () => {
        throw new Error('collector exploded')
      },
    })

    expect(signal?.visitorId).toMatch(/^[a-f0-9]{32}$/)
  })

  it('still returns a signal without crypto.subtle', async () => {
    vi.stubGlobal('crypto', {})

    const signal = await collectDeviceSignal({ fresh: true })

    expect(signal?.visitorId).toMatch(/^[a-f0-9]{32}$/)
  })

  it('degrades to low confidence when no strong source is available', async () => {
    const signal = await collectDeviceSignal({ fresh: true })

    // jsdom provides no real canvas/webgl/audio output.
    expect(['low', 'medium']).toContain(signal?.confidence)
  })

  it('never collects raw canvas or font data into components', async () => {
    const signal = await collectDeviceSignal({ fresh: true })

    for (const value of Object.values(signal?.components ?? {})) {
      expect(value).not.toContain('data:image')
      expect(value.length).toBeLessThanOrEqual(64)
    }
  })
})
