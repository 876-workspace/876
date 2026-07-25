import { describe, expect, it, vi } from 'vitest'

import type { BillingIntegrationClient } from '@876/billing/integration'

import { ensureSharedCoreUserCustomer } from './customers'

const sharedCustomer = {
  object: 'customer' as const,
  id: 'cus_shared',
  source: null,
  customerType: 'CORE_USER' as const,
  customerKind: 'INDIVIDUAL' as const,
  organizationId: null,
  userId: 'usr_1',
  externalReference: null,
  name: 'Ada Lovelace',
  salutation: null,
  firstName: 'Ada',
  lastName: 'Lovelace',
  companyName: null,
  email: 'ada@example.test',
  phone: null,
  workPhone: null,
  billingAddress: null,
  metadata: null,
  defaultCurrency: 'JMD',
  language: 'en',
  outstandingReceivable: '0',
  unusedCredits: '0',
  coreSyncedAt: 1,
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
  // Individuals are their own contact — integration payloads leave this null.
  primaryContact: null,
}

function client(options?: { lists?: unknown[]; create?: unknown }) {
  return {
    customers: {
      list: vi
        .fn()
        .mockResolvedValueOnce(
          options?.lists?.[0] ?? {
            data: {
              object: 'list',
              data: [],
              has_more: false,
              total_count: 0,
              url: '/customers',
            },
            error: null,
          }
        )
        .mockResolvedValueOnce(options?.lists?.[1]),
      create: vi
        .fn()
        .mockResolvedValue(
          options?.create ?? { data: sharedCustomer, error: null }
        ),
    },
  } as unknown as BillingIntegrationClient
}

const user = {
  id: 'usr_1',
  email: 'ada@example.test',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

describe('ensureSharedCoreUserCustomer', () => {
  it('reuses a customer created through Billing or another product', async () => {
    const finance = client({
      lists: [
        {
          data: {
            object: 'list',
            data: [sharedCustomer],
            has_more: false,
            total_count: 1,
            url: '/customers',
          },
          error: null,
        },
      ],
    })

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.data?.id).toBe('cus_shared')
    expect(finance.customers.list).toHaveBeenCalledWith('org_1', {
      limit: 2,
      userId: 'usr_1',
    })
    expect(finance.customers.create).not.toHaveBeenCalled()
  })

  it('creates a missing shared customer with a stable retry key', async () => {
    const finance = client()

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.data?.id).toBe('cus_shared')
    expect(finance.customers.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        customerType: 'CORE_USER',
        userId: 'usr_1',
        name: 'Ada Lovelace',
        sourceExternalReference: 'couriers:core-user:usr_1',
      }),
      { idempotencyKey: 'couriers:core-user:usr_1' }
    )
  })

  it('creates with first and last name so Billing can render the party snapshot', async () => {
    const finance = client()

    await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(finance.customers.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.test',
        customerKind: 'INDIVIDUAL',
      }),
      expect.any(Object)
    )
  })

  it('propagates a non-conflict create error after a fruitless race recheck', async () => {
    const finance = client({
      lists: [
        {
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: 0,
            url: '/customers',
          },
          error: null,
        },
        {
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: 0,
            url: '/customers',
          },
          error: null,
        },
      ],
      create: {
        data: null,
        error: {
          code: 'billing/unavailable',
          message: 'Billing is offline.',
        },
      },
    })

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('billing/unavailable')
    // Initial miss + post-create race recheck; neither finds a row.
    expect(finance.customers.list).toHaveBeenCalledTimes(2)
  })

  it('rejects when more than one Billing customer shares the same core user', async () => {
    const finance = client({
      lists: [
        {
          data: {
            object: 'list',
            data: [sharedCustomer, { ...sharedCustomer, id: 'cus_dup' }],
            has_more: false,
            total_count: 2,
            url: '/customers',
          },
          error: null,
        },
      ],
    })

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('couriers/ambiguous-billing-customer')
    expect(finance.customers.create).not.toHaveBeenCalled()
  })

  it('propagates a list error before attempting create', async () => {
    const finance = client({
      lists: [
        {
          data: null,
          error: { code: 'billing/unauthorized', message: 'No access.' },
        },
      ],
    })

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.error?.code).toBe('billing/unauthorized')
    expect(finance.customers.create).not.toHaveBeenCalled()
  })

  it('adopts the concurrent winner after a unique-core-reference race', async () => {
    const finance = client({
      lists: [
        {
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: 0,
            url: '/customers',
          },
          error: null,
        },
        {
          data: {
            object: 'list',
            data: [sharedCustomer],
            has_more: false,
            total_count: 1,
            url: '/customers',
          },
          error: null,
        },
      ],
      create: {
        data: null,
        error: { code: 'billing/conflict', message: 'Already exists.' },
      },
    })

    const result = await ensureSharedCoreUserCustomer(finance, 'org_1', user)

    expect(result.data?.id).toBe('cus_shared')
    expect(finance.customers.list).toHaveBeenCalledTimes(2)
  })
})
