import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  getBlueprint: vi.fn(),
  putBlueprint: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    workflows: {
      getBlueprint: mocks.getBlueprint,
      putBlueprint: mocks.putBlueprint,
    },
  },
}))

const { GET, PUT } = await import('./route')

const context = { params: Promise.resolve({ workItemTypeId: 'wit_1' }) }

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/workflows/wit_1/blueprint', {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const blueprint = {
  object: 'projects.workflow-blueprint',
  workItemTypeId: 'wit_1',
  updatedAt: null,
  transitions: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.getBlueprint.mockResolvedValue({ data: blueprint, error: null })
  mocks.putBlueprint.mockResolvedValue({ data: blueprint, error: null })
})

describe('GET blueprint', () => {
  it('requires the projects view permission', async () => {
    await GET(request('GET'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the blueprint for the work item type', async () => {
    const response = await GET(request('GET'), context)

    expect(mocks.getBlueprint).toHaveBeenCalledWith('org_1', 'wit_1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: blueprint, error: null })
  })

  it('returns 400 when the service fails', async () => {
    mocks.getBlueprint.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })

    const response = await GET(request('GET'), context)

    expect(response.status).toBe(400)
  })

  it('returns 404 for an unknown work item type', async () => {
    mocks.getBlueprint.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/work-item-type-not-found',
        message: 'Missing.',
      },
    })

    const response = await GET(request('GET'), context)

    expect(response.status).toBe(404)
  })
})

describe('PUT blueprint', () => {
  it('requires the projects edit permission', async () => {
    await PUT(request('PUT', { transitions: [] }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('saves transitions with service defaults applied', async () => {
    const response = await PUT(
      request('PUT', {
        transitions: [
          {
            id: 'wtr_1',
            fromStateKey: 'todo',
            toStateKey: 'done',
            name: 'Ship',
          },
        ],
      }),
      context
    )

    expect(mocks.putBlueprint).toHaveBeenCalledWith('org_1', 'wit_1', {
      transitions: [
        {
          fromStateKey: 'todo',
          toStateKey: 'done',
          name: 'Ship',
          requiredPermission: null,
          requiredFieldKeys: [],
          requiresComment: false,
        },
      ],
    })
    expect(response.status).toBe(200)
  })

  it('rejects a transition without a target state with 422', async () => {
    const response = await PUT(
      request('PUT', { transitions: [{ name: 'Ship' }] }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.putBlueprint).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the blueprint', async () => {
    mocks.putBlueprint.mockResolvedValue({
      data: null,
      error: { code: 'projects/invalid-transition', message: 'Bad.' },
    })

    const response = await PUT(request('PUT', { transitions: [] }), context)

    expect(response.status).toBe(400)
  })
})
