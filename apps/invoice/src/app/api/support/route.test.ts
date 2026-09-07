import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/context', () => ({
  getInvoiceContextResult: mocks.context,
}))
vi.mock('@/lib/services/crm-support', () => ({
  getCrmSupport: () => ({ requests: { list: mocks.list, create: mocks.create } }),
}))

import { GET, POST } from './route'

function post(body: unknown) {
  return new Request('http://invoice.test/api/support', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

function activeContext() {
  return {
    status: 'ok' as const,
    context: {
      orgId: 'org_server',
      orgName: 'Server Org',
      userId: 'usr_server',
      accessStatus: 'active' as const,
    },
  }
}

describe('Invoice support BFF', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects viewers without an active Invoice context', async () => {
    mocks.context.mockResolvedValue({ status: 'signed-out' })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('derives organization and requester identity on the server', async () => {
    mocks.context.mockResolvedValue(activeContext())
    mocks.create.mockResolvedValue({ data: { id: 'req_1' }, error: null })

    const response = await POST(
      post({ subject: 'Need help', description: null, categoryId: null })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({
      subject: 'Need help',
      description: null,
      categoryId: null,
      sourceOrganizationId: 'org_server',
      sourceOrganizationName: 'Server Org',
      requesterUserId: 'usr_server',
    })
  })

  it('rejects browser attempts to inject support routing identity', async () => {
    mocks.context.mockResolvedValue(activeContext())

    const response = await POST(
      post({ subject: 'Need help', sourceOrganizationId: 'org_attacker' })
    )

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
