import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, POST } from './route'
import { POST as POST_INVOICE_TASK } from '../invoices/[invoiceId]/work/tasks/route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  list: vi.fn(),
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

const PAGE = {
  object: 'list' as const,
  data: [],
  has_more: false,
  total_count: 0,
  url: '/v1/organizations/org_1/tasks',
}

const TASK = {
  object: 'task' as const,
  id: 'task_1',
  title: 'Follow up',
  status: 'OPEN' as const,
}

function getRequest(query = '') {
  return new Request(`http://invoice.test/api/tasks${query}`)
}

function postRequest(body: unknown) {
  return new Request('http://invoice.test/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/tasks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({
      tasks: { list: mocks.list, create: mocks.create },
    })
    mocks.list.mockResolvedValue({ data: PAGE, error: null })
    mocks.create.mockResolvedValue({ data: TASK, error: null })
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

  it('requires tasks.view before reading Work tasks', async () => {
    await GET(getRequest())

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith('tasks.view')
  })

  it('returns read access failures before creating a Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        {
          data: null,
          error: { code: 'auth/forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      ),
    })

    const response = await GET(getRequest())

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('always scopes task reads to the acting user with a bounded page size', async () => {
    const response = await GET(getRequest())
    const payload = await response.json()

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      assigneeId: 'user_1',
      limit: 25,
    })
    expect(response.status).toBe(200)
    expect(payload).toEqual({ data: PAGE, error: null })
  })

  it('accepts an optional canonical task-list filter', async () => {
    await GET(getRequest('?listId=list_1'))

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      assigneeId: 'user_1',
      listId: 'list_1',
      limit: 25,
    })
  })

  it('forwards an item-id cursor for task load more', async () => {
    await GET(getRequest('?listId=list_1&startingAfter=task_25'))

    expect(mocks.list).toHaveBeenCalledWith('org_1', {
      assigneeId: 'user_1',
      listId: 'list_1',
      startingAfter: 'task_25',
      limit: 25,
    })
  })

  it('rejects blank list and cursor filters', async () => {
    const listResponse = await GET(getRequest('?listId=%20%20'))
    const cursorResponse = await GET(getRequest('?startingAfter=%20%20'))

    expect(listResponse.status).toBe(422)
    expect(cursorResponse.status).toBe(422)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('requires tasks.create for task creation', async () => {
    await POST(postRequest({ title: 'Follow up' }))

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'tasks.create'
    )
  })

  it('stamps and forwards a canonical task create payload', async () => {
    const response = await POST(
      postRequest({
        title: 'Follow up',
        listId: 'list_1',
        description: 'Call the customer',
        importance: 'HIGH',
        due: { at: 200, timeZone: 'America/New_York' },
      })
    )
    const payload = await response.json()

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Follow up',
      listId: 'list_1',
      description: 'Call the customer',
      importance: 'HIGH',
      dueAt: 200,
      dueTimeZone: 'America/New_York',
      assigneeId: 'user_1',
      createdBy: 'user_1',
    })
    expect(payload).toEqual({ data: TASK, error: null })
  })

  it('creates an invoice task with its trusted legacy context and canonical link', async () => {
    const response = await POST_INVOICE_TASK(
      postRequest({ title: 'Follow up' }),
      { params: Promise.resolve({ invoiceId: 'inv_1' }) }
    )

    expect(mocks.requireAuthorizedInvoiceWorkContext).toHaveBeenCalledWith(
      'inv_1',
      { response: null, orgId: 'org_1', userId: 'user_1' }
    )
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Follow up',
      context: { service: 'billing', resource: 'invoice', id: 'inv_1' },
      primaryLink: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_1',
        label: 'INV-001',
        url: '/invoices/inv_1',
        isPrimary: true,
      },
      assigneeId: 'user_1',
      createdBy: 'user_1',
    })
    expect(response.status).toBe(200)
  })

  it('rejects browser-owned identity fields during creation', async () => {
    const response = await POST(
      postRequest({ title: 'Follow up', assigneeId: 'user_2' })
    )
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.error.code).toBe('work/invalid-request')
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('sanitizes unknown upstream failures', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'provider detail' },
    })

    const response = await GET(getRequest())
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error).toEqual({
      code: 'work/invalid-response',
      message: 'Work API returned an invalid response.',
    })
  })
})
