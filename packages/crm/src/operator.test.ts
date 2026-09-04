import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876CrmOperatorClient } from './operator'

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const request = {
  object: 'request',
  id: 'req_1',
  tenantId: 'tenant_1',
  organizationId: 'org_1',
  customerId: 'customer_1',
  number: 1,
  subject: 'Access request',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN',
  priorityId: 'priority_1',
  priority: {
    object: 'request_priority',
    id: 'priority_1',
    tenantId: 'tenant_1',
    provisioningKey: null,
    name: 'Normal',
    slug: 'normal',
    description: null,
    color: null,
    icon: null,
    weight: 1,
    sortOrder: 1,
    isDefault: true,
    isActive: true,
    createdBy: null,
    createdAt: 1,
    updatedAt: 1,
  },
  channel: 'AGENT',
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: null,
  requesterContactId: null,
  createdBy: 'user_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('@876/crm operator requests', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876CrmOperatorClient({
    baseUrl: 'http://crm.test',
    internalKey: 'crm-internal',
    fetch,
  })

  beforeEach(() => fetch.mockReset())

  it('lists requests across organizations through the operator endpoint', async () => {
    fetch.mockResolvedValueOnce(
      response({
        data: {
          object: 'list',
          data: [request],
          has_more: false,
          total_count: 1,
          url: '/v1/requests',
        },
        error: null,
      })
    )

    const result = await client.requests.listAcrossOrganizations({
      status: 'OPEN',
      limit: 25,
      startingAfter: 'req_0',
    })

    expect(result).toEqual({
      data: {
        object: 'list',
        data: [request],
        has_more: false,
        total_count: 1,
        url: '/v1/requests',
      },
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/requests?status=OPEN&limit=25&starting_after=req_0',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('preserves an operator API error in the standard result envelope', async () => {
    fetch.mockResolvedValueOnce(
      response(
        {
          data: null,
          error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
        },
        401
      )
    )

    const result = await client.requests.listAcrossOrganizations()

    expect(result).toEqual({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })
  })
})
