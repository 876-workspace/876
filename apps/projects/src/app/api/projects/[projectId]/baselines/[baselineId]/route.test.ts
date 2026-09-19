import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { baselines: { delete: mocks.remove } },
}))

const { DELETE } = await import('./route')

const context = {
  params: Promise.resolve({ projectId: 'prj_1', baselineId: 'bsl_1' }),
}

function request() {
  return new Request('http://localhost/api/projects/prj_1/baselines/bsl_1', {
    method: 'DELETE',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.baseline', id: 'bsl_1', deleted: true },
    error: null,
  })
})

describe('DELETE /api/projects/[projectId]/baselines/[baselineId]', () => {
  it('requires the projects edit permission', async () => {
    await DELETE(request(), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('deletes the baseline scoped to the organization', async () => {
    const response = await DELETE(request(), context)

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'bsl_1')
  })

  it('returns the deletion envelope', async () => {
    const response = await DELETE(request(), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.baseline', id: 'bsl_1', deleted: true },
      error: null,
    })
  })

  it('returns the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(request(), context)

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('maps a missing baseline to 404', async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/baseline-not-found',
        message: 'That baseline does not exist.',
      },
    })

    const response = await DELETE(request(), context)

    expect(response.status).toBe(404)
  })
})
