import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@876/core/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@876/core/client')>()),
  sendClientRequest: vi.fn(),
}))
import { sendClientRequest } from '@876/core/client'
import { create876CrmClient } from '../client.js'

type ClientResponse = Awaited<ReturnType<typeof sendClientRequest>>
const mockSend = vi.mocked(sendClientRequest)
function json(data: unknown) {
  return {
    ok: true,
    payload: { data, error: null },
  } as unknown as ClientResponse
}
function errorPayload(code: string, message: string) {
  return {
    ok: true,
    payload: { data: null, error: { code, message } },
  } as unknown as ClientResponse
}
function malformed() {
  return { ok: true, payload: { bad: true } } as unknown as ClientResponse
}

const requestRow = {
  object: 'request' as const,
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN' as const,
  priorityId: 'crm_pri_normal',
  priority: {
    object: 'request_priority' as const,
    id: 'crm_pri_normal',
    tenantId: 'crm_tenant_1',
    provisioningKey: null,
    name: 'Normal',
    slug: 'normal',
    description: null,
    color: null,
    icon: null,
    weight: 20,
    sortOrder: 20,
    isDefault: true,
    isActive: true,
    createdBy: null,
    createdAt: 1,
    updatedAt: 1,
  },
  source: 'WEB' as const,
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: null,
  requesterContactId: null,
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const client = create876CrmClient({
  baseUrl: 'http://crm.test',
  internalKey: 'k',
  fetch: vi.fn() as unknown as typeof fetch,
})
beforeEach(() => vi.clearAllMocks())

describe('requestFormRequests - list', () => {
  it('requests GET at form-scoped requests path with single org filter', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [requestRow],
        has_more: false,
        total_count: 1,
        url: '/x',
      })
    )
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'cust_org_1',
    })
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'GET' })
    )
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toContain(
      '/v1/organizations/org_1/request-forms/form_1/requests'
    )
    expect(path).toContain('customerOrganizationId=cust_org_1')
    expect(result.data?.data).toEqual([requestRow])
    expect(result.error).toBeNull()
  })

  it('sends both customerOrganizationId and customerUserId when provided', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'org_1',
      customerUserId: 'usr_1',
    })
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toContain('customerOrganizationId=org_1')
    expect(path).toContain('customerUserId=usr_1')
  })

  it('sends only customerUserId when that is the party', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormRequests.list('org_1', 'form_1', {
      customerUserId: 'usr_1',
    })
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toContain('customerUserId=usr_1')
    expect(path).not.toContain('customerOrganizationId')
  })

  it('encodes customer ids in query string', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'org /north',
    })
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toContain('customerOrganizationId=org+%2Fnorth')
  })

  it('encodes organization and form ids in path', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormRequests.list('org /1', 'form /2', {
      customerOrganizationId: 'o',
    })
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toContain('/org%20%2F1/request-forms/form%20%2F2/requests')
  })

  it('always appends query string delimiter even when no filters (resource contract)', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    await client.requestFormRequests.list('org_1', 'form_1', {})
    const path = mockSend.mock.calls[0][1].path as string
    expect(path).toMatch(/\/requests\?/)
  })

  it('forwards AbortSignal', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    const c = new AbortController()
    await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
      signal: c.signal,
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: c.signal })
    )
  })

  it('returns invalid-response when request payload is malformed', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [{ bad: true }],
        has_more: false,
        total_count: 1,
        url: '/x',
      })
    )
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
    })
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/invalid-response', message: expect.any(String) },
    })
  })

  it('returns invalid-response when envelope is malformed', async () => {
    mockSend.mockResolvedValue(malformed())
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
    })
    expect(result.error?.code).toBe('crm/invalid-response')
    expect(result.data).toBeNull()
  })

  it('propagates envelope error', async () => {
    mockSend.mockResolvedValue(errorPayload('crm/form-not-found', 'not found'))
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
    })
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/form-not-found', message: 'not found' },
    })
  })

  it('fails closed when not configured', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    const result = await unconfigured.requestFormRequests.list(
      'org_1',
      'form_1',
      { customerOrganizationId: 'o' }
    )
    expect(result).toEqual({
      data: null,
      error: { code: 'crm/not-configured', message: expect.any(String) },
    })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('asserts complete list shape', async () => {
    const list = {
      object: 'list' as const,
      data: [requestRow],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/request-forms/form_1/requests?customerOrganizationId=o',
    }
    mockSend.mockResolvedValue(json(list))
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
    })
    expect(result.data).toEqual(list)
    expect(result.error).toBeNull()
  })

  it('handles empty result', async () => {
    mockSend.mockResolvedValue(
      json({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/x',
      })
    )
    const result = await client.requestFormRequests.list('org_1', 'form_1', {
      customerOrganizationId: 'o',
    })
    expect(result.data?.data).toEqual([])
    expect(result.data?.total_count).toBe(0)
    expect(result.error).toBeNull()
  })

  it.each([['cust_org_1'], ['org-with-dash-123'], ['ORG_CAPS']] as const)(
    'handles customer org id variant %s',
    async (id) => {
      mockSend.mockResolvedValue(
        json({
          object: 'list',
          data: [],
          has_more: false,
          total_count: 0,
          url: '/x',
        })
      )
      await client.requestFormRequests.list('org_1', 'form_1', {
        customerOrganizationId: id,
      })
      expect(mockSend).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          path: expect.stringContaining(
            encodeURIComponent(id).replace(/%20/g, '+')
          ),
        })
      )
    }
  )
})
