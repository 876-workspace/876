import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  retrieve: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { deliveries: { retrieve: mocks.retrieve } },
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { GET } from './route'

const context = {
  params: Promise.resolve({ id: 'org_target', deliveryId: 'edlv_1' }),
}

const delivery = {
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
  status: 'bounced',
  failureCode: '550',
  failureMessage: 'Mailbox unavailable.',
  queuedAt: 1_788_000_000,
  sentAt: 1_788_000_001,
  deliveredAt: null,
  openedAt: null,
  clickedAt: null,
  bouncedAt: 1_788_000_003,
  complainedAt: null,
  failedAt: null,
  createdAt: 1_788_000_000,
  updatedAt: 1_788_000_003,
} as const

function getRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/deliveries/edlv_1',
    { headers: { 'x-request-id': 'trace_delivery_get' } }
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

describe('Console organization email delivery route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      deliveries: { retrieve: mocks.retrieve },
    })
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
    expect(mocks.retrieve).not.toHaveBeenCalled()
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
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('returns the delivery and audits the customer-identifying read', async () => {
    mocks.retrieve.mockResolvedValue({ data: delivery, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: delivery, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_delivery_get')
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('org_target', 'edlv_1')
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'communications.delivery.viewed',
        appName: '876-console',
        userId: 'user_operator',
        properties: expect.objectContaining({
          organizationId: 'org_target',
          deliveryId: 'edlv_1',
        }),
      })
    )
  })

  it('maps a missing delivery to 404', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/delivery-not-found',
        message: 'Delivery not found.',
      },
    })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/not-found', message: 'Delivery not found.' },
    })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
  })
})
