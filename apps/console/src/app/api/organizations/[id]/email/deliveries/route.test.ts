import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  list: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/clients/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { deliveries: { list: mocks.list } },
}))

vi.mock('@/lib/clients/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { GET } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const deliveryList = {
  object: 'list',
  data: [
    {
      object: 'email_delivery',
      id: 'edlv_1',
      organizationId: 'org_target',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      templateId: null,
      senderId: 'esnd_1',
      provider: 'resend',
      providerMessageId: 're_1',
      idempotencyKey: 'invoice:inv_1:send:1',
      fromName: 'Billing',
      fromEmail: 'billing@mail.87six.dev',
      replyTo: null,
      to: [{ email: 'customer@example.com' }],
      cc: [],
      bcc: [],
      subject: 'Invoice INV-0042',
      status: 'delivered',
      failureCode: null,
      failureMessage: null,
      queuedAt: 1_788_000_000,
      sentAt: 1_788_000_001,
      deliveredAt: 1_788_000_002,
      openedAt: null,
      clickedAt: null,
      bouncedAt: null,
      complainedAt: null,
      failedAt: null,
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_002,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_target/email/deliveries',
} as const

function getRequest(query = '') {
  return new NextRequest(
    `http://console.test/api/organizations/org_target/email/deliveries${query}`,
    { headers: { 'x-request-id': 'trace_deliveries_list' } }
  )
}

function denied(status: number) {
  return Response.json(
    {
      data: null,
      error: {
        code: status === 401 ? 'error/unauthorized' : 'error/forbidden',
        message: status === 401 ? 'Unauthorized.' : 'Forbidden.',
      },
    },
    { status }
  )
}

describe('Console organization email deliveries route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({ deliveries: { list: mocks.list } })
    mocks.auditCreate.mockResolvedValue({ data: { id: 'audit_1' } })
  })

  it('denies a request lacking the permission with a 403 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(403) })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/forbidden', message: 'Forbidden.' },
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('denies an unauthenticated request with a 401 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(401) })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/unauthorized', message: 'Unauthorized.' },
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('returns the canonical envelope and audits the customer-identifying read', async () => {
    mocks.list.mockResolvedValue({ data: deliveryList, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: deliveryList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_deliveries_list')
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_target', {})
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'communications.deliveries.viewed',
        appName: '876-console',
        userId: 'user_operator',
        properties: expect.objectContaining({ organizationId: 'org_target' }),
      })
    )
  })

  it('forwards a valid limit to the operator client', async () => {
    mocks.list.mockResolvedValue({ data: deliveryList, error: null })

    const response = await GET(getRequest('?limit=25'), context)

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_target', { limit: 25 })
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
  })

  it('returns the service failure message without leaking the service', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/unavailable',
        message: 'Try again later.',
      },
    })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Try again later.' },
    })
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
  })
})
