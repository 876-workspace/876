import type { NextRequest } from 'next/server'

/**
 * Resolves the externally-correct origin for the incoming request.
 *
 * Behind a reverse proxy (GitHub Codespaces, Vercel, etc.) `request.nextUrl.origin`
 * reflects the app's *internal* listening port (e.g. `:3002`). Browser-facing
 * redirects — and the `x-876-origin` the API uses to derive the WorkOS callback
 * URL — must use the *external* origin instead.
 *
 * Resolution order: `x-forwarded-host` (+ `x-forwarded-proto`) → `host` header →
 * `request.nextUrl.origin`. The codespaces port is stripped on every path; that
 * is a no-op for `localhost` and real domains, so it is safe in prod.
 *
 * Pure URL/Headers only — safe on the Edge runtime.
 */
export function getRequestOrigin(request: NextRequest): string {
  const candidate = resolveCandidateOrigin(request)
  return stripCodespacesPort(candidate) ?? candidate
}

/** Builds an absolute URL on the request's externally-correct origin. */
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
