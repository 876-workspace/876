import { NextRequest } from 'next/server'

import { POST } from './route'

const mocks = vi.hoisted(() => ({
  getCrmApiContext: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-context', () => ({
  getCrmApiContext: mocks.getCrmApiContext,
}))
vi.mock('@/lib/clients/crm', () => ({
  crm: { teams: { create: mocks.create } },
}))

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/teams', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createTeamResult() {
  return {
    data: {
      object: 'team' as const,
      id: 'team_support_123',
      tenantId: 'org_island_123',
      name: 'Customer Support',
      slug: 'customer-support',
      description: null,
      color: 'blue',
      isDefault: false,
      autoAssign: 'NONE' as const,
      status: 'ACTIVE' as const,
      createdBy: 'user_session_123',
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
    },
    error: null,
  }
}

describe('POST /api/teams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCrmApiContext.mockResolvedValue({
      orgId: 'org_island_123',
      userId: 'user_session_123',
    })
    mocks.create.mockResolvedValue(createTeamResult())
  })

  it('supplies createdBy from the signed-in session', async () => {
    const response = await POST(
      createRequest({
        name: 'Customer Support',
        color: 'blue',
        autoAssign: 'NONE',
        isDefault: false,
      })
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(createTeamResult())
    expect(mocks.getCrmApiContext).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('org_island_123', {
      name: 'Customer Support',
      color: 'blue',
      autoAssign: 'NONE',
      isDefault: false,
      createdBy: 'user_session_123',
    })
  })

  it('ignores a body-supplied createdBy value', async () => {
    const response = await POST(
      createRequest({
        name: 'Customer Support',
        createdBy: 'user_attacker_999',
      })
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(createTeamResult())
    expect(mocks.create).toHaveBeenCalledWith('org_island_123', {
      name: 'Customer Support',
      createdBy: 'user_session_123',
    })
  })
})
