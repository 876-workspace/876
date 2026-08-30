import { NextRequest } from 'next/server'

import { GET, POST } from './route'

const mocks = vi.hoisted(() => ({
  getCrmApiContext: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))
vi.mock('@/lib/auth/api-context', () => ({
  getCrmApiContext: mocks.getCrmApiContext,
}))
vi.mock('@/lib/services/crm', () => ({
  crm: { requestTasks: { list: mocks.list, create: mocks.create } },
}))

const ROUTE = { params: Promise.resolve({ requestId: 'crm_req_1042' }) }
function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/requests/crm_req_1042/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function getRequest() {
  return new NextRequest('http://localhost/api/requests/crm_req_1042/tasks')
}
function createTaskResult() {
  return {
    data: {
      object: 'request_task' as const,
      id: 'crm_task_7',
      tenantId: 'crm_tenant_island',
      requestId: 'crm_req_1042',
      title: 'Call the customer back',
      description: null,
      status: 'OPEN' as const,
      priority: 'NORMAL' as const,
      assigneeId: null,
      dueAt: null,
      completedAt: null,
      completedBy: null,
      sortOrder: 0,
      createdBy: 'user_session_123',
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
      deletedAt: null,
      deletedBy: null,
    },
    error: null,
  }
}

describe('/api/requests/[requestId]/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCrmApiContext.mockResolvedValue({
      orgId: 'org_island_123',
      userId: 'user_session_123',
    })
    mocks.list.mockResolvedValue({
      data: {
        object: 'list' as const,
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_island_123/requests/crm_req_1042/tasks',
      },
      error: null,
    })
    mocks.create.mockResolvedValue(createTaskResult())
  })

  describe('GET', () => {
    it('returns the org-scoped task list', async () => {
      const response = await GET(getRequest(), ROUTE)
      expect(response.status).toBe(200)
      expect((await response.json()).data.data).toEqual([])
      expect(mocks.list).toHaveBeenCalledWith('org_island_123', 'crm_req_1042')
    })
    it('answers 404 when the request is not visible to this org', async () => {
      mocks.list.mockResolvedValue({
        data: null,
        error: { code: 'crm/request-not-found', message: 'Request not found.' },
      })
      const response = await GET(getRequest(), ROUTE)
      expect(response.status).toBe(404)
    })
    it('answers 401 and never reaches the service without a session', async () => {
      mocks.getCrmApiContext.mockResolvedValue(null)
      const response = await GET(getRequest(), ROUTE)
      expect(response.status).toBe(401)
      expect(mocks.list).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('creates the task and stamps createdBy from the session', async () => {
      const response = await POST(
        postRequest({ title: 'Call the customer back', priority: 'HIGH' }),
        ROUTE
      )
      expect(response.status).toBe(201)
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        {
          title: 'Call the customer back',
          priority: 'HIGH',
          createdBy: 'user_session_123',
        }
      )
    })
    it('ignores a body-supplied createdBy value', async () => {
      await POST(
        postRequest({
          title: 'Call the customer back',
          createdBy: 'user_attacker_999',
        }),
        ROUTE
      )
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        { title: 'Call the customer back', createdBy: 'user_session_123' }
      )
    })
    it('trims the title before sending it', async () => {
      await POST(postRequest({ title: '  Call the customer back  ' }), ROUTE)
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        { title: 'Call the customer back', createdBy: 'user_session_123' }
      )
    })
    it.each([
      ['a missing title', {}],
      ['an empty title', { title: '' }],
      ['a whitespace-only title', { title: '   ' }],
    ])('rejects %s without calling the service', async (_label, body) => {
      const response = await POST(postRequest(body), ROUTE)
      expect(response.status).toBe(400)
      expect(mocks.create).not.toHaveBeenCalled()
    })
    it('rejects a malformed JSON body without calling the service', async () => {
      const response = await POST(
        new NextRequest('http://localhost/api/requests/crm_req_1042/tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'not json',
        }),
        ROUTE
      )
      expect(response.status).toBe(400)
      expect(mocks.create).not.toHaveBeenCalled()
    })
    it('answers 401 and never reaches the service without a session', async () => {
      mocks.getCrmApiContext.mockResolvedValue(null)
      const response = await POST(postRequest({ title: 'Anything' }), ROUTE)
      expect(response.status).toBe(401)
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })
})
