import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.context,
}))
vi.mock('@/lib/services/crm-support', () => ({
  getCrmSupport: () => ({ requests: { list: mocks.list, create: mocks.create } }),
}))

import { GET, POST } from './route'

function post(body: unknown) {
  return new Request('http://billing.test/api/support', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('Billing support BFF', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects signed-out viewers', async () => {
    mocks.context.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('derives organization and requester identity on the server', async () => {
    mocks.context.mockResolvedValue({
      orgId: 'org_server',
      orgName: 'Server Org',
      userId: 'usr_server',
    })
    mocks.create.mockResolvedValue({ data: { id: 'req_1' }, error: null })

    const response = await POST(
      post({ subject: 'Need help', description: 'Details', categoryId: null })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({
      subject: 'Need help',
      description: 'Details',
      categoryId: null,
      sourceOrganizationId: 'org_server',
      sourceOrganizationName: 'Server Org',
      requesterUserId: 'usr_server',
    })
  })

  it('rejects browser attempts to inject support routing identity', async () => {
    mocks.context.mockResolvedValue({
      orgId: 'org_server',
      orgName: 'Server Org',
      userId: 'usr_server',
    })

    const response = await POST(
      post({
        subject: 'Need help',
        sourceOrganizationId: 'org_attacker',
        requesterUserId: 'usr_attacker',
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
