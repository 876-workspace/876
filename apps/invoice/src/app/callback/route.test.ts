import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAppendSetCookies, mockFetchApiBridge } = vi.hoisted(() => ({
  mockAppendSetCookies: vi.fn(),
  mockFetchApiBridge: vi.fn(),
}))

vi.mock('@876/core/fetch/bridge', () => ({
  appendSetCookies: mockAppendSetCookies,
  fetchApiBridge: mockFetchApiBridge,
}))

const { GET } = await import('./route')

function createRequest(search: string) {
  const url = `https://876-invoice.1876.workers.dev/callback${search}`
  const request = new Request(url, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  }) as unknown as Parameters<typeof GET>[0] & {
    nextUrl: URL
    cookies: unknown
  }

  Object.defineProperty(request, 'nextUrl', { value: new URL(url) })
  Object.defineProperty(request, 'cookies', { value: { get: () => undefined } })

  return request as Parameters<typeof GET>[0]
}

/** The headers the callback sent to the API on its single bridge call. */
function sentHeaders(): Record<string, string> {
  expect(mockFetchApiBridge).toHaveBeenCalledTimes(1)
  const [, init] = mockFetchApiBridge.mock.calls[0]
  return (init as { headers: Record<string, string> }).headers
}

describe('social sign-in callback', () => {
  beforeEach(() => {
    mockFetchApiBridge.mockResolvedValue(
      new Response(JSON.stringify({ data: {}, error: null }), { status: 200 })
    )
  })

  describe('realm', () => {
    // Regression: the callback sent no X-876-Realm, and the API defaults an
    // absent realm to `consumer`. Invoice's /api/auth/* bridge signs in as
    // `enterprise`, so Google sign-in authenticated in the wrong realm and
    // bounced the user back to /login while password sign-in worked.
    it('exchanges the code in the enterprise realm', async () => {
      await GET(createRequest('?code=01JQ2ZK9'))

      expect(sentHeaders()['X-876-Realm']).toBe('enterprise')
    })

    it('exchanges the code at the API callback endpoint', async () => {
      await GET(createRequest('?code=01JQ2ZK9'))

      expect(mockFetchApiBridge).toHaveBeenCalledWith(
        '/auth/callback',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('failure paths', () => {
    it('redirects to login without calling the API when the provider errors', async () => {
      const response = await GET(createRequest('?error=access_denied'))

      expect(response.headers.get('location')).toContain(
        '/login?authError=auth%2Foauth-failed'
      )
      expect(mockFetchApiBridge).not.toHaveBeenCalled()
    })

    it('redirects to login without calling the API when the code is absent', async () => {
      const response = await GET(createRequest(''))

      expect(response.headers.get('location')).toContain(
        '/login?authError=auth%2Fmissing-code'
      )
      expect(mockFetchApiBridge).not.toHaveBeenCalled()
    })

    it('redirects to login when the API rejects the exchange', async () => {
      mockFetchApiBridge.mockResolvedValue(
        new Response(JSON.stringify({ error: {} }), { status: 401 })
      )

      const response = await GET(createRequest('?code=01JQ2ZK9'))

      expect(response.headers.get('location')).toContain(
        '/login?authError=auth%2Foauth-failed'
      )
      expect(mockAppendSetCookies).not.toHaveBeenCalled()
    })
  })

  describe('success', () => {
    it('forwards the session cookie and lands on the app root', async () => {
      const response = await GET(createRequest('?code=01JQ2ZK9'))

      expect(response.headers.get('location')).toBe(
        'https://876-invoice.1876.workers.dev/'
      )
      expect(mockAppendSetCookies).toHaveBeenCalledTimes(1)
    })
  })
})
