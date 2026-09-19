import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { capacity: { update: mocks.update } },
}))

const { PATCH } = await import('./route')

const CAPACITY = {
  object: 'projects.member-capacity',
  id: 'cap_1',
  tenantId: 'tnt_1',
  userId: 'usr_1',
  minutesPerWeek: 2250,
  effectiveFrom: 1788220800,
  effectiveTo: null,
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

const context = { params: Promise.resolve({ capacityId: 'cap_1' }) }

function patch(body: unknown) {
  return new Request('http://localhost/api/capacity/cap_1', {
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
  mocks.update.mockResolvedValue({ data: CAPACITY, error: null })
})

describe('PATCH /api/capacity/[capacityId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patch({ minutesPerWeek: 2250 }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates the capacity the URL names', async () => {
    const response = await PATCH(
      patch({ minutesPerWeek: 2250, effectiveTo: null }),
      context
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'cap_1', {
      minutesPerWeek: 2250,
      effectiveTo: null,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: CAPACITY, error: null })
  })

  it('decodes an encoded capacity id', async () => {
    await PATCH(patch({ minutesPerWeek: 2250 }), {
      params: Promise.resolve({ capacityId: 'cap%2Fone%20two' }),
    })

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'cap/one two', {
      minutesPerWeek: 2250,
    })
  })

  it('rejects a body that changes nothing', async () => {
    const response = await PATCH(patch({}), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects a body that names the member it belongs to', async () => {
    const response = await PATCH(patch({ userId: 'usr_attacker' }), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects more than a seven-day week', async () => {
    const response = await PATCH(patch({ minutesPerWeek: 10081 }), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('reports a missing capacity as not found', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/capacity-not-found',
        message: 'That capacity does not exist.',
      },
    })

    const response = await PATCH(patch({ minutesPerWeek: 2250 }), context)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/not-found',
        message: 'That capacity does not exist.',
      },
    })
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await PATCH(patch({ minutesPerWeek: 2250 }), context)

    expect(response.status).toBe(401)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
