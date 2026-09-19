import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  replay: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/integration', () => ({
  integration: { replayWebhookDelivery: mocks.replay },
}))

const { POST } = await import('./route')

function context(deliveryId: string) {
  return { params: Promise.resolve({ deliveryId }) }
}

const delivery = {
  object: 'projects.webhook-delivery',
  id: 'whd_1',
  endpointId: 'whep_1',
  eventId: 'evt_1',
  status: 'pending',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.replay.mockResolvedValue({ data: delivery, error: null })
})

describe('POST /api/webhook-deliveries/[deliveryId]/replay', () => {
  it('requires the projects edit permission', async () => {
    await POST(new NextRequest('http://localhost/x', { method: 'POST' }), context('whd_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('replays the decoded delivery for the organization', async () => {
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('whd%201')
    )
    expect(mocks.replay).toHaveBeenCalledWith('whd 1', { organizationId: 'org_1' })
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown delivery', async () => {
    mocks.replay.mockResolvedValue({
      data: null,
      error: { code: 'projects/webhook-delivery-not-found', message: 'Missing.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('whd_1')
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 when replay is rejected', async () => {
    mocks.replay.mockResolvedValue({
      data: null,
      error: { code: 'projects/invalid-request', message: 'Bad.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('whd_1')
    )
    expect(response.status).toBe(400)
  })
})
