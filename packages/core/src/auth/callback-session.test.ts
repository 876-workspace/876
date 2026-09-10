import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  establishedSessionUserId,
  hasEstablishedSession,
  sessionCookieName,
} from './callback-session'

const SECRET = 'test-session-cookie-secret-at-least-32-chars'

/**
 * Seals a cookie exactly the way the API does, so these tests exercise the real
 * HMAC verification rather than a stub of it.
 */
async function seal(payload: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(payload)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(json)
  )
  const hex = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return Buffer.from(`${json}.${hex}`, 'utf8')
    .toString('base64url')
    .replace(/=+$/, '')
}

function requestWith(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name]! } : undefined,
    },
  }
}

function futureExpiry(): number {
  return Math.floor(Date.now() / 1000) + 3_600
}

beforeEach(() => {
  vi.stubEnv('SESSION_COOKIE_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sessionCookieName', () => {
  it('defaults to the platform cookie name', () => {
    expect(sessionCookieName()).toBe('876-session')
  })

  it('honours a deployment override', () => {
    vi.stubEnv('SESSION_COOKIE_NAME', '876-session-staging')
    expect(sessionCookieName()).toBe('876-session-staging')
  })
})

describe('hasEstablishedSession', () => {
  it('reports a session for a validly sealed cookie', async () => {
    const cookie = await seal({ userId: 'user_1', exp: futureExpiry() })

    await expect(
      hasEstablishedSession(requestWith({ '876-session': cookie }))
    ).resolves.toBe(true)
  })

  it('reports no session when the cookie is absent', async () => {
    await expect(hasEstablishedSession(requestWith({}))).resolves.toBe(false)
  })

  it('reports no session when the cookie is empty', async () => {
    await expect(
      hasEstablishedSession(requestWith({ '876-session': '' }))
    ).resolves.toBe(false)
  })

  it('reports no session when the signature was made with another secret', async () => {
    const cookie = await seal({ userId: 'user_1', exp: futureExpiry() })
    vi.stubEnv('SESSION_COOKIE_SECRET', 'a-completely-different-secret-value')

    await expect(
      hasEstablishedSession(requestWith({ '876-session': cookie }))
    ).resolves.toBe(false)
  })

  it('reports no session for a forged, unsigned cookie', async () => {
    const forged = Buffer.from(
      `${JSON.stringify({ userId: 'user_1' })}.deadbeef`,
      'utf8'
    ).toString('base64url')

    await expect(
      hasEstablishedSession(requestWith({ '876-session': forged }))
    ).resolves.toBe(false)
  })

  it('reports no session when the cookie has expired', async () => {
    const cookie = await seal({
      userId: 'user_1',
      exp: Math.floor(Date.now() / 1000) - 60,
    })

    await expect(
      hasEstablishedSession(requestWith({ '876-session': cookie }))
    ).resolves.toBe(false)
  })

  it('reports no session when the payload carries no user', async () => {
    const cookie = await seal({ email: 'ada@example.com', exp: futureExpiry() })

    await expect(
      hasEstablishedSession(requestWith({ '876-session': cookie }))
    ).resolves.toBe(false)
  })

  it('reads the cookie name the deployment configured', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', '876-session-staging')
    const cookie = await seal({ userId: 'user_1', exp: futureExpiry() })

    await expect(
      hasEstablishedSession(requestWith({ '876-session-staging': cookie }))
    ).resolves.toBe(true)
    await expect(
      hasEstablishedSession(requestWith({ '876-session': cookie }))
    ).resolves.toBe(false)
  })
})

describe('establishedSessionUserId', () => {
  it('returns the local user ID from a validly sealed cookie', async () => {
    const cookie = await seal({ userId: 'user_1', exp: futureExpiry() })

    await expect(
      establishedSessionUserId(requestWith({ '876-session': cookie }))
    ).resolves.toBe('user_1')
  })

  it('returns null when no valid session is established', async () => {
    await expect(establishedSessionUserId(requestWith({}))).resolves.toBeNull()
  })
})
