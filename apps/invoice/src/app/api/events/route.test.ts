import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'
import { POST as POST_INVOICE_EVENT } from '../invoices/[invoiceId]/work/events/route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  create: vi.fn(),
  requireAuthorizedInvoiceWorkContext: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))
vi.mock('@/lib/auth/work-widget-context', () => ({
  requireAuthorizedInvoiceWorkContext:
    mocks.requireAuthorizedInvoiceWorkContext,
}))

const EVENT = {
  object: 'event' as const,
  id: 'event_1',
  title: 'Planning call',
}

function request(body: unknown) {
  return new Request('http://invoice.test/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ events: { create: mocks.create } })
    mocks.create.mockResolvedValue({ data: EVENT, error: null })
    mocks.requireAuthorizedInvoiceWorkContext.mockResolvedValue({
      context: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_1',
        label: 'INV-001',
        url: '/invoices/inv_1',
      },
      response: null,
    })
  })

  it('requires events.create before creating Work events', async () => {
    await POST(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/New_York',
      })
    )

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'events.create'
    )
  })

  it('returns authorization failures before creating a Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        {
          data: null,
          error: { code: 'auth/forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      ),
    })

    const response = await POST(request({}))

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('stamps timed events with the acting user and canonical time fields', async () => {
    const response = await POST(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/New_York',
        description: 'Quarter planning',
        location: 'Conference room',
      })
    )
    const payload = await response.json()

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Planning call',
      calendarId: 'calendar_1',
      allDay: false,
      startAt: 100,
      endAt: 200,
      timeZone: 'America/New_York',
      description: 'Quarter planning',
      location: 'Conference room',
      createdBy: 'user_1',
    })
    expect(payload).toEqual({ data: EVENT, error: null })
  })

  it('preserves exclusive all-day date ranges', async () => {
    await POST(
      request({
        title: 'Conference',
        calendarId: 'calendar_1',
        allDay: true,
        startDate: '2026-09-10',
        endDate: '2026-09-12',
      })
    )

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Conference',
      calendarId: 'calendar_1',
      allDay: true,
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      createdBy: 'user_1',
    })
  })

  it('creates an event against the invoice authorized by the route', async () => {
    await POST_INVOICE_EVENT(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/New_York',
      }),
      { params: Promise.resolve({ invoiceId: 'inv_1' }) }
    )

    expect(mocks.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        context: { service: 'billing', resource: 'invoice', id: 'inv_1' },
      })
    )
  })

  it('rejects browser-owned identity and invalid event ranges', async () => {
    const identityResponse = await POST(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/New_York',
        createdBy: 'user_2',
      })
    )
    const rangeResponse = await POST(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 200,
        endAt: 100,
        timeZone: 'America/New_York',
      })
    )

    expect(identityResponse.status).toBe(422)
    expect(rangeResponse.status).toBe(422)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('sanitizes unknown upstream event failures', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'provider detail' },
    })

    const response = await POST(
      request({
        title: 'Planning call',
        calendarId: 'calendar_1',
        allDay: false,
        startAt: 100,
        endAt: 200,
        timeZone: 'America/New_York',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error.code).toBe('work/invalid-response')
  })
})
