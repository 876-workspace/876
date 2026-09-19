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
vi.mock('@/lib/clients/crm', () => ({
  crm: { requestReminders: { list: mocks.list, create: mocks.create } },
}))

const URL_ = 'http://localhost/api/requests/crm_req_1042/reminders'
const ROUTE = { params: Promise.resolve({ requestId: 'crm_req_1042' }) }
function postRequest(body: unknown) {
  return new NextRequest(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/requests/[requestId]/reminders', () => {
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
        url: URL_,
      },
      error: null,
    })
    mocks.create.mockResolvedValue({
      data: { object: 'request_reminder', id: 'crm_rem_3' },
      error: null,
    })
  })

  describe('GET', () => {
    it('returns the org-scoped reminder list', async () => {
      const response = await GET(new NextRequest(URL_), ROUTE)
      expect(response.status).toBe(200)
      expect(mocks.list).toHaveBeenCalledWith('org_island_123', 'crm_req_1042')
    })
    it('answers 401 and never reaches the service without a session', async () => {
      mocks.getCrmApiContext.mockResolvedValue(null)
      const response = await GET(new NextRequest(URL_), ROUTE)
      expect(response.status).toBe(401)
      expect(mocks.list).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('defaults the reminded member to the signed-in session', async () => {
      const response = await POST(
        postRequest({ title: 'Chase the courier', remindAt: 1_788_600_000 }),
        ROUTE
      )
      expect(response.status).toBe(201)
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        {
          title: 'Chase the courier',
          remindAt: 1_788_600_000,
          userId: 'user_session_123',
          createdBy: 'user_session_123',
        }
      )
    })
    it('keeps an explicit userId so a reminder can be set for a colleague', async () => {
      await POST(
        postRequest({
          title: 'Chase the courier',
          remindAt: 1_788_600_000,
          userId: 'user_dario_456',
        }),
        ROUTE
      )
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        {
          title: 'Chase the courier',
          remindAt: 1_788_600_000,
          userId: 'user_dario_456',
          createdBy: 'user_session_123',
        }
      )
    })
    it('ignores a body-supplied createdBy value', async () => {
      await POST(
        postRequest({
          title: 'Chase the courier',
          remindAt: 1_788_600_000,
          createdBy: 'user_attacker_999',
        }),
        ROUTE
      )
      expect(mocks.create).toHaveBeenCalledWith(
        'org_island_123',
        'crm_req_1042',
        {
          title: 'Chase the courier',
          remindAt: 1_788_600_000,
          userId: 'user_session_123',
          createdBy: 'user_session_123',
        }
      )
    })
    it.each([
      ['a missing title', { remindAt: 1_788_600_000 }],
      ['a whitespace-only title', { title: '  ', remindAt: 1_788_600_000 }],
    ])('rejects %s without calling the service', async (_label, body) => {
      const response = await POST(postRequest(body), ROUTE)
      expect(response.status).toBe(400)
      expect(mocks.create).not.toHaveBeenCalled()
    })
    it.each([
      ['a missing remindAt', { title: 'Chase the courier' }],
      ['a non-numeric remindAt', { title: 'Chase', remindAt: 'tomorrow' }],
      ['a null remindAt', { title: 'Chase', remindAt: null }],
    ])('rejects %s without calling the service', async (_label, body) => {
      const response = await POST(postRequest(body), ROUTE)
      expect(response.status).toBe(400)
      expect(mocks.create).not.toHaveBeenCalled()
    })
    it('maps a missing request to 404', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: { code: 'crm/request-not-found', message: 'Request not found.' },
      })
      const response = await POST(
        postRequest({ title: 'Chase', remindAt: 1_788_600_000 }),
        ROUTE
      )
      expect(response.status).toBe(404)
    })
    it('answers 401 and never reaches the service without a session', async () => {
      mocks.getCrmApiContext.mockResolvedValue(null)
      const response = await POST(
        postRequest({ title: 'Chase', remindAt: 1_788_600_000 }),
        ROUTE
      )
      expect(response.status).toBe(401)
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })
})
