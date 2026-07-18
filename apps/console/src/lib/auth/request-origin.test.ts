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

describe('getRequestOrigin', () => {
  it('uses the first forwarded host and protocol values', () => {
    const request = createRequest('http://127.0.0.1:3002', {
      'x-forwarded-host': 'console.example.com/, ignored.example.com',
      'x-forwarded-proto': 'https, http',
      host: 'internal:3002',
    })

    expect(getRequestOrigin(request)).toBe('https://console.example.com')
  })

  it('uses the request protocol for a forwarded localhost host', () => {
    const request = createRequest('http://127.0.0.1:3002', {
      'x-forwarded-host': 'localhost:3002',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe('http://localhost:3002')
  })

  it('uses the request protocol for a forwarded loopback host', () => {
    const request = createRequest('http://127.0.0.1:3002', {
      'x-forwarded-host': '127.0.0.1:3002',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe('http://127.0.0.1:3002')
  })

  it('falls back to the host header and request protocol', () => {
    const request = createRequest('https://internal.example.com', {
      host: 'console.example.com',
    })

    expect(getRequestOrigin(request)).toBe('https://console.example.com')
  })

  it('falls back to nextUrl when host headers are empty', () => {
    const request = createRequest('https://console.example.com', {
      host: '  , ignored.example.com',
    })

    expect(getRequestOrigin(request)).toBe('https://console.example.com')
  })

  it('falls back to nextUrl when a forwarded host cannot form a URL', () => {
    const request = createRequest('https://console.example.com', {
      'x-forwarded-host': '[invalid',
    })

    expect(getRequestOrigin(request)).toBe('https://console.example.com')
  })

  it('strips the internal port from a Codespaces forwarding host', () => {
    const request = createRequest('http://127.0.0.1:3002', {
      'x-forwarded-host': 'silver-space-3002.app.github.dev:3002',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe(
      'https://silver-space-3002.app.github.dev'
    )
  })
})

describe('requestUrl', () => {
  it('builds an absolute URL on the externally resolved origin', () => {
    const request = createRequest('http://127.0.0.1:3002', {
      'x-forwarded-host': 'console.example.com',
      'x-forwarded-proto': 'https',
    })

    const result = requestUrl(request, '/auth/complete?code=abc')

    expect(result.href).toBe(
      'https://console.example.com/auth/complete?code=abc'
    )
  })
})
