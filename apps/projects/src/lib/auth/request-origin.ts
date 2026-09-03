import type { NextRequest } from 'next/server'

export function getRequestOrigin(request: NextRequest): string {
  const fallback = new URL(request.nextUrl.origin)
  const host =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ??
    firstHeaderValue(request.headers.get('host'))
  if (!host) return fallback.origin

  const forwardedProtocol = firstHeaderValue(
    request.headers.get('x-forwarded-proto')
  )
  const protocol = isLocalHost(host)
    ? fallback.protocol.replace(/:$/, '')
    : (forwardedProtocol ?? fallback.protocol.replace(/:$/, ''))

  try {
    const origin = new URL(`${protocol}://${host}`)
    if (/-\d+\./.test(origin.hostname)) origin.port = ''
    return origin.origin
  } catch {
    return fallback.origin
  }
}

export function requestUrl(request: NextRequest, path: string): URL {
  return new URL(path, getRequestOrigin(request))
}

function firstHeaderValue(value: string | null): string | null {
  const normalized = value?.split(',')[0]?.trim()
  return normalized ? normalized.replace(/\/+$/, '') : null
}

function isLocalHost(host: string): boolean {
  try {
    const { hostname } = new URL(`http://${host}`)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}
