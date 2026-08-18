import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
  contactDeleteMany: vi.fn(),
  contactCreate: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}))

import { ensureCoreCustomerRows } from '../customers.repository'

describe('ensureCoreCustomerRows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.customerCreate.mockResolvedValue({ id: 'cust_123' })
    mocks.customerUpdate.mockResolvedValue({ id: 'cust_123' })
    mocks.contactDeleteMany.mockResolvedValue({ count: 0 })
    mocks.contactCreate.mockResolvedValue({ id: 'contact_123' })
    mocks.transaction.mockImplementation(async (run) =>
      run({
        customer: {
          create: mocks.customerCreate,
          update: mocks.customerUpdate,
        },
        contact: {
          deleteMany: mocks.contactDeleteMany,
          create: mocks.contactCreate,
        },
      })
    )
  })

  it('stores Core primaryContact.phone as the contact mobile phone', async () => {
    await ensureCoreCustomerRows(
      {
        id: 'ten_platform',
        defaultCurrency: 'JMD',
        defaultLanguage: 'en',
      },
      null,
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
        primaryContact: {
          userId: 'user_owner',
          email: 'owner@example.com',
          phone: '+18765550123',
        },
      },
      'cust_123',
      'contact_123',
      1_787_050_000
    )

    expect(mocks.contactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'cust_123',
        userId: 'user_owner',
        mobilePhone: '+18765550123',
      }),
    })
  })

  it('prefers an explicit mobilePhone over the generic phone alias', async () => {
    await ensureCoreCustomerRows(
      {
        id: 'ten_platform',
        defaultCurrency: 'JMD',
        defaultLanguage: 'en',
      },
      null,
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
        primaryContact: {
          phone: '+18765550123',
          mobilePhone: '+18765550999',
        },
      },
      'cust_123',
      'contact_123',
      1_787_050_000
    )

    expect(mocks.contactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ mobilePhone: '+18765550999' }),
    })
  })
})
