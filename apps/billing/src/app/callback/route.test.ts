import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const mocks = vi.hoisted(() => {
  // The route reads its API key at module scope, so this must be set before
  // the import above evaluates.
  process.env.BILLING_API_876_KEY = '876_app_secret_test'

  return {
    fetchApiBridge: vi.fn(),
    hasEstablishedSession: vi.fn(),
  }
})

vi.mock('@876/core/fetch/bridge', async () => {
  const actual = await vi.importActual<typeof import('@876/core/fetch/bridge')>(
    '@876/core/fetch/bridge'
  )
  return { ...actual, fetchApiBridge: mocks.fetchApiBridge }
})

vi.mock('@876/core/auth/callback-session', () => ({
  hasEstablishedSession: mocks.hasEstablishedSession,
}))

const ORIGIN = 'https://876-billing.vercel.app'

function createRequest(search: string): NextRequest {
  return new NextRequest(`${ORIGIN}/callback${search}`, {
    headers: new Headers({ host: '876-billing.vercel.app' }),
  })
}

function sessionResponse(): Response {
  return new Response(JSON.stringify({ user: { id: 'user_1' } }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': '876-session=sealed.value; Path=/; HttpOnly; SameSite=Lax',
    },
  })
}

function exchangeHeaders(): Headers {
  const [, init] = mocks.fetchApiBridge.mock.calls[0] as [
    string,
    { headers: HeadersInit },
  ]
  return new Headers(init.headers)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.hasEstablishedSession.mockResolvedValue(false)
  mocks.fetchApiBridge.mockResolvedValue(sessionResponse())
})

describe('social sign-in callback', () => {
  describe('app credential', () => {
    // Regression: the route read `API_876_KEY`, the consumer app's variable
    // name, which is unset for Billing in every environment. The exchange went
    // out with no X-876-API-Key, the API rejected it, and every Google sign-in
    // bounced to /login?authError=auth/oauth-failed while password sign-in —
    // which goes through the /api/auth bridge and its own correctly named key —
    // kept working.
    it("sends Billing's own app key on the code exchange", async () => {
      await GET(createRequest('?code=01JQ2ZK9'))

      expect(mocks.fetchApiBridge).toHaveBeenCalledTimes(1)
      expect(mocks.fetchApiBridge.mock.calls[0][0]).toBe('/auth/callback')
      expect(exchangeHeaders().get('X-876-API-Key')).toBe('876_app_secret_test')
    })

    it('posts the authorization code as JSON', async () => {
      await GET(createRequest('?code=01JQ2ZK9'))

      const [, init] = mocks.fetchApiBridge.mock.calls[0] as [
        string,
        { method: string; body: string },
      ]
      expect(init.method).toBe('POST')
      expect(exchangeHeaders().get('Content-Type')).toBe('application/json')
      expect(JSON.parse(init.body)).toMatchObject({ code: '01JQ2ZK9' })
    })
  })

  describe('success', () => {
    it('redirects into the app and forwards the session cookie', async () => {
      const response = await GET(createRequest('?code=01JQ2ZK9'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(`${ORIGIN}/`)
      expect(response.headers.getSetCookie()).toContain(
        '876-session=sealed.value; Path=/; HttpOnly; SameSite=Lax'
      )
    })
  })

  describe('failure', () => {
    it('reports oauth-failed when the exchange is rejected', async () => {
      mocks.fetchApiBridge.mockResolvedValue(
        new Response('{}', { status: 401 })
      )

      const response = await GET(createRequest('?code=01JQ2ZK9'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-failed`
      )
    })

    it('reports oauth-cancelled when the provider was declined', async () => {
      const response = await GET(createRequest('?error=access_denied'))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-cancelled`
      )
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('reports missing-code when no code arrives', async () => {
      const response = await GET(createRequest(''))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Fmissing-code`
      )
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('continues into the app when a session is already established', async () => {
      mocks.hasEstablishedSession.mockResolvedValue(true)

      const response = await GET(createRequest(''))

      expect(response.headers.get('location')).toBe(`${ORIGIN}/`)
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })
  })
})
