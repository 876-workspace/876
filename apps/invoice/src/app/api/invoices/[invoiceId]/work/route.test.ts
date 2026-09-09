import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  requireAuthorizedInvoiceWorkContext: vi.fn(),
  getWork: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/auth/work-widget-context', () => ({
  requireAuthorizedInvoiceWorkContext:
    mocks.requireAuthorizedInvoiceWorkContext,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))

const AUTH = { response: null, orgId: 'org_1', userId: 'user_1' }
const CONTEXT = {
  service: 'billing',
  resource: 'invoice',
  externalId: 'inv_1',
  label: 'INV-001',
  url: '/invoices/inv_1',
}
const WORK = {
  object: 'resource_work',
  organizationId: 'org_1',
  context: CONTEXT,
  from: 100,
  to: 200,
  tasks: [],
  reminders: [],
  events: [],
  overdueTasks: [],
}

const routeContext = {
  params: Promise.resolve({ invoiceId: 'inv_1' }),
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireWorkWidgetPermission.mockResolvedValue(AUTH)
  mocks.requireAuthorizedInvoiceWorkContext.mockResolvedValue({
    context: CONTEXT,
    response: null,
  })
  mocks.getWork.mockResolvedValue({
    resourceWork: { retrieve: mocks.retrieve },
  })
  mocks.retrieve.mockResolvedValue({ data: WORK, error: null })
})

describe('GET /api/invoices/:invoiceId/work', () => {
  it('requires every aggregate resource permission and exact invoice access', async () => {
    await GET(
      new Request(
        'https://invoice.test/api/invoices/inv_1/work?from=100&to=200'
      ),
      routeContext
    )

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith([
      'tasks.view',
      'reminders.view',
      'events.view',
    ])
    expect(mocks.requireAuthorizedInvoiceWorkContext).toHaveBeenCalledWith(
      'inv_1',
      AUTH
    )
  })

  it('returns the upstream resource-work envelope', async () => {
    const response = await GET(
      new Request(
        'https://invoice.test/api/invoices/inv_1/work?from=100&to=200'
      ),
      routeContext
    )

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', {
      from: 100,
      to: 200,
      context: CONTEXT,
    })
    await expect(response.json()).resolves.toEqual({ data: WORK, error: null })
  })

  it('stops before host and Work access when aggregate permission fails', async () => {
    const response = Response.json(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    )
    mocks.requireWorkWidgetPermission.mockResolvedValue({ response })

    expect(
      await GET(
        new Request(
          'https://invoice.test/api/invoices/inv_1/work?from=100&to=200'
        ),
        routeContext
      )
    ).toBe(response)
    expect(mocks.requireAuthorizedInvoiceWorkContext).not.toHaveBeenCalled()
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('rejects invalid and oversized windows before Work access', async () => {
    const invalid = await GET(
      new Request(
        'https://invoice.test/api/invoices/inv_1/work?from=200&to=100'
      ),
      routeContext
    )
    const oversized = await GET(
      new Request(
        'https://invoice.test/api/invoices/inv_1/work?from=0&to=5356801'
      ),
      routeContext
    )

    expect(invalid.status).toBe(422)
    expect(oversized.status).toBe(422)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('preserves a recognized upstream error envelope', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'work/tenant-not-found',
        message: 'This organization has no Work workspace yet.',
      },
    })

    const response = await GET(
      new Request(
        'https://invoice.test/api/invoices/inv_1/work?from=100&to=200'
      ),
      routeContext
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'work/tenant-not-found',
        message: 'This organization has no Work workspace yet.',
      },
    })
  })
})
