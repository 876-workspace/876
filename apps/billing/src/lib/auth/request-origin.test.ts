import type { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { getRequestOrigin, requestUrl } from './request-origin'

function createRequest(
  origin: string,
  headers: Record<string, string> = {}
): NextRequest {
  return {
    nextUrl: { origin },
    headers: new Headers(headers),
  } as unknown as NextRequest
}

describe('Billing getRequestOrigin', () => {
  it('uses the first forwarded host and protocol', () => {
    const request = createRequest('http://127.0.0.1:3004', {
      'x-forwarded-host': 'billing.example.com/, ignored.example.com',
      'x-forwarded-proto': 'https, http',
    })

    expect(getRequestOrigin(request)).toBe('https://billing.example.com')
  })

  it.each(['localhost:3004', '127.0.0.1:3004'])(
    'keeps the request protocol for local host %s',
    (host) => {
      const request = createRequest('http://127.0.0.1:3004', {
        'x-forwarded-host': host,
        'x-forwarded-proto': 'https',
      })

      expect(getRequestOrigin(request)).toBe(`http://${host}`)
    }
  )

  it('falls back to the host header and request protocol', () => {
    const request = createRequest('https://internal.example.com', {
      host: 'billing.example.com',
    })

    expect(getRequestOrigin(request)).toBe('https://billing.example.com')
  })

  it('falls back to nextUrl when host headers are absent', () => {
    const request = createRequest('https://billing.example.com')

    expect(getRequestOrigin(request)).toBe('https://billing.example.com')
  })

  it('falls back to nextUrl for an invalid forwarded host', () => {
    const request = createRequest('https://billing.example.com', {
      'x-forwarded-host': '[invalid',
    })

    expect(getRequestOrigin(request)).toBe('https://billing.example.com')
  })

  it('strips an internal port from a Codespaces forwarding host', () => {
    const request = createRequest('http://127.0.0.1:3004', {
      'x-forwarded-host': 'silver-space-3004.app.github.dev:3004',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe(
      'https://silver-space-3004.app.github.dev'
    )
  })

  it('ignores empty first header values', () => {
    const request = createRequest('https://billing.example.com', {
      'x-forwarded-host': '  , ignored.example.com',
      host: 'billing-fallback.example.com/',
    })

    expect(getRequestOrigin(request)).toBe(
      'https://billing-fallback.example.com'
    )
  })
})

describe('Billing requestUrl', () => {
  it('builds an absolute URL on the external origin', () => {
    const request = createRequest('http://127.0.0.1:3004', {
      'x-forwarded-host': 'billing.example.com',
      'x-forwarded-proto': 'https',
    })

    const result = requestUrl(request, '/auth/complete?code=abc')

    expect(result.href).toBe(
      'https://billing.example.com/auth/complete?code=abc'
    )
  })
})
