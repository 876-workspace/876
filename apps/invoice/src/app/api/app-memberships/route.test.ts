import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { DELETE, PATCH } from './[assignmentId]/route'
const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  requireManager: vi.fn(),
  getWorkspace: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/lib/auth/api-context', () => ({
  getInvoiceApiContext: mocks.getContext,
}))
vi.mock('@/lib/auth/app-access', () => ({
  requireAppAccessManager: mocks.requireManager,
}))
vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: mocks.getWorkspace,
}))
const route = { params: Promise.resolve({ assignmentId: 'assign_1' }) }
function request(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
function success() {
  return { data: { object: 'app_membership', id: 'assign_1' }, error: null }
}
describe('app membership mutation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getContext.mockResolvedValue({ orgId: 'org_1' })
    mocks.requireManager.mockResolvedValue({
      viewer: { canManageAppAccess: true },
      response: null,
    })
    mocks.getWorkspace.mockResolvedValue({
      appMemberships: {
        create: mocks.create,
        update: mocks.update,
        delete: mocks.remove,
      },
    })
    mocks.create.mockResolvedValue(success())
    mocks.update.mockResolvedValue(success())
    mocks.remove.mockResolvedValue({
      data: { object: 'app_membership', id: 'assign_1', deleted: true },
      error: null,
    })
  })
  it('returns 401 without a context and does not create a client', async () => {
    mocks.getContext.mockResolvedValue(null)
    expect(
      (await POST(request('/api/app-memberships', 'POST', {}))).status
    ).toBe(401)
    expect(mocks.getWorkspace).not.toHaveBeenCalled()
  })
  it('returns 403 without apps:assign and does not create a client', async () => {
    mocks.requireManager.mockResolvedValue({
      viewer: null,
      response: new Response(null, { status: 403 }),
    })
    expect(
      (await POST(request('/api/app-memberships', 'POST', {}))).status
    ).toBe(403)
    expect(mocks.getWorkspace).not.toHaveBeenCalled()
  })
  it('creates with exact validated arguments', async () => {
    expect(
      (
        await POST(
          request('/api/app-memberships', 'POST', {
            membership_id: 'mem_1',
            app_id: 'app_1',
            app_role_id: 'role_1',
          })
        )
      ).status
    ).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      membership_id: 'mem_1',
      app_id: 'app_1',
      app_role_id: 'role_1',
    })
  })
  it('updates with exact validated arguments', async () => {
    await PATCH(
      request('/api/app-memberships/assign_1', 'PATCH', {
        app_role_id: 'role_2',
      }),
      route
    )
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'assign_1', {
      app_role_id: 'role_2',
    })
  })
  it('deletes with exact arguments', async () => {
    await DELETE(request('/api/app-memberships/assign_1', 'DELETE'), route)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'assign_1')
  })
  it('returns 400 for an invalid body', async () => {
    expect(
      (
        await POST(
          new NextRequest('http://localhost/api/app-memberships', {
            method: 'POST',
            body: '{',
          })
        )
      ).status
    ).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('returns a workspace error value', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'core/unavailable', message: 'Unavailable' },
    })
    const response = await POST(
      request('/api/app-memberships', 'POST', {
        membership_id: 'mem_1',
        app_id: 'app_1',
      })
    )
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'core/unavailable' },
    })
  })
  it('strips unknown request fields', async () => {
    await POST(
      request('/api/app-memberships', 'POST', {
        membership_id: 'mem_1',
        app_id: 'app_1',
        attacker: 'nope',
      })
    )
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      membership_id: 'mem_1',
      app_id: 'app_1',
    })
  })
  it('does not update after a manager denial', async () => {
    mocks.requireManager.mockResolvedValue({
      viewer: null,
      response: new Response(null, { status: 403 }),
    })
    await PATCH(
      request('/api/app-memberships/assign_1', 'PATCH', {
        app_role_id: 'role_1',
      }),
      route
    )
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('does not delete when unauthenticated', async () => {
    mocks.getContext.mockResolvedValue(null)
    expect(
      (await DELETE(request('/api/app-memberships/assign_1', 'DELETE'), route))
        .status
    ).toBe(401)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
