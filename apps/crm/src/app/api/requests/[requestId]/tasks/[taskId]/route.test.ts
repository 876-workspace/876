import { NextRequest } from 'next/server'

import { DELETE, PATCH } from './route'

const mocks = vi.hoisted(() => ({ getCrmApiContext: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('@/lib/auth/api-context', () => ({ getCrmApiContext: mocks.getCrmApiContext }))
vi.mock('@/lib/services/crm', () => ({ crm: { requestTasks: { update: mocks.update, delete: mocks.remove } } }))

const URL_ = 'http://localhost/api/requests/crm_req_1042/tasks/crm_task_7'
const ROUTE = { params: Promise.resolve({ requestId: 'crm_req_1042', taskId: 'crm_task_7' }) }
function patchRequest(body: unknown) { return new NextRequest(URL_, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }

describe('/api/requests/[requestId]/tasks/[taskId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCrmApiContext.mockResolvedValue({ orgId: 'org_island_123', userId: 'user_session_123' })
    mocks.update.mockResolvedValue({ data: { id: 'crm_task_7' }, error: null })
    mocks.remove.mockResolvedValue({ data: { object: 'request_task', id: 'crm_task_7', deleted: true }, error: null })
  })

  describe('PATCH', () => {
    it('attributes completion to the signed-in member', async () => {
      const response = await PATCH(patchRequest({ status: 'DONE' }), ROUTE)
      expect(response.status).toBe(200)
      expect(mocks.update).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_task_7', { status: 'DONE', completedBy: 'user_session_123' })
    })
    it('ignores a body-supplied completedBy value', async () => {
      await PATCH(patchRequest({ status: 'DONE', completedBy: 'user_attacker_999' }), ROUTE)
      expect(mocks.update).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_task_7', { status: 'DONE', completedBy: 'user_session_123' })
    })
    it('trims a supplied title', async () => {
      await PATCH(patchRequest({ title: '  Chase the courier  ' }), ROUTE)
      expect(mocks.update).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_task_7', { title: 'Chase the courier', completedBy: 'user_session_123' })
    })
    it('rejects a title that trims to nothing', async () => { const response = await PATCH(patchRequest({ title: '   ' }), ROUTE); expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled() })
    it('rejects an empty patch without calling the service', async () => { const response = await PATCH(patchRequest({}), ROUTE); expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled() })
    it('maps a missing task to 404', async () => { mocks.update.mockResolvedValue({ data: null, error: { code: 'crm/task-not-found', message: 'Request task not found.' } }); const response = await PATCH(patchRequest({ status: 'OPEN' }), ROUTE); expect(response.status).toBe(404) })
    it('answers 401 and never reaches the service without a session', async () => { mocks.getCrmApiContext.mockResolvedValue(null); const response = await PATCH(patchRequest({ status: 'DONE' }), ROUTE); expect(response.status).toBe(401); expect(mocks.update).not.toHaveBeenCalled() })
  })

  describe('DELETE', () => {
    it('attributes the deletion to the signed-in member', async () => {
      const response = await DELETE(new NextRequest(URL_, { method: 'DELETE' }), ROUTE)
      expect(response.status).toBe(200)
      expect(mocks.remove).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_task_7', { deletedBy: 'user_session_123' })
    })
    it('answers 401 and never reaches the service without a session', async () => { mocks.getCrmApiContext.mockResolvedValue(null); const response = await DELETE(new NextRequest(URL_, { method: 'DELETE' }), ROUTE); expect(response.status).toBe(401); expect(mocks.remove).not.toHaveBeenCalled() })
  })
})
