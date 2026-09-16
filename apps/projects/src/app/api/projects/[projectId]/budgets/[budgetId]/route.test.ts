import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    budgets: {
      retrieve: mocks.retrieve,
      update: mocks.update,
      delete: mocks.remove,
    },
  },
}))

const { GET, PATCH, DELETE } = await import('./route')

const context = {
  params: Promise.resolve({ projectId: 'prj_1', budgetId: 'bud_1' }),
}

function patch(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/budgets/bud_1', {
    method: 'PATCH',
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
  mocks.retrieve.mockResolvedValue({
    data: { object: 'projects.budget', id: 'bud_1' },
    error: null,
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.budget', id: 'bud_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.budget', id: 'bud_1', deleted: true },
    error: null,
  })
})

describe('GET /api/projects/[projectId]/budgets/[budgetId]', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('retrieves the budget scoped to the project', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.retrieve).toHaveBeenCalledWith('org_1', 'prj_1', 'bud_1')
  })

  it('maps a missing budget to 404', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/budget-not-found', message: 'Missing.' },
    })

    const response = await GET(new Request('http://localhost/api'), context)

    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/projects/[projectId]/budgets/[budgetId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patch({ thresholdPercent: 90 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates the budget with one client call', async () => {
    const response = await PATCH(patch({ thresholdPercent: 90 }), context)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'prj_1', 'bud_1', {
      thresholdPercent: 90,
    })
  })

  it('rejects an unknown field', async () => {
    const response = await PATCH(patch({ scope: 'user' }), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/projects/[projectId]/budgets/[budgetId]', () => {
  it('deletes the budget with one client call', async () => {
    const response = await DELETE(new Request('http://localhost/api'), context)

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'prj_1', 'bud_1')
  })
})
