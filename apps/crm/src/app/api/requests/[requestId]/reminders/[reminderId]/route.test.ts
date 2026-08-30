import { NextRequest } from 'next/server'

import { DELETE, PATCH } from './route'

const mocks = vi.hoisted(() => ({ getCrmApiContext: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('@/lib/auth/api-context', () => ({ getCrmApiContext: mocks.getCrmApiContext }))
vi.mock('@/lib/services/crm', () => ({ crm: { requestReminders: { update: mocks.update, delete: mocks.remove } } }))

const URL_ = 'http://localhost/api/requests/crm_req_1042/reminders/crm_rem_3'
const ROUTE = { params: Promise.resolve({ requestId: 'crm_req_1042', reminderId: 'crm_rem_3' }) }
function patchRequest(body: unknown) { return new NextRequest(URL_, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }

describe('/api/requests/[requestId]/reminders/[reminderId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCrmApiContext.mockResolvedValue({ orgId: 'org_island_123', userId: 'user_session_123' })
    mocks.update.mockResolvedValue({ data: { id: 'crm_rem_3' }, error: null })
    mocks.remove.mockResolvedValue({ data: { object: 'request_reminder', id: 'crm_rem_3', deleted: true }, error: null })
  })

  describe('PATCH', () => {
    it('forwards a status change to the service', async () => { const response = await PATCH(patchRequest({ status: 'DISMISSED' }), ROUTE); expect(response.status).toBe(200); expect(mocks.update).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_rem_3', { status: 'DISMISSED' }) })
    it('trims a supplied title', async () => { await PATCH(patchRequest({ title: '  Chase again  ' }), ROUTE); expect(mocks.update).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_rem_3', { title: 'Chase again' }) })
    it('rejects a title that trims to nothing', async () => { const response = await PATCH(patchRequest({ title: '  ' }), ROUTE); expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled() })
    it('rejects an empty patch without calling the service', async () => { const response = await PATCH(patchRequest({}), ROUTE); expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled() })
    it('maps a missing reminder to 404', async () => { mocks.update.mockResolvedValue({ data: null, error: { code: 'crm/reminder-not-found', message: 'Request reminder not found.' } }); const response = await PATCH(patchRequest({ status: 'SENT' }), ROUTE); expect(response.status).toBe(404) })
    it('answers 401 and never reaches the service without a session', async () => { mocks.getCrmApiContext.mockResolvedValue(null); const response = await PATCH(patchRequest({ status: 'SENT' }), ROUTE); expect(response.status).toBe(401); expect(mocks.update).not.toHaveBeenCalled() })
  })

  describe('DELETE', () => {
    it('attributes the deletion to the signed-in member', async () => { const response = await DELETE(new NextRequest(URL_, { method: 'DELETE' }), ROUTE); expect(response.status).toBe(200); expect(mocks.remove).toHaveBeenCalledWith('org_island_123', 'crm_req_1042', 'crm_rem_3', { deletedBy: 'user_session_123' }) })
    it('answers 401 and never reaches the service without a session', async () => { mocks.getCrmApiContext.mockResolvedValue(null); const response = await DELETE(new NextRequest(URL_, { method: 'DELETE' }), ROUTE); expect(response.status).toBe(401); expect(mocks.remove).not.toHaveBeenCalled() })
  })
})
