import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.context,
}))
vi.mock('@/lib/services/communications', () => ({
  communicationsService: () => ({
    domains: { create: mocks.create },
  }),
}))

import { POST } from './route'

function post(body: unknown) {
  return new Request('http://billing.test/api/email-domains', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('Billing email-domains BFF', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects unauthenticated requests', async () => {
    mocks.context.mockResolvedValue(null)

    const response = await POST(post({ name: 'mail.example.com' }))

    expect(response.status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid domain name without calling the service', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_1' })

    const response = await POST(post({ name: 'not a domain' }))

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates the domain for the session organization', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_server' })
    mocks.create.mockResolvedValue({
      data: { id: 'dom_1', name: 'mail.example.com' },
      error: null,
    })

    const response = await POST(post({ name: 'mail.example.com' }))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_server', {
      name: 'mail.example.com',
    })
  })

  it('surfaces a service failure without leaking internals', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_1' })
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Try again.' },
    })

    const response = await POST(post({ name: 'mail.example.com' }))

    expect(response.status).toBe(502)
    const body = (await response.json()) as {
      data: null
      error: { code: string }
    }
    expect(body.data).toBeNull()
    expect(body.error.code).toBeTruthy()
  })
})
