import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { budgets: { list: mocks.list, create: mocks.create } },
}))

const { GET, POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function post(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/budgets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.budget', id: 'bud_1' },
    error: null,
  })
})

describe('GET /api/projects/[projectId]/budgets', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the budget list in the data envelope', async () => {
    const response = await GET(new Request('http://localhost/api'), context)

    expect(await response.json()).toEqual({
      data: { object: 'list', data: [] },
      error: null,
    })
  })
})

describe('POST /api/projects/[projectId]/budgets', () => {
  it('requires the projects edit permission', async () => {
    await POST(post({ scope: 'project', amountMinor: 1000 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the budget with integer minor units', async () => {
    const response = await POST(
      post({
        scope: 'project',
        amountMinor: 100000,
        thresholdPercent: 80,
      }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      scope: 'project',
      amountMinor: 100000,
      thresholdPercent: 80,
    })
  })

  it('rejects an unknown field', async () => {
    const response = await POST(
      post({ scope: 'project', amountMinor: 1000, tenantId: 't_attacker' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a fractional amount', async () => {
    const response = await POST(
      post({ scope: 'project', amountMinor: 10.5 }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
