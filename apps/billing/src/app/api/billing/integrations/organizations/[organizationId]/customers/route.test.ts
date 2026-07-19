import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireIntegrationOrganization: vi.fn(),
  listPage: vi.fn(),
}))

vi.mock('@/lib/api/integration-route', () => ({
  integrationRoute:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request, context: unknown) =>
      handler(request, context),
  requireIntegrationOrganization: mocks.requireIntegrationOrganization,
}))
vi.mock('@/lib/service', () => ({
  service: { customers: { listPage: mocks.listPage } },
}))

import { GET } from './route'

function request(query: string): Request {
  return new Request(
    `http://localhost/api/v1/integrations/organizations/org_123/customers${query}`
  )
}

function context() {
  return { params: Promise.resolve({ organizationId: 'org_123' }) }
}

describe('GET customer integration collection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireIntegrationOrganization.mockResolvedValue({
      tenant: { id: 'ten_123' },
      connection: null,
      sourceAppId: null,
      platformAdmin: true,
      response: null,
    })
    mocks.listPage.mockResolvedValue({
      customers: [],
      hasMore: false,
      totalCount: 0,
    })
  })

  it('maps a case-insensitive status filter into the paginated service query', async () => {
    const response = await GET(request('?status=ArChIvEd&limit=50'), context())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/api/v1/integrations/organizations/org_123/customers',
      },
      error: null,
    })
    expect(mocks.listPage).toHaveBeenCalledTimes(1)
    expect(mocks.listPage).toHaveBeenCalledWith('ten_123', {
      limit: 50,
      startingAfter: undefined,
      endingBefore: undefined,
      userId: undefined,
      organizationId: undefined,
      status: 'ARCHIVED',
    })
  })

  it('rejects an unknown status without querying customers', async () => {
    const response = await GET(request('?status=pending'), context())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Enter valid customer pagination parameters.',
      },
    })
    expect(mocks.listPage).not.toHaveBeenCalled()
  })
})
