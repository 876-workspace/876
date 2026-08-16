import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { Customer } from '../types'

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    object: 'customer',
    id: 'blcus_1',
    sourceAppId: 'app_123',
    sourceExternalReference: 'ext_ref_123',
    customerType: 'EXTERNAL',
    customerKind: 'BUSINESS',
    organizationId: null,
    userId: null,
    externalReference: 'ext_ref_123',
    name: 'GraceKennedy Limited',
    salutation: null,
    firstName: null,
    lastName: null,
    companyName: 'GraceKennedy Limited',
    email: 'billing@gkco.com',
    phone: '+18769223440',
    workPhone: '+18769223440',
    billingAddress: {
      street: '73 Harbour Street',
      city: 'Kingston',
      country: 'JM',
    },
    metadata: { tier: 'enterprise' },
    defaultCurrency: 'JMD',
    language: 'en-JM',
    outstandingReceivable: '15000.00',
    unusedCredits: '0.00',
    coreSyncedAt: 1_788_825_600,
    status: 'ACTIVE',
    createdAt: 1_788_825_600,
    updatedAt: 1_788_825_600,
    primaryContact: {
      object: 'contact',
      id: 'cnt_1',
      userId: null,
      salutation: 'Mr',
      firstName: 'Don',
      lastName: 'Wehby',
      email: 'don.wehby@gkco.com',
      workPhone: '+18769223440',
      mobilePhone: '+18765550199',
      isPrimary: true,
      coreSyncedAt: 1_788_825_600,
    },
    ...overrides,
  }
}

describe('customers resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('requests GET /api/v1/customers with no query string when called with no params, and returns the parsed list', async () => {
      const customer = createCustomer()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: {
            object: 'list',
            data: [customer],
            has_more: false,
            total_count: 1,
            url: '/api/v1/customers',
          },
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.list()

      expect(result).toEqual({
        data: {
          object: 'list',
          data: [customer],
          has_more: false,
          total_count: 1,
          url: '/api/v1/customers',
        },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('serializes ids as a comma-joined string', async () => {
      const customer = createCustomer()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: {
            object: 'list',
            data: [customer],
            has_more: false,
            total_count: 1,
            url: '/api/v1/customers',
          },
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.list({
        ids: ['blcus_1', 'blcus_2'],
      })

      expect(result).toEqual({
        data: {
          object: 'list',
          data: [customer],
          has_more: false,
          total_count: 1,
          url: '/api/v1/customers',
        },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers?ids=blcus_1%2Cblcus_2',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('omits undefined params from the query string', async () => {
      const customer = createCustomer()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: {
            object: 'list',
            data: [customer],
            has_more: false,
            total_count: 1,
            url: '/api/v1/customers',
          },
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.list({ status: 'ACTIVE' })

      expect(result).toEqual({
        data: {
          object: 'list',
          data: [customer],
          has_more: false,
          total_count: 1,
          url: '/api/v1/customers',
        },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers?status=ACTIVE',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('passes limit and cursor params through when supplied', async () => {
      const customer = createCustomer()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: {
            object: 'list',
            data: [customer],
            has_more: true,
            total_count: 50,
            url: '/api/v1/customers',
          },
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.list({
        limit: 10,
        starting_after: 'blcus_1',
        ending_before: 'blcus_10',
      })

      expect(result).toEqual({
        data: {
          object: 'list',
          data: [customer],
          has_more: true,
          total_count: 50,
          url: '/api/v1/customers',
        },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers?starting_after=blcus_1&ending_before=blcus_10&limit=10',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })

  describe('retrieve', () => {
    it('requests GET /api/v1/customers/:id and returns the parsed customer', async () => {
      const customer = createCustomer()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: customer,
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.retrieve('blcus_1')

      expect(result).toEqual({
        data: customer,
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus_1',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('url-encodes the id when it contains special characters', async () => {
      const customer = createCustomer({ id: 'blcus/1 2' })
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: customer,
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.retrieve('blcus/1 2')

      expect(result).toEqual({
        data: customer,
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus%2F1%202',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })

  describe('update', () => {
    it('sends PATCH to the id URL with params as JSON body and returns the parsed customer', async () => {
      const customer = createCustomer({ name: 'GraceKennedy Group' })
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: customer,
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })
      const params = { name: 'GraceKennedy Group' }

      const result = await client.customers.update('blcus_1', params)

      expect(result).toEqual({
        data: customer,
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus_1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(params),
        })
      )
    })

    it('sends status: ARCHIVED through as the archive path', async () => {
      const customer = createCustomer({ status: 'ARCHIVED' })
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: customer,
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })
      const params = { status: 'ARCHIVED' as const }

      const result = await client.customers.update('blcus_1', params)

      expect(result).toEqual({
        data: customer,
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus_1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'ARCHIVED' }),
        })
      )
    })
  })

  describe('delete', () => {
    it('sends DELETE to the id URL and returns deleted customer tombstone', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          data: {
            object: 'customer',
            id: 'blcus_1',
            deleted: true,
          },
          error: null,
        })
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.delete('blcus_1')

      expect(result).toEqual({
        data: {
          object: 'customer',
          id: 'blcus_1',
          deleted: true,
        },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus_1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns data: null with preserved error code when fetch resolves an error envelope', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            data: null,
            error: {
              code: 'billing/customer-not-found',
              message: 'Customer blcus_missing was not found.',
            },
          },
          { status: 404 }
        )
      )
      const client = create876Client({
        baseUrl: 'https://billing.example.test',
        fetch: fetchMock,
      })

      const result = await client.customers.retrieve('blcus_missing')

      expect(result).toEqual({
        data: null,
        error: {
          code: 'billing/customer-not-found',
          message: 'Customer blcus_missing was not found.',
        },
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://billing.example.test/api/v1/customers/blcus_missing',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })
})
