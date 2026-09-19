import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projectBilling: { retrieve: mocks.retrieve, put: mocks.put },
  },
}))

const { GET, PUT } = await import('./route')

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }

function request(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/billing', {
    method: 'PUT',
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
    data: { object: 'projects.project-billing', id: 'pb_1' },
    error: null,
  })
  mocks.put.mockResolvedValue({
    data: { object: 'projects.project-billing', id: 'pb_1' },
    error: null,
  })
})

describe('GET /api/projects/[projectId]/billing', () => {
  it('requires the projects view permission', async () => {
    await GET(new Request('http://localhost/api'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('returns the billing configuration in the data envelope', async () => {
    const response = await GET(new Request('http://localhost/api'), context)

    expect(await response.json()).toEqual({
      data: { object: 'projects.project-billing', id: 'pb_1' },
      error: null,
    })
  })

  it('maps a missing project to 404', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-not-found', message: 'Missing.' },
    })

    const response = await GET(new Request('http://localhost/api'), context)

    expect(response.status).toBe(404)
  })
})

describe('PUT /api/projects/[projectId]/billing', () => {
  it('requires the projects edit permission', async () => {
    await PUT(request({ billingMethod: 'hourly' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('saves integer minor units without float input', async () => {
    const response = await PUT(
      request({
        billingMethod: 'fixed-fee',
        currency: 'USD',
        billingCustomerId: 'cus_1',
        fixedFeeAmount: 250000,
      }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.put).toHaveBeenCalledWith('org_1', 'prj_1', {
      billingMethod: 'fixed-fee',
      currency: 'USD',
      billingCustomerId: 'cus_1',
      fixedFeeAmount: 250000,
    })
  })

  it('rejects an unknown field so the browser cannot set projectId', async () => {
    const response = await PUT(
      request({ billingMethod: 'hourly', projectId: 'prj_attacker' }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.put).not.toHaveBeenCalled()
  })

  it('rejects a fractional fixed fee amount', async () => {
    const response = await PUT(
      request({ billingMethod: 'fixed-fee', fixedFeeAmount: 12.34 }),
      context
    )

    expect(response.status).toBe(422)
    expect(mocks.put).not.toHaveBeenCalled()
  })
})
