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
  getCrmApiContext: mocks.getContext,
}))
vi.mock('@/lib/auth/app-access', () => ({
  requireAppAccessManager: mocks.requireManager,
}))
vi.mock('@/lib/services/workspace', () => ({
  getWorkspace: mocks.getWorkspace,
}))

const context = { orgId: 'org_1', userId: 'usr_1' }
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
    mocks.getContext.mockResolvedValue(context)
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
  it('returns 401 without a context and does not create a workspace client', async () => {
    mocks.getContext.mockResolvedValue(null)
    const response = await POST(request('/api/app-memberships', 'POST', {}))
    expect(response.status).toBe(401)
    expect(mocks.getWorkspace).not.toHaveBeenCalled()
  })
  it('returns the manager 403 without an app membership operation', async () => {
    mocks.requireManager.mockResolvedValue({
      viewer: null,
      response: Response.json(
        { data: null, error: { code: 'crm/forbidden', message: 'No.' } },
        { status: 403 }
      ),
    })
    const response = await POST(request('/api/app-memberships', 'POST', {}))
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('creates with exact validated arguments', async () => {
    const response = await POST(
      request('/api/app-memberships', 'POST', {
        membership_id: 'mem_1',
        app_id: 'app_1',
        app_role_id: 'role_1',
      })
    )
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      membership_id: 'mem_1',
      app_id: 'app_1',
      app_role_id: 'role_1',
    })
  })
  it('updates with exact validated arguments', async () => {
    const response = await PATCH(
      request('/api/app-memberships/assign_1', 'PATCH', {
        app_role_id: 'role_2',
      }),
      route
    )
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'assign_1', {
      app_role_id: 'role_2',
    })
  })
  it('deletes with exact arguments', async () => {
    const response = await DELETE(
      request('/api/app-memberships/assign_1', 'DELETE'),
      route
    )
    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'assign_1')
  })
  it('returns 400 for invalid JSON', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/app-memberships', {
        method: 'POST',
        body: '{',
      })
    )
    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('returns a non-2xx status for a workspace error value', async () => {
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
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'core/unavailable', message: 'Unavailable' },
    })
  })
  it('strips unknown fields before the workspace client is called', async () => {
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
  it('does not update when the manager denies access', async () => {
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
    const response = await DELETE(
      request('/api/app-memberships/assign_1', 'DELETE'),
      route
    )
    expect(response.status).toBe(401)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
