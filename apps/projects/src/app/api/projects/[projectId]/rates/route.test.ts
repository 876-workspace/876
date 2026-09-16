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
  projects: { rates: { list: mocks.list, create: mocks.create } },
}))

const { GET, POST } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function post(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/rates', {
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
    data: { object: 'projects.rate', id: 'rate_1' },
    error: null,
  })
})

describe('GET /api/projects/[projectId]/rates', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the rate list in the data envelope', async () => {
    const response = await GET(new Request('http://localhost/api'), context)

    expect(await response.json()).toEqual({
      data: { object: 'list', data: [] },
      error: null,
    })
  })
})

describe('POST /api/projects/[projectId]/rates', () => {
  it('requires the projects edit permission', async () => {
    await POST(
      post({ scope: 'project', billRateMinor: 15000, costRateMinor: 9000 }),
      context
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the rate with integer minor units per hour', async () => {
    const response = await POST(
      post({
        scope: 'project',
        billRateMinor: 15000,
        costRateMinor: 9000,
        currency: 'USD',
      }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'prj_1', {
      scope: 'project',
      billRateMinor: 15000,
      costRateMinor: 9000,
      currency: 'USD',
    })
  })

  it('rejects an unknown field', async () => {
    const response = await POST(
      post({
        scope: 'project',
        billRateMinor: 15000,
        costRateMinor: 9000,
        projectId: 'prj_attacker',
      }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a fractional bill rate', async () => {
    const response = await POST(
      post({ scope: 'project', billRateMinor: 15.5, costRateMinor: 9000 }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
