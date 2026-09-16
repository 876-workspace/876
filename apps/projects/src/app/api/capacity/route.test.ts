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
  projects: { capacity: { list: mocks.list, create: mocks.create } },
}))

const { GET, POST } = await import('./route')

const CAPACITY = {
  object: 'projects.member-capacity',
  id: 'cap_1',
  tenantId: 'tnt_1',
  userId: 'usr_1',
  minutesPerWeek: 2400,
  effectiveFrom: 1788220800,
  effectiveTo: null,
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

function get(search = '') {
  return new Request(`http://localhost/api/capacity${search}`)
}

function post(body: unknown) {
  return new Request('http://localhost/api/capacity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const CREATE_BODY = {
  userId: 'usr_1',
  minutesPerWeek: 2400,
  effectiveFrom: 1788220800,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [CAPACITY] },
    error: null,
  })
  mocks.create.mockResolvedValue({ data: CAPACITY, error: null })
})

describe('GET /api/capacity', () => {
  it('requires the projects view permission', async () => {
    await GET(get())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the capacity list in the data envelope', async () => {
    const response = await GET(get())

    expect(await response.json()).toEqual({
      data: { object: 'list', data: [CAPACITY] },
      error: null,
    })
  })

  it('narrows the list to one member when the query names one', async () => {
    await GET(get('?userId=usr_1'))

    expect(mocks.list).toHaveBeenCalledWith('org_1', { userId: 'usr_1' })
  })

  it('rejects a query key the list does not accept', async () => {
    const response = await GET(get('?minutesPerWeek=2400'))

    expect(response.status).toBe(422)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await GET(get())

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })
})

describe('POST /api/capacity', () => {
  it('requires the projects edit permission', async () => {
    await POST(post(CREATE_BODY))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('records a week of capacity as integer minutes', async () => {
    const response = await POST(post(CREATE_BODY))

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_1', CREATE_BODY)
    expect(await response.json()).toEqual({ data: CAPACITY, error: null })
  })

  it('rejects a payload that names the organization itself', async () => {
    const response = await POST(
      post({ ...CREATE_BODY, tenantId: 't_attacker' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a fractional number of minutes', async () => {
    const response = await POST(
      post({ ...CREATE_BODY, minutesPerWeek: 2400.5 })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects more than a seven-day week', async () => {
    const response = await POST(post({ ...CREATE_BODY, minutesPerWeek: 10081 }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('reports a window that overlaps an existing one as a conflict', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/capacity-overlap',
        message: 'That member already has capacity for this period.',
      },
    })

    const response = await POST(post(CREATE_BODY))

    expect(response.status).toBe(409)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await POST(post(CREATE_BODY))

    expect(response.status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
