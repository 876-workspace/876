import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { DELETE, PATCH } from './[assignmentId]/route'

const mocks = vi.hoisted(() => ({
  context: vi.fn(), manager: vi.fn(), workspace: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
}))
vi.mock('@/lib/auth/billing-context', () => ({ getWorkspaceContext: mocks.context }))
vi.mock('@/lib/auth/app-access', () => ({ requireAppAccessManager: mocks.manager, getBillingWorkspace: mocks.workspace }))
const route = { params: Promise.resolve({ assignmentId: 'assign_1' }) }
const request = (method: string, body?: unknown) => new Request('http://localhost/api/app-memberships', { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
const success = { data: { object: 'app_membership', id: 'assign_1' }, error: null }
const deleted = { data: { object: 'app_membership', id: 'assign_1', deleted: true }, error: null }
describe('Billing app membership routes', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.context.mockResolvedValue({ orgId: 'org_1' }); mocks.manager.mockResolvedValue({ orgId: 'org_1', response: null }); mocks.workspace.mockResolvedValue({ appMemberships: { create: mocks.create, update: mocks.update, delete: mocks.remove } }); mocks.create.mockResolvedValue(success); mocks.update.mockResolvedValue(success); mocks.remove.mockResolvedValue(deleted)
  })
  it('returns 401 with a null data envelope when unauthenticated', async () => { mocks.context.mockResolvedValue(null); const response = await POST(request('POST', {})); expect(response.status).toBe(401); await expect(response.json()).resolves.toEqual({ data: null, error: { code: 'billing/unauthorized', message: 'Unauthorized.' } }); expect(mocks.workspace).not.toHaveBeenCalled() })
  it('returns 403 with a null data envelope when unauthorized', async () => { mocks.manager.mockResolvedValue({ orgId: null, response: Response.json({ data: null, error: { code: 'billing/forbidden', message: 'Denied.' } }, { status: 403 }) }); const response = await POST(request('POST', {})); expect(response.status).toBe(403); await expect(response.json()).resolves.toEqual({ data: null, error: { code: 'billing/forbidden', message: 'Denied.' } }); expect(mocks.workspace).not.toHaveBeenCalled() })
  it('returns 400 for an invalid create body', async () => { const response = await POST(request('POST', { app_id: '' })); expect(response.status).toBe(400); await expect(response.json()).resolves.toEqual({ data: null, error: { code: 'billing/invalid-request', message: 'Invalid request body.' } }); expect(mocks.create).not.toHaveBeenCalled() })
  it('creates one assignment with exact arguments', async () => { const response = await POST(request('POST', { membership_id: 'mem_1', app_id: 'app_1', app_role_id: 'role_1' })); expect(response.status).toBe(201); await expect(response.json()).resolves.toEqual(success); expect(mocks.create).toHaveBeenCalledWith('org_1', { membership_id: 'mem_1', app_id: 'app_1', app_role_id: 'role_1' }); expect(mocks.create).toHaveBeenCalledTimes(1) })
  it('returns the create service error envelope without throwing', async () => { const error = { data: null, error: { code: 'core/unavailable', message: 'Unavailable' } }; mocks.create.mockResolvedValue(error); const response = await POST(request('POST', { app_id: 'app_1' })); expect(response.status).toBe(502); await expect(response.json()).resolves.toEqual(error); expect(mocks.create).toHaveBeenCalledWith('org_1', { app_id: 'app_1' }) })
  it('returns 400 and never updates for an invalid patch body', async () => { const response = await PATCH(request('PATCH', { app_role_id: '' }), route); expect(response.status).toBe(400); await expect(response.json()).resolves.toMatchObject({ data: null, error: { code: 'billing/invalid-request' } }); expect(mocks.update).not.toHaveBeenCalled() })
  it('updates one assignment with exact arguments', async () => { const response = await PATCH(request('PATCH', { app_role_id: 'role_2' }), route); expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual(success); expect(mocks.update).toHaveBeenCalledWith('org_1', 'assign_1', { app_role_id: 'role_2' }); expect(mocks.update).toHaveBeenCalledTimes(1) })
  it('returns 403 and never updates after a guard failure', async () => { mocks.manager.mockResolvedValue({ orgId: null, response: new Response(JSON.stringify({ data: null, error: { code: 'billing/forbidden', message: 'Denied.' } }), { status: 403 }) }); const response = await PATCH(request('PATCH', { app_role_id: 'role_2' }), route); expect(response.status).toBe(403); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.workspace).not.toHaveBeenCalled() })
  it('deletes one assignment with exact arguments and both result fields', async () => { const response = await DELETE(request('DELETE'), route); expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual(deleted); expect(mocks.remove).toHaveBeenCalledWith('org_1', 'assign_1'); expect(mocks.remove).toHaveBeenCalledTimes(1) })
  it('returns the delete service error envelope without throwing', async () => { const error = { data: null, error: { code: 'core/unavailable', message: 'Unavailable' } }; mocks.remove.mockResolvedValue(error); const response = await DELETE(request('DELETE'), route); expect(response.status).toBe(502); await expect(response.json()).resolves.toEqual(error); expect(mocks.remove).toHaveBeenCalledWith('org_1', 'assign_1') })
})
