import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createOrgMember: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/876', () => ({
  $876: {
    organizationMembers: {
      admin: {
        create: mocks.createOrgMember,
      },
    },
  },
}))

import { POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

function postRequest(body: unknown) {
  return new Request(
    'http://console.test/api/organizations/org_target/members',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  ) as NextRequest
}

describe('Console organization member create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('creates an active organization member through the canonical admin resource', async () => {
    mocks.createOrgMember.mockResolvedValue({
      data: {
        object: 'membership',
        id: 'mem_01',
        organization_id: 'org_target',
        user_id: 'user_target',
        role: 'admin',
      },
      error: null,
    })

    const response = await POST(
      postRequest({ userId: ' user_target ', role: ' admin ' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createOrgMember).toHaveBeenCalledTimes(1)
    expect(mocks.createOrgMember).toHaveBeenCalledWith('org_target', {
      userId: 'user_target',
      role: 'admin',
    })
  })

  it('rejects a missing user id before calling the facade', async () => {
    const response = await POST(postRequest({ role: 'member' }), context)

    expect(response.status).toBe(400)
    expect(mocks.createOrgMember).not.toHaveBeenCalled()
  })

  it('rejects a missing role before calling the facade', async () => {
    const response = await POST(postRequest({ userId: 'user_target' }), context)

    expect(response.status).toBe(400)
    expect(mocks.createOrgMember).not.toHaveBeenCalled()
  })

  it('short-circuits when Console authorization fails', async () => {
    const denied = new Response('forbidden', { status: 403 })
    mocks.requirePermission.mockResolvedValue({
      sessionUser: null,
      response: denied,
    })

    const response = await POST(
      postRequest({ userId: 'user_target', role: 'member' }),
      context
    )

    expect(response).toBe(denied)
    expect(mocks.createOrgMember).not.toHaveBeenCalled()
  })
})
