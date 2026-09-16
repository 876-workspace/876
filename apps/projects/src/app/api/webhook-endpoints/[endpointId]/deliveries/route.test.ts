import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listDeliveries: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { listWebhookDeliveries: mocks.listDeliveries },
}))

const { GET } = await import('./route')

function context(endpointId: string) {
  return { params: Promise.resolve({ endpointId }) }
}

const delivery = {
  object: 'projects.webhook-delivery',
  id: 'whd_1',
  tenantId: 'prjten_1',
  endpointId: 'whep_1',
  eventId: 'evt_1',
  attempt: 1,
  status: 'delivered',
  responseCode: 200,
  errorCode: null,
  nextAttemptAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.listDeliveries.mockResolvedValue({
    data: {
      object: 'list',
      data: [delivery],
      has_more: false,
      total_count: 1,
      url: '/v1/integration/webhook-deliveries',
    },
    error: null,
  })
})

describe('GET /api/webhook-endpoints/[endpointId]/deliveries', () => {
  it('requires the projects view permission', async () => {
    await GET(new NextRequest('http://localhost/x'), context('whep_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('scopes the log to the decoded endpoint', async () => {
    const response = await GET(
      new NextRequest('http://localhost/x?limit=10'),
      context('whep_1')
    )
    expect(mocks.listDeliveries).toHaveBeenCalledWith({
      endpointId: 'whep_1',
      limit: 10,
    })
    expect(response.status).toBe(200)
  })

  it('rejects an invalid status with 422', async () => {
    const response = await GET(
      new NextRequest('http://localhost/x?status=succeeded'),
      context('whep_1')
    )
    expect(response.status).toBe(422)
    expect(mocks.listDeliveries).not.toHaveBeenCalled()
  })

  it('returns 400 when the service fails', async () => {
    mocks.listDeliveries.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    const response = await GET(new NextRequest('http://localhost/x'), context('whep_1'))
    expect(response.status).toBe(400)
  })
})
