import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  updateOrgMember: vi.fn(),
  deleteOrgMember: vi.fn(),
  updateMembership: vi.fn(),
  deleteMembership: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/clients/workspace', () => ({
  workspace: {
    members: {
      update: mocks.updateOrgMember,
      delete: mocks.deleteOrgMember,
    },
    memberships: {
      update: mocks.updateMembership,
      delete: mocks.deleteMembership,
    },
  },
}))

import { DELETE, PATCH } from './route'

const context = {
  params: Promise.resolve({ id: 'org_target', membershipId: 'mem_target' }),
}

function patchRequest(body: unknown) {
  return new Request(
    'http://console.test/api/organizations/org_target/members/mem_target',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  ) as NextRequest
}

describe('Console organization member route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('updates through the organization-scoped member resource', async () => {
    mocks.updateOrgMember.mockResolvedValue({
      data: { id: 'mem_target', role: 'admin' },
      error: null,
    })

    const response = await PATCH(patchRequest({ role: ' admin ' }), context)

    expect(response.status).toBe(200)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.updateOrgMember).toHaveBeenCalledWith(
      'org_target',
      'mem_target',
      { role: 'admin' }
    )
    expect(mocks.updateMembership).not.toHaveBeenCalled()
  })

  it('removes through the organization-scoped member resource', async () => {
    mocks.deleteOrgMember.mockResolvedValue({
      data: {
        object: 'organization_member',
        id: 'mem_target',
        deleted: true,
      },
      error: null,
    })

    const response = await DELETE(
      new Request(
        'http://console.test/api/organizations/org_target/members/mem_target',
        { method: 'DELETE' }
      ) as NextRequest,
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.deleteOrgMember).toHaveBeenCalledWith(
      'org_target',
      'mem_target'
    )
    expect(mocks.deleteMembership).not.toHaveBeenCalled()
  })

  it('rejects status-only mutations so lifecycle writes cannot bypass org rules', async () => {
    const response = await PATCH(patchRequest({ status: 'removed' }), context)

    expect(response.status).toBe(400)
    expect(mocks.updateOrgMember).not.toHaveBeenCalled()
    expect(mocks.updateMembership).not.toHaveBeenCalled()
  })
})
