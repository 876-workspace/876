import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876CrmSupportClient } from './support-client'

const priority = {
  object: 'request_priority',
  id: 'crm_pri_normal',
  tenantId: 'crm_tenant_1',
  provisioningKey: 'normal',
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
}

const crmRequest = {
  object: 'request',
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  status: 'OPEN',
  priorityId: priority.id,
  priority,
  channel: 'WIDGET',
  teamId: null,
  assigneeId: null,
  ownerId: null,
  requesterUserId: 'usr_1',
  requesterContactId: null,
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function list(data: unknown[], url: string) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

describe('@876/crm support client', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876CrmSupportClient({
    baseUrl: 'http://crm.test',
    serviceApp: '876-billing',
    serviceKey: 'billing-support-key',
    fetch,
  })

  beforeEach(() => fetch.mockReset())

  it('uses app-bound service headers rather than the CRM internal key', async () => {
    fetch.mockResolvedValue(
      json(list([], '/v1/service/support/categories'))
    )

    await client.categories.list()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      'x-876-service-app': '876-billing',
      'x-876-service-key': 'billing-support-key',
    })
    expect(fetch.mock.calls[0]?.[1]?.headers).not.toHaveProperty('x-internal-key')
  })

  it('scopes support history to the source organization query', async () => {
    fetch.mockResolvedValue(
      json(list([], '/v1/service/support/requests'))
    )

    const result = await client.requests.list('org_source/a')

    expect(result.error).toBeNull()
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      'http://crm.test/v1/service/support/requests?sourceOrganizationId=org_source%2Fa'
    )
  })

  it('sends only the typed support intake contract when creating', async () => {
    fetch.mockResolvedValue(json(crmRequest, 201))

    const result = await client.requests.create({
      sourceOrganizationId: 'org_source',
      sourceOrganizationName: 'Source Org',
      requesterUserId: 'usr_1',
      subject: 'Need help',
      description: 'Something is wrong',
      categoryId: null,
    })

    expect(result.data?.id).toBe('crm_req_1')
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({
        sourceOrganizationId: 'org_source',
        sourceOrganizationName: 'Source Org',
        requesterUserId: 'usr_1',
        subject: 'Need help',
        description: 'Something is wrong',
        categoryId: null,
      })
    )
  })

  it('fails before transport when the service key is not configured', async () => {
    const unconfigured = create876CrmSupportClient({
      baseUrl: 'http://crm.test',
      serviceApp: '876-billing',
      fetch,
    })

    const result = await unconfigured.requests.list('org_source')

    expect(result.error?.code).toBe('crm/not-configured')
    expect(fetch).not.toHaveBeenCalled()
  })
})
