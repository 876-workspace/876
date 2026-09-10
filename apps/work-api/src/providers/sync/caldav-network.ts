import { lookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

import { WorkSyncProviderError } from './provider.js'

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024

type DnsAddress = {
  address: string
  family: number
}

type DnsResolver = (hostname: string) => Promise<DnsAddress[]>

type CaldavRequestInit = {
  method?: string
  headers?: HeadersInit
  body?: string
}

export type CaldavResolvedTarget = {
  address: string
  family: 4 | 6
  hostname: string
  port: number
}

const defaultResolver: DnsResolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true })

function providerUrlError(message: string): never {
  throw new WorkSyncProviderError('provider-invalid-response', message)
}

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
}

function ipv4Parts(address: string) {
  return address.split('.').map(Number)
}

function isBlockedIpv4(address: string) {
  const [a, b, c] = ipv4Parts(address)
  if (a === undefined || b === undefined || c === undefined) return true

  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true

  // IANA special-purpose, documentation, relay, and benchmark ranges are not
  // legitimate CalDAV destinations and are rejected with the private ranges.
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 192 && b === 0 && c === 2) return true
  if (a === 192 && b === 88 && c === 99) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true

  return a >= 224
}

function ipv4ToHextets(address: string) {
  const parts = ipv4Parts(address)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return null

  return [
    ((parts[0] ?? 0) << 8) | (parts[1] ?? 0),
    ((parts[2] ?? 0) << 8) | (parts[3] ?? 0),
  ].map((part) => part.toString(16))
}

function ipv6Value(address: string) {
  let value = address.toLowerCase().split('%')[0] ?? address
  if (value.includes('.')) {
    const separator = value.lastIndexOf(':')
    if (separator < 0) return null
    const hextets = ipv4ToHextets(value.slice(separator + 1))
    if (!hextets) return null
    value = `${value.slice(0, separator)}:${hextets.join(':')}`
  }

  const halves = value.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null

  const parts = [
    ...left,
    ...(halves.length === 2 ? Array.from({ length: missing }, () => '0') : []),
    ...right,
  ]
  if (parts.length !== 8) return null

  let result = 0n
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null
    result = (result << 16n) | BigInt(`0x${part}`)
  }
  return result
}

function isBlockedIpv6(address: string) {
  const value = ipv6Value(address)
  if (value === null) return true

  // IPv4-mapped IPv6 must inherit the IPv4 policy rather than bypass it.
  if (value >> 32n === 0xffffn) {
    const v4 = Number(value & 0xffffffffn)
    return isBlockedIpv4(
      `${(v4 >>> 24) & 255}.${(v4 >>> 16) & 255}.${(v4 >>> 8) & 255}.${v4 & 255}`
    )
  }

  // Only globally routable 2000::/3 space is eligible. This rejects
  // unspecified, loopback, ULA, link/site-local, multicast and NAT64 ranges.
  if (value >> 125n !== 1n) return true

  const high16 = Number(value >> 112n)
  const high20 = Number(value >> 108n)
  const high28 = Number(value >> 100n)
  const high32 = Number(value >> 96n)

  // Additional globally-shaped special ranges that must never be provider
  // destinations: Teredo, ORCHID, documentation, 6to4 and documentation /20.
  if (high32 === 0x20010000 || high32 === 0x20010db8) return true
  if (high28 === 0x2001001 || high28 === 0x2001002) return true
  if (high16 === 0x2002 || high20 === 0x3fff0) return true

  return false
}

export function isSafeCaldavAddress(address: string) {
  const normalized = normalizeHostname(address)
  const family = isIP(normalized)
  if (family === 4) return !isBlockedIpv4(normalized)
  if (family === 6) return !isBlockedIpv6(normalized)
  return false
}

function configuredAllowedOrigins() {
  const raw = process.env.WORK_CALDAV_ALLOWED_ORIGINS?.trim()
  if (!raw) return null

  const origins = new Set<string>()
  for (const item of raw.split(',')) {
    const value = item.trim()
    if (!value) continue

    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new WorkSyncProviderError(
        'provider-not-configured',
        'The CalDAV outbound origin policy is invalid.'
      )
    }

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new WorkSyncProviderError(
        'provider-not-configured',
        'The CalDAV outbound origin policy is invalid.'
      )

    origins.add(url.origin)
  }

  if (origins.size === 0)
    throw new WorkSyncProviderError(
      'provider-not-configured',
      'The CalDAV outbound origin policy is invalid.'
    )

  return origins
}

export function requireSafeCaldavUrl(value: string, allowedOrigin?: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return providerUrlError('The CalDAV server returned an invalid URL.')
  }

  if (url.protocol !== 'https:')
    return providerUrlError('The CalDAV server URL must use HTTPS.')
  if (url.username || url.password)
    return providerUrlError(
      'The CalDAV server URL must not contain credentials.'
    )

  const hostname = normalizeHostname(url.hostname)
  if (hostname === 'localhost' || hostname.endsWith('.localhost'))
    return providerUrlError(
      'The CalDAV server URL is not an allowed destination.'
    )

  if (allowedOrigin && url.origin !== allowedOrigin)
    return providerUrlError('The CalDAV server returned an unexpected origin.')

  const allowedOrigins = configuredAllowedOrigins()
  if (allowedOrigins && !allowedOrigins.has(url.origin))
    return providerUrlError(
      'The CalDAV server origin is not allowed by policy.'
    )

  if (isIP(hostname) && !isSafeCaldavAddress(hostname))
    return providerUrlError(
      'The CalDAV server URL is not an allowed destination.'
    )

  return url
}

export async function resolveSafeCaldavTarget(
  url: URL,
  resolver: DnsResolver = defaultResolver
): Promise<CaldavResolvedTarget> {
  const hostname = normalizeHostname(url.hostname)
  const literalFamily = isIP(hostname)
  if (literalFamily) {
    if (!isSafeCaldavAddress(hostname))
      return providerUrlError(
        'The CalDAV server URL is not an allowed destination.'
      )

    return {
      address: hostname,
      family: literalFamily as 4 | 6,
      hostname,
      port: Number(url.port || '443'),
    }
  }

  let addresses: DnsAddress[]
  try {
    addresses = await resolver(hostname)
  } catch {
    throw new WorkSyncProviderError(
      'provider-unavailable',
      'The CalDAV server hostname could not be resolved.'
    )
  }

  if (addresses.length === 0)
    throw new WorkSyncProviderError(
      'provider-unavailable',
      'The CalDAV server hostname could not be resolved.'
    )

  const normalized = addresses.map((entry) => ({
    address: normalizeHostname(entry.address),
    family: entry.family,
  }))
  if (
    normalized.some(
      (entry) =>
        (entry.family !== 4 && entry.family !== 6) ||
        !isSafeCaldavAddress(entry.address)
    )
  )
    return providerUrlError(
      'The CalDAV server resolved to an unsafe destination.'
    )

  const target = normalized[0]!
  return {
    address: target.address,
    family: target.family as 4 | 6,
    hostname,
    port: Number(url.port || '443'),
  }
}

function nodeHttpsRequest(
  url: URL,
  target: CaldavResolvedTarget,
  init: CaldavRequestInit,
  authorization: string
) {
  return new Promise<Response>((resolve, reject) => {
    const headers = new Headers(init.headers)
    headers.set('authorization', authorization)
    headers.set('host', url.host)
    if (init.body !== undefined && !headers.has('content-length'))
      headers.set('content-length', String(Buffer.byteLength(init.body)))

    const request = httpsRequest(
      {
        protocol: 'https:',
        hostname: target.address,
        family: target.family,
        port: target.port,
        path: `${url.pathname}${url.search}`,
        method: init.method ?? 'GET',
        headers: Object.fromEntries(headers.entries()),
        servername: isIP(target.hostname) ? undefined : target.hostname,
      },
      (response) => {
        const chunks: Buffer[] = []
        let responseBytes = 0
        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          responseBytes += buffer.byteLength
          if (responseBytes > MAX_RESPONSE_BYTES) {
            response.destroy(
              new WorkSyncProviderError(
                'provider-invalid-response',
                'The CalDAV server response exceeded the allowed size.'
              )
            )
            return
          }
          chunks.push(buffer)
        })
        response.on('error', reject)
        response.on('end', () => {
          const responseHeaders = new Headers()
          for (const [key, value] of Object.entries(response.headers)) {
            if (Array.isArray(value))
              for (const item of value) responseHeaders.append(key, item)
            else if (value !== undefined)
              responseHeaders.set(key, String(value))
          }

          const status = response.statusCode ?? 502
          const body =
            status === 204 || status === 205 ? null : Buffer.concat(chunks)
          resolve(
            new Response(body, {
              status,
              statusText: response.statusMessage,
              headers: responseHeaders,
            })
          )
        })
      }
    )

    request.setTimeout(REQUEST_TIMEOUT_MS, () =>
      request.destroy(new Error('CalDAV request timed out.'))
    )
    request.on('error', reject)
    if (init.body !== undefined) request.write(init.body)
    request.end()
  })
}

export async function caldavRequest(
  url: URL,
  init: CaldavRequestInit,
  authorization: string
) {
  const validatedUrl = requireSafeCaldavUrl(url.toString())
  const target = await resolveSafeCaldavTarget(validatedUrl)

  // The request is pinned to the address we just validated, so a second DNS
  // lookup cannot rebind the hostname after policy enforcement. Node's HTTPS
  // client also does not follow redirects, preventing credential forwarding.
  return nodeHttpsRequest(validatedUrl, target, init, authorization)
}
