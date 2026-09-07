import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-context', () => ({
  getCrmApiContext: mocks.context,
}))
vi.mock('@/lib/services/crm-support', () => ({
  getCrmSupport: () => ({ requests: { list: mocks.list, create: mocks.create } }),
}))

import { GET, POST } from './route'

function post(body: unknown) {
  return new Request('http://crm.test/api/support', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('CRM support BFF', () => {
  beforeEach(() => vi.resetAllMocks())

  it('rejects signed-out viewers', async () => {
    mocks.context.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('uses the acting organization as the support customer and user as requester', async () => {
    mocks.context.mockResolvedValue({
      orgId: 'org_server',
      orgName: 'Server Org',
      userId: 'usr_server',
    })
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

  it('rejects browser attempts to select the Efesto support destination', async () => {
    mocks.context.mockResolvedValue({
      orgId: 'org_server',
      orgName: 'Server Org',
      userId: 'usr_server',
    })

    const response = await POST(
      post({ subject: 'Need help', targetOrganizationId: 'org_attacker' })
    )

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
