import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireConsolePermission: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requireConsolePermission,
}))

vi.mock('@/lib/clients/workspace', () => ({
  workspace: { appMemberships: { update: mocks.update, delete: vi.fn() } },
}))

import { PATCH } from './route'

const ORG = 'org_4XmK9wQr'
const ASSIGNMENT = 'asg_8Zx1'

function request(body: unknown) {
  return new Request(
    `https://console.test/api/organizations/${ORG}/app-memberships/${ASSIGNMENT}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  ) as never
}

const params = {
  params: Promise.resolve({ id: ORG, assignmentId: ASSIGNMENT }),
}

describe('PATCH /api/organizations/[id]/app-memberships/[assignmentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireConsolePermission.mockResolvedValue({ response: null })
    mocks.update.mockResolvedValue({
      data: { object: 'app_membership', id: ASSIGNMENT },
      error: null,
    })
  })

  it('authorizes before touching the operator client', async () => {
    const denial = Response.json({ error: 'no' }, { status: 403 })
    mocks.requireConsolePermission.mockResolvedValue({ response: denial })

    const response = await PATCH(request({ appRoleId: 'rol_1' }), params)

    expect(response.status).toBe(403)
    expect(mocks.requireConsolePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('forwards a role change on its own', async () => {
    const response = await PATCH(request({ appRoleId: 'rol_1' }), params)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith(ORG, ASSIGNMENT, {
      app_role_id: 'rol_1',
    })
  })

  it('forwards an override change without requiring a role', async () => {
    const response = await PATCH(
      request({
        permissionGrants: ['customers.edit'],
        permissionDenies: ['customers.delete'],
      }),
      params
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(ORG, ASSIGNMENT, {
      permission_grants: ['customers.edit'],
      permission_denies: ['customers.delete'],
    })
  })

  it('treats an empty override list as clearing, not as an absent field', async () => {
    await PATCH(request({ permissionGrants: [], permissionDenies: [] }), params)

    expect(mocks.update).toHaveBeenCalledWith(ORG, ASSIGNMENT, {
      permission_grants: [],
      permission_denies: [],
    })
  })

  it('drops non-string entries from an override list', async () => {
    await PATCH(
      request({ permissionGrants: ['customers.edit', 7, null] }),
      params
    )

    expect(mocks.update).toHaveBeenCalledWith(ORG, ASSIGNMENT, {
      permission_grants: ['customers.edit'],
    })
  })

  it('rejects a request carrying no change at all', async () => {
    const response = await PATCH(request({}), params)

    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects a malformed body', async () => {
    const malformed = new Request(
      `https://console.test/api/organizations/${ORG}/app-memberships/${ASSIGNMENT}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }
    ) as never

    const response = await PATCH(malformed, params)

    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns 400 with the service message when the update fails', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'app-access/role-not-found', message: 'Role not found.' },
    })

    const response = await PATCH(request({ appRoleId: 'rol_missing' }), params)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Role not found.' },
    })
  })
})
