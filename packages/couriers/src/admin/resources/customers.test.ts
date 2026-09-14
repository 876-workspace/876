import { describe, expect, it, vi } from 'vitest'

import { createCustomersResource } from './customers'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const customerId = 'cpr_kingston/brown market'
const mailboxId = 'mbx_kingston/1842 A'
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

const customer = {
  object: 'courier_customer_profile' as const,
  id: customerId,
  tenant_id: tenantId,
  user_id: 'user_sophia_brown',
  billing_customer_id: 'billcus_sophia_brown',
  branch_id: 'br_kingston/harbour',
  status: 'ACTIVE' as const,
  trn: null,
  is_commercial: false,
  first_seen_at: 1_776_048_000,
  created_at: 1_776_048_000,
  updated_at: 1_776_134_400,
  deleted_at: null,
}

const customerList = {
  object: 'list' as const,
  data: [customer],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/customers`,
}

const mailbox = {
  object: 'mailbox' as const,
  id: mailboxId,
  tenant_id: tenantId,
  customer_id: customerId,
  number: 'KIN-1842',
  is_primary: true,
  created_at: 1_776_048_000,
  updated_at: 1_776_134_400,
}

const mailboxList = {
  object: 'list' as const,
  data: [mailbox],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/customers/${encodeURIComponent(customerId)}/mailboxes`,
}

const listParams = {
  status: 'ACTIVE' as const,
  branch_id: 'br_kingston/harbour',
  limit: 50,
}

const createCustomerBody = {
  source: 'party' as const,
  idempotency_key: 'idem_12345678',
  party: {
    customer_kind: 'INDIVIDUAL' as const,
    first_name: 'Marcia',
    last_name: 'Campbell',
  },
  branch_id: 'br_montego_bay/freeport',
  status: 'ACTIVE' as const,
  is_commercial: true,
}

const registryCustomerBody = {
  source: 'registry' as const,
  billing_customer_id: 'billcus_sophia_brown',
  branch_id: 'br_kingston/harbour',
  status: 'ACTIVE' as const,
  is_commercial: false,
}

const updateCustomerBody = {
  branch_id: null,
  status: 'SUSPENDED' as const,
  trn: '123456789',
  is_commercial: false,
}

const deletedCustomer = {
  object: 'courier_customer_profile' as const,
  id: customerId,
  deleted: true as const,
}

const createMailboxBody = {
  number: 'MBJ-728',
  is_primary: true,
}

const updateMailboxBody = {
  is_primary: false,
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createCustomersResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createCustomersResource', () => {
  it('lists customers with every supported query parameter', async () => {
    const fetchMock = successFetch(customerList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.list(tenantId, listParams)

    expect(result).toEqual({ data: customerList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers?status=ACTIVE&branch_id=br_kingston%2Fharbour&limit=50`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends a starting_after cursor when listing customers', async () => {
    const fetchMock = successFetch(customerList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { starting_after: customerId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers?starting_after=cpr_kingston%2Fbrown+market`,
      expect.anything()
    )
  })

  it('sends an ending_before cursor when listing customers', async () => {
    const fetchMock = successFetch(customerList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { ending_before: customerId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers?ending_before=cpr_kingston%2Fbrown+market`,
      expect.anything()
    )
  })

  it('retrieves a customer with encoded identifiers', async () => {
    const fetchMock = successFetch(customer)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, customerId)

    expect(result).toEqual({ data: customer, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates a customer with the exact body', async () => {
    const fetchMock = successFetch(customer)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, createCustomerBody)

    expect(result).toEqual({ data: customer, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(createCustomerBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates a profile for an existing registry customer with the exact body', async () => {
    const fetchMock = successFetch(customer)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, registryCustomerBody)

    expect(result).toEqual({ data: customer, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(registryCustomerBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('updates a customer with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch(customer)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(
      tenantId,
      customerId,
      updateCustomerBody
    )

    expect(result).toEqual({ data: customer, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(updateCustomerBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deletes a customer with optional audit metadata', async () => {
    const fetchMock = successFetch(deletedCustomer)
    const resource = createResource(fetchMock, internalKey)
    const body = { deleted_by: 'usr_kingston', reason: 'duplicate' }

    const result = await resource.delete(tenantId, customerId, body)

    expect(result).toEqual({ data: deletedCustomer, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(body),
      }
    )
  })

  it('lists a customer’s mailboxes with encoded identifiers', async () => {
    const fetchMock = successFetch(mailboxList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.mailboxes.list(tenantId, customerId)

    expect(result).toEqual({ data: mailboxList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/mailboxes`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates a customer mailbox with the exact body', async () => {
    const fetchMock = successFetch(mailbox)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.mailboxes.create(
      tenantId,
      customerId,
      createMailboxBody
    )

    expect(result).toEqual({ data: mailbox, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/mailboxes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(createMailboxBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('updates a customer mailbox with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch(mailbox)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.mailboxes.update(
      tenantId,
      customerId,
      mailboxId,
      updateMailboxBody
    )

    expect(result).toEqual({ data: mailbox, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/mailboxes/mbx_kingston%2F1842%20A`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(updateMailboxBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  const customerVerbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createCustomersResource>
    ): Promise<unknown>
  }[] = [
    {
      name: 'list',
      invoke: (resource) => resource.list(tenantId, listParams),
    },
    {
      name: 'retrieve',
      invoke: (resource) => resource.retrieve(tenantId, customerId),
    },
    {
      name: 'create',
      invoke: (resource) => resource.create(tenantId, createCustomerBody),
    },
    {
      name: 'create (registry)',
      invoke: (resource) => resource.create(tenantId, registryCustomerBody),
    },
    {
      name: 'update',
      invoke: (resource) =>
        resource.update(tenantId, customerId, updateCustomerBody),
    },
    {
      name: 'delete',
      invoke: (resource) => resource.delete(tenantId, customerId),
    },
    {
      name: 'mailboxes.list',
      invoke: (resource) => resource.mailboxes.list(tenantId, customerId),
    },
    {
      name: 'mailboxes.create',
      invoke: (resource) =>
        resource.mailboxes.create(tenantId, customerId, createMailboxBody),
    },
    {
      name: 'mailboxes.update',
      invoke: (resource) =>
        resource.mailboxes.update(
          tenantId,
          customerId,
          mailboxId,
          updateMailboxBody
        ),
    },
  ]

  it.each(customerVerbs)(
    'rejects malformed responses for $name',
    async ({ invoke }) => {
      const fetchMock = successFetch({ object: 'mailbox', id: mailboxId })
      const resource = createResource(fetchMock, internalKey)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: invalidResponse })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(customerVerbs)(
    'fails closed before fetch when the admin credential is missing for $name',
    async ({ invoke }) => {
      const fetchMock = vi.fn<typeof fetch>()
      const resource = createResource(fetchMock)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: adminNotConfigured })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(0)
    }
  )
})
