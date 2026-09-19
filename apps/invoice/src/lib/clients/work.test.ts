import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getAuthSession: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('@876/work/session', () => ({
  create876WorkSessionClient: mocks.createClient,
}))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: { user?: unknown }) => Boolean(session.user),
}))
vi.mock('next/headers', () => ({ headers: mocks.headers }))

import { getWork } from './work'

describe('getWork', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('WORK_API_URL', 'https://work.example.com')
    vi.stubEnv('INVOICE_API_876_KEY', '876_app_secret_invoice')
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_1' },
      accessToken: 'user_access_token',
    })
    mocks.headers.mockResolvedValue(new Headers({ 'x-request-id': 'req_123' }))
    mocks.createClient.mockReturnValue({ myWork: {} })
  })

  it('uses Invoice app authority plus the signed-in bearer token', async () => {
    const client = await getWork()

    expect(mocks.createClient).toHaveBeenCalledWith({
      baseUrl: 'https://work.example.com',
      apiKey: '876_app_secret_invoice',
      accessToken: 'user_access_token',
      requestId: 'req_123',
    })
    expect(client).toEqual({ myWork: {} })
  })

  it('does not substitute operator authority when no signed session exists', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null })

    await getWork()

    expect(mocks.createClient).toHaveBeenCalledWith({
      baseUrl: 'https://work.example.com',
      apiKey: '876_app_secret_invoice',
      accessToken: undefined,
      requestId: 'req_123',
    })
  })
})
