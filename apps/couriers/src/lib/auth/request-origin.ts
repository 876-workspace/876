import type { NextRequest } from 'next/server'

export function getRequestOrigin(request: NextRequest): string {
  const candidate = resolveCandidateOrigin(request)
  return stripCodespacesPort(candidate) ?? candidate
}

export function requestUrl(request: NextRequest, path: string): URL {
  return new URL(path, getRequestOrigin(request))
}

function resolveCandidateOrigin(request: NextRequest): string {
  const nextUrl = new URL(request.nextUrl.origin)
  const forwardedHost = firstHeaderValue(
    request.headers.get('x-forwarded-host')
  )
  const host = forwardedHost ?? firstHeaderValue(request.headers.get('host'))
  if (!host) return nextUrl.origin

  const nextProtocol = nextUrl.protocol.replace(/:$/, '')
  const forwardedProto = firstHeaderValue(
    request.headers.get('x-forwarded-proto')
  )
  const protocol = isLocalHostValue(host)
    ? nextProtocol
    : (forwardedProto ?? nextProtocol)

  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return nextUrl.origin
  }
}

function stripCodespacesPort(origin: string): string | null {
  try {
    const url = new URL(origin)
    if (isCodespacesHost(url.hostname)) url.port = ''
    return url.origin
  } catch {
    return null
  }
}

function firstHeaderValue(value: string | null): string | null {
  const normalized = value?.split(',')[0]?.trim()
  return normalized ? normalized.replace(/\/+$/, '') : null
}

function isLocalHostValue(host: string): boolean {
  try {
    const { hostname } = new URL(`http://${host}`)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function isCodespacesHost(hostname: string): boolean {
  return /-\d+\./.test(hostname)
}
