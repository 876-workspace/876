import type { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { getRequestOrigin, requestUrl } from '../request-origin'

function mockRequest(
  nextUrl: string,
  headers: Record<string, string> = {}
): NextRequest {
  return {
    nextUrl: new URL(nextUrl),
    headers: new Headers(headers),
  } as unknown as NextRequest
}

const CODESPACE_HOST = 'potential-space-invention-abc123-3000.app.github.dev'

describe('getRequestOrigin', () => {
  it('strips the codespaces port from a forwarded host', () => {
    const request = mockRequest('http://localhost:3000/oauth/authorize', {
      host: 'localhost:3000',
      'x-forwarded-host': `${CODESPACE_HOST}:3000`,
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe(`https://${CODESPACE_HOST}`)
  })

  it('strips the codespaces port even without a forwarded host (fallback path)', () => {
    // The decisive case: the proxy hands the app the codespaces host directly
    // on nextUrl, with the internal port still attached and no x-forwarded-host.
    const request = mockRequest(
      `https://${CODESPACE_HOST}:3000/oauth/authorize`
    )

    expect(getRequestOrigin(request)).toBe(`https://${CODESPACE_HOST}`)
  })

  it('keeps the port for localhost dev', () => {
    const request = mockRequest('http://localhost:3000/oauth/authorize', {
      host: 'localhost:3000',
    })

    expect(getRequestOrigin(request)).toBe('http://localhost:3000')
  })

  it('leaves a real production domain unchanged', () => {
    const request = mockRequest('https://app.876.com/oauth/authorize', {
      host: 'app.876.com',
      'x-forwarded-host': 'app.876.com',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe('https://app.876.com')
  })

  it('uses the request protocol when the host header is local', () => {
    const request = mockRequest('http://localhost:3000/oauth/authorize', {
      host: 'localhost:3000',
      'x-forwarded-proto': 'https',
    })

    expect(getRequestOrigin(request)).toBe('http://localhost:3000')
  })
})

describe('requestUrl', () => {
  it('builds an absolute URL on the externally-correct origin', () => {
    const request = mockRequest(
      `https://${CODESPACE_HOST}:3000/oauth/authorize`
    )

    expect(requestUrl(request, '/login').toString()).toBe(
      `https://${CODESPACE_HOST}/login`
    )
  })
})
