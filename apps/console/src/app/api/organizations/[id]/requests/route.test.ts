import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  requireCrmPermission: vi.fn(),
  createClient: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
  requireConsoleCrmPermission: mocks.requireCrmPermission,
}))

vi.mock('@/lib/876', () => ({
  createConsole876Client: mocks.createClient,
}))

import { GET, POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }
const requestList = {
  object: 'list',
  data: [
    {
      object: 'request',
      id: 'crm_req_1',
      tenantId: 'crm_tenant_1',
      customerId: 'crm_customer_1',
      number: 42,
      subject: 'Delivery address correction',
      categoryId: 'crm_category_1',
      subcategoryId: null,
      status: 'OPEN',
      priority: 'HIGH',
      channel: 'AGENT',
      teamId: 'crm_team_1',
      assigneeId: 'user_assignee',
      ownerId: 'user_owner',
      createdBy: 'user_creator',
      resolvedAt: null,
      closedAt: null,
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_100,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_target/requests',
} as const

function listRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/requests?status=OPEN&teamId=crm_team_1&assigneeId=user_assignee&customerId=crm_customer_1&categoryId=crm_category_1&subcategoryId=crm_subcategory_1&ownerId=user_owner&priority=HIGH',
    { headers: { 'x-request-id': 'trace_requests_list' } }
  )
}

function postRequest(body: BodyInit | null) {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/requests',
    {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'trace_requests_create',
      },
    }
  )
}

describe('Console organization requests route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({ response: null })
    mocks.requireCrmPermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      requests: { list: mocks.list, create: mocks.create },
    })
  })

  it('lists requests with every supported filter through the request-scoped facade', async () => {
    mocks.list.mockResolvedValue({ data: requestList, error: null })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: requestList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_requests_list')
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_target', {
      status: 'OPEN',
      teamId: 'crm_team_1',
      assigneeId: 'user_assignee',
      customerId: 'crm_customer_1',
      categoryId: 'crm_category_1',
      subcategoryId: 'crm_subcategory_1',
      ownerId: 'user_owner',
      priority: 'HIGH',
    })
  })

  it('returns the complete facade error envelope when listing fails', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'crm/unavailable', message: 'CRM is unavailable.' },
    })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'CRM is unavailable.',
      },
    })
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_target', {
      status: 'OPEN',
      teamId: 'crm_team_1',
      assigneeId: 'user_assignee',
      customerId: 'crm_customer_1',
      categoryId: 'crm_category_1',
      subcategoryId: 'crm_subcategory_1',
      ownerId: 'user_owner',
      priority: 'HIGH',
    })
  })

  it('returns the exact permission failure without constructing the facade', async () => {
    const denied = Response.json(
      { error: 'Insufficient permissions.' },
      { status: 403 }
    )
    mocks.requirePermission.mockResolvedValue({ response: denied })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'Insufficient permissions.',
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('rejects an invalid create body before constructing the facade', async () => {
    const response = await POST(postRequest('{'), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Invalid request body.',
      },
    })
    // Creating a request is a CRM capability, so the handler authorizes
    // through the two-gate CRM guard (console:requests, then the caller's
    // CRM effective permission) rather than the console:organizations
    // permission that gated this route before the CRM plane existed.
    expect(mocks.requireCrmPermission).toHaveBeenCalledTimes(1)
    expect(mocks.requireCrmPermission).toHaveBeenCalledWith(
      'org_target',
      'requests.create'
    )
    expect(mocks.requirePermission).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
