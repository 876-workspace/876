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
  categoryId: 'crm_cat_1',
  subcategoryId: null,
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
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
      categoryId: 'crm_cat_1',
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

  it('sends managed category and ownership filters without the removed category key', async () => {
    fetch.mockResolvedValueOnce(
      json({
        object: 'list',
        data: [{ ...crmRequest, teamId: 'dept_1', assigneeId: 'usr_2' }],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/requests',
      })
    )

    const result = await client.requests.list('org_1', {
      status: 'OPEN',
      teamId: 'dept_1',
      assigneeId: 'usr_2',
      categoryId: 'crm_cat_1',
      subcategoryId: 'unassigned',
      ownerId: 'unassigned',
    })

    expect(result.error).toBeNull()
    expect(result.data?.data[0]?.teamId).toBe('dept_1')
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org_1/requests?status=OPEN&teamId=dept_1&assigneeId=usr_2&categoryId=crm_cat_1&subcategoryId=unassigned&ownerId=unassigned',
      expect.objectContaining({ method: 'GET' })
    )
    expect(String(fetch.mock.calls[0]?.[0])).not.toContain('category=')
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
      visibility: 'INTERNAL',
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

    const listed = await client.requestNotes.list('org_1', 'crm_req_1', {
      viewerId: 'usr_1',
    })
    const created = await client.requestNotes.create('org_1', 'crm_req_1', {
      body: 'Customer contacted via phone with extra details.',
      authorId: 'usr_1',
      visibility: 'PRIVATE',
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
      'http://crm.test/v1/organizations/org_1/requests/crm_req_1/notes?viewer_id=usr_1',
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
      visibility: 'INTERNAL',
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

  it('creates a team at the encoded organization URL with members unchanged', async () => {
    const team = {
      object: 'team',
      id: 'crm_team_1',
      tenantId: 'crm_tenant_1',
      name: 'Customer Success',
      slug: 'customer-success',
      description: null,
      color: '#2563eb',
      isDefault: true,
      autoAssign: 'ROUND_ROBIN',
      status: 'ACTIVE',
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      members: [],
    }
    const input = {
      name: 'Customer Success',
      color: '#2563eb',
      isDefault: true,
      autoAssign: 'ROUND_ROBIN' as const,
      createdBy: 'usr_1',
      members: [{ userId: 'usr_2', role: 'LEAD' as const }],
    }
    fetch.mockResolvedValueOnce(json(team, 201))

    const result = await client.teams.create('org /north', input)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org%20%2Fnorth/teams',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'crm-internal',
        },
        body: JSON.stringify(input),
      }
    )
    expect(result).toEqual({ data: team, error: null })
  })

  it('lists request categories at the encoded organization URL', async () => {
    const subcategory = {
      object: 'request_subcategory',
      id: 'crm_subcat_1',
      tenantId: 'crm_tenant_1',
      categoryId: 'crm_cat_1',
      name: 'Damaged parcel',
      slug: 'damaged-parcel',
      description: null,
      icon: 'package-x',
      sortOrder: 0,
      isActive: true,
      defaultTeamId: null,
      defaultPriority: 'HIGH',
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    const category = {
      object: 'request_category',
      id: 'crm_cat_1',
      tenantId: 'crm_tenant_1',
      name: 'Delivery',
      slug: 'delivery',
      description: 'Delivery-related requests.',
      color: '#2563eb',
      icon: 'package',
      sortOrder: 0,
      isActive: true,
      defaultTeamId: 'crm_team_1',
      defaultPriority: 'NORMAL',
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
      subcategories: [subcategory],
    }
    fetch.mockResolvedValueOnce(
      json({
        object: 'list',
        data: [category],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org%20%2Fnorth/request-categories',
      })
    )

    const result = await client.requestCategories.list('org /north')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org%20%2Fnorth/request-categories',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'crm-internal',
        },
      }
    )
    expect(result.data?.data).toEqual([category])
    expect(result.error).toBeNull()
  })

  it('lists request tasks at encoded organization and request URLs', async () => {
    const task = {
      object: 'request_task',
      id: 'crm_task_1',
      tenantId: 'crm_tenant_1',
      requestId: 'req /42',
      title: 'Call the customer',
      description: null,
      status: 'OPEN',
      priority: 'HIGH',
      assigneeId: 'usr_2',
      dueAt: 2,
      completedAt: null,
      completedBy: null,
      sortOrder: 0,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    fetch.mockResolvedValueOnce(
      json({
        object: 'list',
        data: [task],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org%20%2Fnorth/requests/req%20%2F42/tasks',
      })
    )

    const result = await client.requestTasks.list('org /north', 'req /42')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org%20%2Fnorth/requests/req%20%2F42/tasks',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'crm-internal',
        },
      }
    )
    expect(result.data?.data).toEqual([task])
    expect(result.error).toBeNull()
  })

  it('lists request reminders at encoded organization and request URLs', async () => {
    const reminder = {
      object: 'request_reminder',
      id: 'crm_rem_1',
      tenantId: 'crm_tenant_1',
      requestId: 'req /42',
      title: 'Check for a reply',
      note: null,
      remindAt: 2,
      userId: 'usr_2',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'usr_1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      deletedBy: null,
    }
    fetch.mockResolvedValueOnce(
      json({
        object: 'list',
        data: [reminder],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org%20%2Fnorth/requests/req%20%2F42/reminders',
      })
    )

    const result = await client.requestReminders.list('org /north', 'req /42')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'http://crm.test/v1/organizations/org%20%2Fnorth/requests/req%20%2F42/reminders',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'crm-internal',
        },
      }
    )
    expect(result.data?.data).toEqual([reminder])
    expect(result.error).toBeNull()
  })

  it('returns an invalid-response result for a malformed team payload', async () => {
    fetch.mockResolvedValueOnce(
      json({ object: 'team', id: 'crm_team_1', name: 'Incomplete team' })
    )

    const result = await client.teams.retrieve('org_1', 'crm_team_1')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      data: null,
      error: {
        code: 'crm/invalid-response',
        message: 'CRM API returned an invalid response.',
      },
    })
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
