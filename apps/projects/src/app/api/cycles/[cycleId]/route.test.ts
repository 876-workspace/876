import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { cycles: { update: mocks.update, delete: mocks.remove } },
}))

const { PATCH, DELETE } = await import('./route')

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/cycles/cyc_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(cycleId = 'cyc_1') {
  return { params: Promise.resolve({ cycleId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.update.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'cycle', id: 'cyc_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/cycles/[cycleId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patchRequest({ name: 'Sprint 13' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('binds the authenticated actor', async () => {
    const response = await PATCH(
      patchRequest({ name: 'Sprint 13' }),
      context(),
    )

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'cyc_1', {
      name: 'Sprint 13',
      actorUserId: 'usr_1',
    })
  })

  it('rejects empty updates', async () => {
    const response = await PATCH(patchRequest({}), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('maps missing cycles to 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'projects/cycle-not-found', message: 'Missing.' },
    })

    const response = await PATCH(
      patchRequest({ name: 'Sprint 13' }),
      context(),
    )

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/cycles/[cycleId]', () => {
  it('requires the projects edit permission', async () => {
    await DELETE(new Request('http://localhost/api/cycles/cyc_1'), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(
      new Request('http://localhost/api/cycles/cyc_1'),
      context(),
    )

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
