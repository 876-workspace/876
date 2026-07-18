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
      user_id: 'usr_1',
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
