import type { NextRequest } from 'next/server'
import { authErrorMessages } from '@876/types/auth-errors'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('/api/auth bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('forwards auth requests to the API and copies session cookies', async () => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    vi.stubEnv('API_876_KEY', '876_app_secret_test_key')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true }, error: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': '876-session=sealed; Path=/; HttpOnly; SameSite=Lax',
        },
      })
    )
    const { POST } = await import('../route')
    const request = {
      method: 'POST',
      nextUrl: new URL('https://app.example.com/api/auth/login'),
      headers: new Headers({
        'content-type': 'application/json',
        cookie: 'existing=value',
      }),
      text: () => Promise.resolve('{"identifier":"user@example.com"}'),
    } as unknown as NextRequest

    const response = await POST(request, {
      params: Promise.resolve({ path: ['login'] }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: '{"identifier":"user@example.com"}',
      })
    )
    const [, init] = fetchMock.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get('X-876-API-Key')).toBe('876_app_secret_test_key')
    expect(headers.get('cookie')).toBe('existing=value')
    expect(headers.get('x-876-origin')).toBe('https://app.example.com')
    // Consumer app declares the consumer realm to the API auth entry point.
    expect(headers.get('X-876-Realm')).toBe('consumer')
    expect(response.headers.get('set-cookie')).toContain('876-session=sealed')
  })

  it('strips stale content-encoding/length so the decompressed body is readable', async () => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    vi.stubEnv('API_876_KEY', '876_app_secret_test_key')

    // Simulates undici: the body stream is already decompressed, but the
    // upstream `content-encoding`/`content-length` headers still describe the
    // original gzip payload. Forwarding them makes the browser fail to decode.
    const body = JSON.stringify({ data: { ok: true }, error: null })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'Content-Length': '42',
          'Set-Cookie': '876-session=sealed; Path=/; HttpOnly; SameSite=Lax',
        },
      })
    )
    const { POST } = await import('../route')
    const request = {
      method: 'POST',
      nextUrl: new URL('https://app.example.com/api/auth/login'),
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{"identifier":"user@example.com"}'),
    } as unknown as NextRequest

    const response = await POST(request, {
      params: Promise.resolve({ path: ['login'] }),
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('content-length')).toBeNull()
    expect(response.headers.get('set-cookie')).toContain('876-session=sealed')
    await expect(response.json()).resolves.toEqual({
      data: { ok: true },
      error: null,
    })
  })

  it('derives the browser origin from forwarded Codespaces headers', async () => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    vi.stubEnv('API_876_KEY', '876_app_secret_test_key')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true }, error: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
    const { POST } = await import('../route')
    const request = {
      method: 'POST',
      nextUrl: new URL('http://localhost:3000/api/auth/social-login'),
      headers: new Headers({
        'content-type': 'application/json',
        host: 'localhost:3000',
        'x-forwarded-host':
          'potential-space-invention-967qjvj9vppqf75v9-3000.app.github.dev:3000',
        'x-forwarded-proto': 'https',
      }),
      text: () => Promise.resolve('{"provider":"google"}'),
    } as unknown as NextRequest

    await POST(request, {
      params: Promise.resolve({ path: ['social-login'] }),
    })

    const [, init] = fetchMock.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get('x-876-origin')).toBe(
      'https://potential-space-invention-967qjvj9vppqf75v9-3000.app.github.dev'
    )
  })

  it('defaults the bridge to the deployed API URL in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_876_KEY', '876_app_secret_test_key')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ok: true }, error: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
    const { GET } = await import('../route')
    const request = {
      method: 'GET',
      nextUrl: new URL('https://app.example.com/api/auth/providers'),
      headers: new Headers(),
    } as unknown as NextRequest

    await GET(request, {
      params: Promise.resolve({ path: ['providers'] }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://eight76-api.onrender.com/auth/providers',
      expect.any(Object)
    )
  })

  it('returns a structured auth error when the API bridge is unreachable', async () => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    vi.stubEnv('API_876_KEY', '876_app_secret_test_key')

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const { GET } = await import('../route')
    const request = {
      method: 'GET',
      nextUrl: new URL('https://app.example.com/api/auth/providers'),
      headers: new Headers(),
    } as unknown as NextRequest

    const response = await GET(request, {
      params: Promise.resolve({ path: ['providers'] }),
    })

    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'auth/network-error',
        message: authErrorMessages['auth/network-error'],
      },
    })
    expect(response.status).toBe(503)
  })
})
