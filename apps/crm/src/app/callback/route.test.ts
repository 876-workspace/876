import { NextRequest } from 'next/server'

import { GET } from './route'

const mocks = vi.hoisted(() => ({
  fetchApiBridge: vi.fn(),
  hasEstablishedSession: vi.fn(),
}))

vi.mock('@876/core/fetch/bridge', async () => {
  const actual =
    await vi.importActual<typeof import('@876/core/fetch/bridge')>(
      '@876/core/fetch/bridge'
    )
  return { ...actual, fetchApiBridge: mocks.fetchApiBridge }
})

vi.mock('@876/core/auth/callback-session', () => ({
  hasEstablishedSession: mocks.hasEstablishedSession,
}))

const ORIGIN = 'https://crm.876.test'

function createRequest(
  search: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const headers = new Headers({ host: 'crm.876.test' })
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
  if (cookieHeader) headers.set('cookie', cookieHeader)

  return new NextRequest(`${ORIGIN}/callback${search}`, { headers })
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

beforeEach(() => {
  mocks.hasEstablishedSession.mockResolvedValue(false)
  mocks.fetchApiBridge.mockResolvedValue(sessionResponse())
})

describe('GET /callback', () => {
  describe('happy path', () => {
    it('exchanges the code and forwards the session cookie to the app', async () => {
      const response = await GET(createRequest('?code=auth_code_1'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/complete`)
      expect(response.headers.getSetCookie()).toContain(
        '876-session=sealed.value; Path=/; HttpOnly; SameSite=Lax'
      )
      expect(mocks.fetchApiBridge).toHaveBeenCalledTimes(1)
    })

    it('exchanges the code in the enterprise realm', async () => {
      await GET(createRequest('?code=auth_code_1'))

      const [path, init] = mocks.fetchApiBridge.mock.calls[0] as [
        string,
        { headers: Record<string, string>; body: string },
      ]
      expect(path).toBe('/auth/callback')
      expect(init.headers['X-876-Realm']).toBe('enterprise')
      expect(JSON.parse(init.body)).toMatchObject({ code: 'auth_code_1' })
    })

    it('honours the return-to cookie the login page set', async () => {
      const response = await GET(
        createRequest('?code=auth_code_1', {
          efesto_auth_return_to: encodeURIComponent('/requests'),
        })
      )

      expect(response.headers.get('location')).toBe(`${ORIGIN}/requests`)
    })

    it('clears the return-to cookie once it has been consumed', async () => {
      const response = await GET(
        createRequest('?code=auth_code_1', {
          efesto_auth_return_to: encodeURIComponent('/requests'),
        })
      )

      expect(response.headers.getSetCookie()).toContain(
        'efesto_auth_return_to=; Path=/; Max-Age=0; SameSite=Lax'
      )
    })
  })

  describe('duplicate requests (the mobile failure)', () => {
    it('sends an already-signed-in visitor into the app without spending a code', async () => {
      mocks.hasEstablishedSession.mockResolvedValue(true)

      const response = await GET(createRequest('?code=auth_code_1'))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/complete`)
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('does not bounce an already-signed-in visitor to login when the code is gone', async () => {
      mocks.hasEstablishedSession.mockResolvedValue(true)

      const response = await GET(createRequest(''))

      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/complete`)
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('still honours the return-to cookie on the duplicate request', async () => {
      mocks.hasEstablishedSession.mockResolvedValue(true)

      const response = await GET(
        createRequest('?code=auth_code_1', {
          efesto_auth_return_to: encodeURIComponent('/customers'),
        })
      )

      expect(response.headers.get('location')).toBe(`${ORIGIN}/customers`)
    })
  })

  describe('failures', () => {
    it('reports a cancelled sign-in when the provider returns access_denied', async () => {
      const response = await GET(createRequest('?error=access_denied'))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-cancelled`
      )
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('reports a failed sign-in for any other provider error', async () => {
      const response = await GET(createRequest('?error=server_error'))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-failed`
      )
    })

    it('reports a missing code when no session exists yet', async () => {
      const response = await GET(createRequest(''))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Fmissing-code`
      )
      expect(mocks.fetchApiBridge).not.toHaveBeenCalled()
    })

    it('reports a failed sign-in when the API rejects the code', async () => {
      mocks.fetchApiBridge.mockResolvedValue(
        new Response('{}', { status: 401 })
      )

      const response = await GET(createRequest('?code=spent_code'))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-failed`
      )
      expect(response.headers.getSetCookie()).not.toContain(
        '876-session=sealed.value; Path=/; HttpOnly; SameSite=Lax'
      )
    })

    it('reports a failed sign-in when the bridge throws', async () => {
      mocks.fetchApiBridge.mockRejectedValue(new Error('socket hang up'))

      const response = await GET(createRequest('?code=auth_code_1'))

      expect(response.headers.get('location')).toBe(
        `${ORIGIN}/login?authError=auth%2Foauth-failed`
      )
    })

    it('carries the intended destination through to the retried sign-in', async () => {
      mocks.fetchApiBridge.mockResolvedValue(
        new Response('{}', { status: 401 })
      )

      const response = await GET(
        createRequest('?code=spent_code', {
          efesto_auth_return_to: encodeURIComponent('/requests'),
        })
      )

      const location = new URL(response.headers.get('location') ?? '')
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('authError')).toBe('auth/oauth-failed')
      expect(location.searchParams.get('returnTo')).toBe('/requests')
    })

    it('ignores an off-site return-to cookie', async () => {
      const response = await GET(
        createRequest('?code=auth_code_1', {
          efesto_auth_return_to: encodeURIComponent('https://evil.example.com'),
        })
      )

      expect(response.headers.get('location')).toBe(`${ORIGIN}/auth/complete`)
    })
  })
})
