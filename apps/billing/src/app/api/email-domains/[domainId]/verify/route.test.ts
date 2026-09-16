import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.context,
}))
vi.mock('@/lib/services/communications', () => ({
  communicationsService: () => ({
    domains: { verify: mocks.verify },
  }),
}))

import { POST } from './route'

function contextFor(domainId: string) {
  return { params: Promise.resolve({ domainId }) } as never
}

describe('Billing email-domain verify BFF', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects unauthenticated requests', async () => {
    mocks.context.mockResolvedValue(null)

    const response = await POST(
      new Request('http://billing.test') as never,
      contextFor('dom_1')
    )

    expect(response.status).toBe(401)
    expect(mocks.verify).not.toHaveBeenCalled()
  })

  it('rejects an empty domain id without calling the service', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_1' })

    const response = await POST(
      new Request('http://billing.test') as never,
      contextFor('')
    )

    expect(response.status).toBe(400)
    expect(mocks.verify).not.toHaveBeenCalled()
  })

  it('verifies the domain for the session organization', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_server' })
    mocks.verify.mockResolvedValue({
      data: { id: 'dom_1', status: 'pending' },
      error: null,
    })

    const response = await POST(
      new Request('http://billing.test') as never,
      contextFor('dom_1')
    )

    expect(response.status).toBe(200)
    expect(mocks.verify).toHaveBeenCalledWith('org_server', 'dom_1')
  })

  it('surfaces a service failure without leaking internals', async () => {
    mocks.context.mockResolvedValue({ orgId: 'org_1' })
    mocks.verify.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Try again.' },
    })

    const response = await POST(
      new Request('http://billing.test') as never,
      contextFor('dom_1')
    )

    expect(response.status).toBe(502)
    const body = (await response.json()) as {
      data: null
      error: { code: string }
    }
    expect(body.data).toBeNull()
    expect(body.error.code).toBeTruthy()
  })
})
