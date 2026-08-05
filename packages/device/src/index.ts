/**
 * `@876/device` — browser device signal collection for auth telemetry.
 *
 * Produces a stable, low-entropy-leak fingerprint plus the high-entropy client
 * hints that answer *which* handset and *which* OS version — the questions a
 * user-agent string cannot. Consumed by `@876/sdk`, which attaches the encoded
 * signal to auth requests as `x-876-device`; every app in the ecosystem
 * therefore gets device capture with no per-app wiring.
 *
 * Collection is best-effort by design. It is bounded by a timeout, every
 * source is individually guarded, and any failure yields `null` rather than
 * delaying or breaking the authentication request carrying it.
 *
 * See `README.md` for the full list of what is collected and why.
 *
 * @module @876/device
 */

import {
  audioComponent,
  canvasComponent,
  fontsComponent,
  localeComponent,
  platformComponent,
  screenComponent,
  webglComponent,
} from './components.ts'
import { stableHash } from './hash.ts'

export type DeviceConfidence = 'low' | 'medium' | 'high'

export type DeviceClientHints = {
  platform: string | null
  platformVersion: string | null
  model: string | null
  architecture: string | null
  bitness: string | null
  mobile: boolean | null
  fullVersionList: { brand: string; version: string }[] | null
}

export type DeviceSignal = {
  version: 1
  visitorId: string
  confidence: DeviceConfidence
  collectedAt: number
  hints: DeviceClientHints
  screen: {
    width: number
    height: number
    pixelRatio: number
    colorDepth: number
  }
  timezone: string | null
  timezoneOffset: number
  languages: string[]
  hardwareConcurrency: number | null
  deviceMemory: number | null
  touchPoints: number
  components: Record<string, string>
}

/**
 * Pluggable fingerprint source.
 *
 * The seam exists so a stronger provider (e.g. FingerprintJS Pro) can be
 * adopted later without touching a single call site — see
 * `./collectors/fingerprintjs.ts`.
 */
export type DeviceSignalCollector = () => Promise<{
  visitorId: string
  confidence?: DeviceConfidence
  components?: Record<string, string>
} | null>

export type CollectDeviceSignalOptions = {
  collector?: DeviceSignalCollector
  timeoutMs?: number
  /** Skips the per-tab cache. Only useful in tests. */
  fresh?: boolean
}

const CACHE_KEY = '876:device:v1'
const MAX_ENCODED_LENGTH = 8192
const DEFAULT_TIMEOUT_MS = 400
const HIGH_ENTROPY_HINTS = [
  'platform',
  'platformVersion',
  'model',
  'architecture',
  'bitness',
  'fullVersionList',
] as const

const EMPTY_HINTS: DeviceClientHints = {
  platform: null,
  platformVersion: null,
  model: null,
  architecture: null,
  bitness: null,
  mobile: null,
  fullVersionList: null,
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function fromBase64Url(value: string): string | null {
  try {
    const padded =
      value.replaceAll('-', '+').replaceAll('_', '/') +
      '='.repeat((4 - (value.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

/** Serializes a signal for the `x-876-device` header. */
export function encodeDeviceSignal(signal: DeviceSignal): string {
  return toBase64Url(JSON.stringify(signal))
}

/**
 * Parses an encoded signal, rejecting anything malformed or oversized.
 *
 * The size cap mirrors the API's, so an oversized blob is rejected on both
 * sides of the wire rather than only at the server.
 */
export function decodeDeviceSignal(encoded: string): DeviceSignal | null {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return null

  const decoded = fromBase64Url(encoded)
  if (!decoded) return null

  try {
    const value = JSON.parse(decoded) as DeviceSignal
    const valid =
      value?.version === 1 &&
      typeof value.visitorId === 'string' &&
      /^[a-f0-9]{32}$/.test(value.visitorId)
    return valid ? value : null
  } catch {
    return null
  }
}

/** Drops the cached signal — call on sign-out so a shared browser recollects. */
export function clearCachedDeviceSignal(): void {
  try {
    window.sessionStorage.removeItem(CACHE_KEY)
  } catch {
    // sessionStorage throws in private mode; a miss is not an error.
  }
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  return Promise.race([
    operation.catch(() => null),
    new Promise<null>((resolve) => {
      globalThis.setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
}

async function readClientHints(timeoutMs: number): Promise<DeviceClientHints> {
  const nav = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean
      getHighEntropyValues(hints: string[]): Promise<Record<string, unknown>>
    }
  }
  if (!nav.userAgentData) return EMPTY_HINTS

  const raw = await withTimeout(
    nav.userAgentData.getHighEntropyValues([...HIGH_ENTROPY_HINTS]),
    timeoutMs
  )
  if (!raw) return { ...EMPTY_HINTS, mobile: nav.userAgentData.mobile ?? null }

  const text = (key: string): string | null =>
    typeof raw[key] === 'string' && raw[key] ? (raw[key] as string) : null

  return {
    platform: text('platform'),
    platformVersion: text('platformVersion'),
    model: text('model'),
    architecture: text('architecture'),
    bitness: text('bitness'),
    mobile: nav.userAgentData.mobile ?? null,
    fullVersionList: Array.isArray(raw.fullVersionList)
      ? (raw.fullVersionList as { brand: string; version: string }[])
      : null,
  }
}

function resolveConfidence(
  components: Record<string, string>,
  hints: DeviceClientHints
): DeviceConfidence {
  const strong = ['canvas', 'webgl', 'audio', 'fonts'].filter(
    (key) => components[key]
  ).length
  const hasHints = Boolean(hints.platformVersion ?? hints.model)

  if (strong >= 3 && hasHints) return 'high'
  if (strong >= 2) return 'medium'
  return 'low'
}

/**
 * Collects (or returns the cached) device signal for this tab.
 *
 * Returns `null` on the server, when collection throws, or when the browser
 * blocks every source. Callers must treat `null` as "no signal" and proceed.
 */
export async function collectDeviceSignal(
  options: CollectDeviceSignalOptions = {}
): Promise<DeviceSignal | null> {
  if (typeof window === 'undefined') return null

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!options.fresh) {
    try {
      const cached = window.sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = decodeDeviceSignal(cached)
        if (parsed) return parsed
      }
    } catch {
      // Private mode — fall through and collect.
    }
  }

  try {
    const [hints, audio] = await Promise.all([
      readClientHints(timeoutMs),
      withTimeout(audioComponent(), timeoutMs),
    ])

    const components: Record<string, string> = {}
    const sources: [string, string | null][] = [
      ['screen', screenComponent()],
      ['locale', localeComponent()],
      ['platform', platformComponent()],
      ['canvas', canvasComponent()],
      ['webgl', webglComponent()],
      ['fonts', fontsComponent()],
      ['audio', audio],
    ]
    for (const [key, value] of sources) {
      if (value) components[key] = value
    }

    const custom = options.collector
      ? await withTimeout(options.collector(), timeoutMs)
      : null
    if (custom?.components) Object.assign(components, custom.components)

    const source = Object.keys(components)
      .sort()
      .map((key) => `${key}:${components[key]}`)
      .join('|')

    const resolved = Intl.DateTimeFormat().resolvedOptions()

    const signal: DeviceSignal = {
      version: 1,
      visitorId: custom?.visitorId ?? (await stableHash(source)),
      confidence: custom?.confidence ?? resolveConfidence(components, hints),
      collectedAt: Math.floor(Date.now() / 1000),
      hints,
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio,
        colorDepth: screen.colorDepth,
      },
      timezone: resolved.timeZone ?? null,
      timezoneOffset: new Date().getTimezoneOffset(),
      languages: [...(navigator.languages ?? [navigator.language])],
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory:
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
        null,
      touchPoints: navigator.maxTouchPoints ?? 0,
      components,
    }

    try {
      window.sessionStorage.setItem(CACHE_KEY, encodeDeviceSignal(signal))
    } catch {
      // Cache is an optimization, not a requirement.
    }

    return signal
  } catch {
    return null
  }
}
