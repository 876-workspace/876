import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876CrmClient } from './client'

const customer = {
  object: 'customer_profile',
  profile: {
    id: 'crm_cus_1',
    tenantId: 'crm_tenant_1',
    billingCustomerId: 'cus_1',
    ownerId: null,
    status: 'ACTIVE',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
  },
  customer: {
    id: 'cus_1',
    customerType: 'EXTERNAL',
    customerKind: 'INDIVIDUAL',
    name: 'Jane Doe',
  },
}

const crmRequest = {
  object: 'request',
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  category: 'SUPPORT',
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  assigneeId: null,
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

describe('@876/crm client', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876CrmClient({
    baseUrl: 'http://crm.test',
    internalKey: 'crm-internal',
    fetch,
  })

  beforeEach(() => fetch.mockReset())

  it('sends customer CRUD to the organization-scoped CRM endpoints', async () => {
    fetch
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [customer],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/customers',
        })
      )
      .mockResolvedValueOnce(json(customer))
      .mockResolvedValueOnce(json(customer, 201))
      .mockResolvedValueOnce(json(customer))
      .mockResolvedValueOnce(
        json({ object: 'customer', id: 'crm_cus_1', deleted: true })
      )

    await client.customers.list('org_1')
    await client.customers.retrieve('org_1', 'crm_cus_1')
    await client.customers.create('org_1', {
      idempotencyKey: 'create-1',
      customerKind: 'INDIVIDUAL',
      firstName: 'Jane',
      lastName: 'Doe',
    })
    await client.customers.update('org_1', 'crm_cus_1', {
      customerKind: 'INDIVIDUAL',
      firstName: 'Jane',
      lastName: 'Doe',
      status: 'ACTIVE',
    })
    await client.customers.delete('org_1', 'crm_cus_1', {
      deletedBy: 'usr_1',
    })

    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      'http://crm.test/v1/organizations/org_1/customers',
      'http://crm.test/v1/organizations/org_1/customers/crm_cus_1',
      'http://crm.test/v1/organizations/org_1/customers',
      'http://crm.test/v1/organizations/org_1/customers/crm_cus_1',
      'http://crm.test/v1/organizations/org_1/customers/crm_cus_1',
    ])
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      'x-internal-key': 'crm-internal',
    })
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual([
      'GET',
      'GET',
      'POST',
      'PATCH',
      'DELETE',
    ])
  })

  it('sends request CRUD and validates request resources', async () => {
    fetch
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [crmRequest],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/requests',
        })
      )
      .mockResolvedValueOnce(json(crmRequest))
      .mockResolvedValueOnce(json(crmRequest, 201))
      .mockResolvedValueOnce(json({ ...crmRequest, status: 'IN_PROGRESS' }))
      .mockResolvedValueOnce(
        json({ object: 'request', id: 'crm_req_1', deleted: true })
      )

    const listed = await client.requests.list('org_1')
    const retrieved = await client.requests.retrieve('org_1', 'crm_req_1')
    const created = await client.requests.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      category: 'SUPPORT',
      createdBy: 'usr_1',
    })
    const updated = await client.requests.update('org_1', 'crm_req_1', {
      status: 'IN_PROGRESS',
    })
    const deleted = await client.requests.delete('org_1', 'crm_req_1', {
      deletedBy: 'usr_1',
    })

    expect(listed.error).toBeNull()
    expect(retrieved.data?.id).toBe('crm_req_1')
    expect(created.data?.status).toBe('OPEN')
    expect(updated.data?.status).toBe('IN_PROGRESS')
    expect(deleted.data?.deleted).toBe(true)
  })

  it('returns a created request without a stored description', async () => {
    fetch.mockResolvedValueOnce(json(crmRequest, 201))

    const result = await client.requests.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'Need help',
      description: 'The opening message.',
      createdBy: 'usr_1',
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org_1/requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          customerId: 'crm_cus_1',
          subject: 'Need help',
          description: 'The opening message.',
          createdBy: 'usr_1',
        }),
      })
    )
    expect(result).toEqual({ data: crmRequest, error: null })
  })

  it('sends request notes CRUD and validates note resources', async () => {
    const crmNote = {
      object: 'request_note',
      id: 'crm_note_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      body: 'Customer contacted via phone with extra details.',
      authorId: 'usr_1',
      internal: true,
      kind: 'NOTE',
      editedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }

    fetch
      .mockResolvedValueOnce(
        json({
          object: 'list',
          data: [crmNote],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/requests/crm_req_1/notes',
        })
      )
      .mockResolvedValueOnce(json(crmNote, 201))
      .mockResolvedValueOnce(
        json({ object: 'request_note', id: 'crm_note_1', deleted: true })
      )

    const listed = await client.requestNotes.list('org_1', 'crm_req_1')
    const created = await client.requestNotes.create('org_1', 'crm_req_1', {
      body: 'Customer contacted via phone with extra details.',
      authorId: 'usr_1',
      internal: true,
    })
    const deleted = await client.requestNotes.delete(
      'org_1',
      'crm_req_1',
      'crm_note_1',
      { deletedBy: 'usr_1' }
    )

    expect(listed.error).toBeNull()
    expect(listed.data?.data[0]?.id).toBe('crm_note_1')
    expect(created.data?.body).toBe(
      'Customer contacted via phone with extra details.'
    )
    expect(deleted.data?.deleted).toBe(true)

    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      'http://crm.test/v1/organizations/org_1/requests/crm_req_1/notes',
      'http://crm.test/v1/organizations/org_1/requests/crm_req_1/notes',
      'http://crm.test/v1/organizations/org_1/requests/crm_req_1/notes/crm_note_1',
    ])
  })

  it('updates a request note with the exact note endpoint and payload', async () => {
    const crmNote = {
      object: 'request_note',
      id: 'crm_note_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      body: 'Updated details.',
      authorId: 'usr_1',
      internal: true,
      kind: 'NOTE',
      editedAt: 2,
      createdAt: 1,
      updatedAt: 2,
    }
    fetch.mockResolvedValueOnce(json(crmNote))

    const result = await client.requestNotes.update(
      'org_1',
      'crm_req_1',
      'crm_note_1',
      { body: 'Updated details.', editedBy: 'usr_2' }
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'http://crm.test/v1/organizations/org_1/requests/crm_req_1/notes/crm_note_1'
    )
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ body: 'Updated details.', editedBy: 'usr_2' }),
    })
    expect(result.data).toEqual(crmNote)
    expect(result.error).toBeNull()
  })

  it('fails closed when the internal credential is absent', async () => {
    const unconfigured = create876CrmClient({
      baseUrl: 'http://crm.test',
      fetch,
    })

    const result = await unconfigured.requests.list('org_1')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'crm/not-configured',
        message: 'CRM client is not configured.',
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
