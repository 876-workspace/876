import { isIP } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'

export type DnsLookup = (hostname: string) => Promise<string[]>

async function defaultLookup(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true })
  return records.map((record) => record.address)
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

const CLOUD_METADATA_IPV4 = new Set([
  '169.254.169.254',
  '100.100.100.200',
  '192.0.0.192',
])

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const value = Number(part)
    if (value > 255) return null
    octets.push(value)
  }
  return octets as [number, number, number, number]
}

function expandIpv6(ip: string): number[] | null {
  const zone = ip.indexOf('%')
  if (zone !== -1) return null
  const halves = ip.toLowerCase().split('::')
  if (halves.length > 2) return null
  const parseGroup = (side: string): number[] | null => {
    if (side === '') return []
    const out: number[] = []
    for (const piece of side.split(':')) {
      if (piece.includes('.')) {
        const v4 = parseIpv4(piece)
        if (!v4) return null
        out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3])
        continue
      }
      if (!/^[0-9a-f]{1,4}$/.test(piece)) return null
      out.push(Number.parseInt(piece, 16))
    }
    return out
  }
  if (halves.length === 1) {
    const groups = parseGroup(halves[0])
    return groups && groups.length === 8 ? groups : null
  }
  const head = parseGroup(halves[0])
  const tail = parseGroup(halves[1])
  if (!head || !tail) return null
  const missing = 8 - head.length - tail.length
  if (missing < 0) return null
  return [...head, ...new Array(missing).fill(0), ...tail]
}

function isBlockedIpv4(ip: string): boolean {
  const octets = parseIpv4(ip)
  if (!octets) return true
  const [a, b, c] = octets
  if (CLOUD_METADATA_IPV4.has(ip)) return true
  if (a === 0) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224 && a <= 239) return true
  if (a >= 240) return true
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 192 && b === 0 && c === 2) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true
  return false
}

function isBlockedIpv6(ip: string): boolean {
  const groups = expandIpv6(ip)
  if (!groups) return true
  if (groups.every((group) => group === 0)) return true
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    const a = groups[6] >> 8
    const b = groups[6] & 0xff
    const c = groups[7] >> 8
    const d = groups[7] & 0xff
    return isBlockedIpv4(`${a}.${b}.${c}.${d}`)
  }
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0) {
    const a = groups[6] >> 8
    const b = groups[6] & 0xff
    const c = groups[7] >> 8
    const d = groups[7] & 0xff
    return isBlockedIpv4(`${a}.${b}.${c}.${d}`)
  }
  if (groups.every((group, index) => (index === 7 ? group === 1 : group === 0)))
    return true
  const first = groups[0]
  if ((first & 0xffc0) === 0xfe80) return true
  if ((first & 0xfe00) === 0xfc00) return true
  if ((first & 0xff00) === 0xff00) return true
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true
  return false
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isBlockedIpv4(address)
  if (family === 6) return isBlockedIpv6(address)
  return true
}

export type SafeWebhookUrl =
  | { ok: true; hostname: string }
  | { ok: false; reason: string }

function extractRawHost(rawUrl: string): string | null {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)/.exec(rawUrl.trim())
  if (!match) return null
  const authority = match[1] ?? ''
  const at = authority.lastIndexOf('@')
  const hostport = at === -1 ? authority : authority.slice(at + 1)
  if (hostport.startsWith('[')) {
    const close = hostport.indexOf(']')
    return close === -1 ? hostport : hostport.slice(0, close + 1)
  }
  const colon = hostport.lastIndexOf(':')
  if (colon !== -1 && /^\d+$/.test(hostport.slice(colon + 1)))
    return hostport.slice(0, colon)
  return hostport
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

export type SyncWebhookUrlCheck =
  | { ok: true; hostname: string; bare: string }
  | { ok: false; reason: string }

export function checkWebhookUrlSync(rawUrl: string): SyncWebhookUrlCheck {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'unparseable-url' }
  }
  if (parsed.protocol !== 'https:')
    return { ok: false, reason: 'https-required' }
  if (parsed.username !== '' || parsed.password !== '')
    return { ok: false, reason: 'credentials-in-url' }
  const hostname = parsed.hostname.trim().toLowerCase().replace(/\.$/, '')
  if (hostname === '' || BLOCKED_HOSTNAMES.has(hostname))
    return { ok: false, reason: 'blocked-hostname' }
  const bare = stripBrackets(hostname)
  const rawHost = extractRawHost(rawUrl)
  const normalizedRaw =
    rawHost === null
      ? null
      : stripBrackets(rawHost.trim().toLowerCase().replace(/\.$/, ''))
  if (
    normalizedRaw !== null &&
    normalizedRaw !== bare &&
    normalizedRaw !== '' &&
    isIP(bare) !== 0
  )
    return { ok: false, reason: 'numeric-ip-hostname' }
  if (
    isIP(bare) === 0 &&
    /^\d+$/.test(bare.replaceAll('.', '')) &&
    /^[\d.]+$/.test(bare)
  )
    return { ok: false, reason: 'numeric-ip-hostname' }
  if (isIP(bare) !== 0 && isBlockedAddress(bare))
    return { ok: false, reason: 'blocked-address' }
  return { ok: true, hostname, bare }
}

export async function assertSafeWebhookUrl(
  rawUrl: string,
  lookup: DnsLookup = defaultLookup
): Promise<SafeWebhookUrl> {
  const sync = checkWebhookUrlSync(rawUrl)
  if (!sync.ok) return sync
  if (isIP(sync.bare) !== 0) return { ok: true, hostname: sync.hostname }

  let addresses: string[]
  try {
    addresses = await lookup(sync.hostname)
  } catch {
    return { ok: false, reason: 'dns-resolution-failed' }
  }
  if (addresses.length === 0)
    return { ok: false, reason: 'dns-resolution-failed' }
  const blocked = addresses.filter((address) => isBlockedAddress(address))
  if (blocked.length > 0) return { ok: false, reason: 'blocked-address' }
  return { ok: true, hostname: sync.hostname }
}

export type SecureLookupAddress = { address: string; family: number }
export type SecureResolver = (
  hostname: string
) => Promise<SecureLookupAddress[]>

async function defaultSecureResolver(
  hostname: string
): Promise<SecureLookupAddress[]> {
  const records = await dnsLookup(hostname, { all: true })
  return records.map((record) => ({
    address: record.address,
    family: record.family,
  }))
}

type LookupCallback =
  | ((err: Error | null, address: string, family: number) => void)
  | ((err: Error | null, addresses: SecureLookupAddress[]) => void)

function blockedError(): Error {
  const error = new Error('webhook-url-blocked: blocked-address')
  ;(error as { code?: string }).code = 'webhook-url-blocked'
  return error
}

export function createSecureLookup(
  resolver: SecureResolver = defaultSecureResolver
): (hostname: string, options: unknown, callback?: unknown) => void {
  return (hostname: string, options: unknown, callback?: unknown) => {
    const cb =
      typeof options === 'function'
        ? (options as LookupCallback)
        : (callback as LookupCallback)
    const opts =
      typeof options === 'object' && options !== null
        ? (options as { all?: boolean })
        : {}
    const wantAll = opts.all === true
    resolver(hostname).then(
      (addresses) => {
        if (addresses.length === 0) {
          ;(cb as (err: Error | null) => void)(
            new Error('dns-resolution-failed')
          )
          return
        }
        const blocked = addresses.filter((entry) =>
          isBlockedAddress(entry.address)
        )
        if (blocked.length > 0) {
          ;(cb as (err: Error | null) => void)(blockedError())
          return
        }
        if (wantAll) {
          ;(
            cb as (
              err: Error | null,
              addresses: SecureLookupAddress[]
            ) => void
          )(null, addresses)
          return
        }
        const first = addresses[0]
        if (!first) {
          ;(cb as (err: Error | null) => void)(
            new Error('dns-resolution-failed')
          )
          return
        }
        ;(
          cb as (err: Error | null, address: string, family: number) => void
        )(null, first.address, first.family)
      },
      (err: unknown) => {
        ;(cb as (err: Error | null) => void)(
          err instanceof Error ? err : new Error('dns-resolution-failed')
        )
      }
    )
  }
}
