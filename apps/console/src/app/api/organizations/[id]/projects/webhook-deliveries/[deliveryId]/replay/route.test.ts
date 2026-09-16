import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  replay: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/projects', () => ({
  createProjects: mocks.createClient,
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { POST } from './route'

const context = {
  params: Promise.resolve({ id: 'org_1', deliveryId: 'whdl_1' }),
}

function replayRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_1/projects/webhook-deliveries/whdl_1/replay',
    {
      method: 'POST',
      headers: { 'x-request-id': 'trace_replay' },
    }
  )
}

const replayed = {
  object: 'projects.webhook-delivery',
  id: 'whdl_1',
  tenantId: 'prjten_1',
  endpointId: 'whep_1',
  eventId: 'evt_1',
  attempt: 3,
  status: 'pending',
  responseCode: null,
  errorCode: null,
  nextAttemptAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000001,
}

describe('Console webhook delivery replay route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { userId: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      webhookEndpoints: { replay: mocks.replay },
    })
    mocks.replay.mockResolvedValue({ data: replayed, error: null })
    mocks.auditCreate.mockResolvedValue({ data: { id: 'audit_1' } })
  })

  it('denies replay without the Console permission and touches nothing else', async () => {
    const denied = Response.json(
      { error: 'Insufficient permissions.' },
      { status: 403 }
    )
    mocks.requirePermission.mockResolvedValue({ response: denied })

    const response = await POST(replayRequest(), context)

    expect(response.status).toBe(403)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
    expect(mocks.replay).not.toHaveBeenCalled()
  })

  it('writes the audit event before calling the operator client', async () => {
    const response = await POST(replayRequest(), context)

    expect(response.status).toBe(200)
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'projects.webhook-delivery.replayed',
        appName: '876-console',
        properties: expect.objectContaining({
          organizationId: 'org_1',
          deliveryId: 'whdl_1',
        }),
      })
    )
    expect(mocks.replay).toHaveBeenCalledWith('whdl_1', {
      organizationId: 'org_1',
    })
    expect(mocks.createClient).toHaveBeenCalledWith('trace_replay')
    const auditOrder = mocks.auditCreate.mock.invocationCallOrder[0]
    const replayOrder = mocks.replay.mock.invocationCallOrder[0]
    expect(auditOrder).toBeLessThan(replayOrder)
  })

  it('calls the operator client exactly once on success', async () => {
    const response = await POST(replayRequest(), context)
    const payload = (await response.json()) as {
      data: unknown
      error: unknown
    }

    expect(payload.data).toEqual(replayed)
    expect(mocks.replay).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when replay fails', async () => {
    mocks.replay.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    const response = await POST(replayRequest(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'boom' },
    })
  })

  it('returns 404 for a missing delivery', async () => {
    mocks.replay.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/webhook-delivery-not-found',
        message: 'Missing.',
      },
    })

    const response = await POST(replayRequest(), context)

    expect(response.status).toBe(404)
  })
})
