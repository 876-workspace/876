import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
  contactFindFirst: vi.fn(),
  contactCreate: vi.fn(),
  contactUpdate: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}))

import { ensureCoreCustomerRows } from '../customers.repository'

type TransactionMock = {
  customer: {
    create: typeof mocks.customerCreate
    update: typeof mocks.customerUpdate
  }
  contact: {
    findFirst: typeof mocks.contactFindFirst
    create: typeof mocks.contactCreate
    update: typeof mocks.contactUpdate
  }
}

describe('ensureCoreCustomerRows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.customerCreate.mockResolvedValue({ id: 'cust_123' })
    mocks.customerUpdate.mockResolvedValue({ id: 'cust_123' })
    mocks.contactFindFirst.mockResolvedValue(null)
    mocks.contactCreate.mockResolvedValue({ id: 'contact_123' })
    mocks.contactUpdate.mockResolvedValue({ id: 'contact_123' })
    mocks.transaction.mockImplementation(
      async (run: (tx: TransactionMock) => unknown) =>
        run({
          customer: {
            create: mocks.customerCreate,
            update: mocks.customerUpdate,
          },
          contact: {
            findFirst: mocks.contactFindFirst,
            create: mocks.contactCreate,
            update: mocks.contactUpdate,
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

  it('refreshes the existing contact for the same 876 user instead of recreating it', async () => {
    mocks.contactFindFirst.mockResolvedValue({
      id: 'contact_existing',
      userId: 'user_owner',
      isPrimary: true,
    })

    await ensureCoreCustomerRows(
      { id: 'ten_platform', defaultCurrency: 'JMD', defaultLanguage: 'en' },
      'cust_123',
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
        primaryContact: { userId: 'user_owner', email: 'ada@example.com' },
      },
      'cust_123',
      'contact_new',
      1_787_050_000
    )

    // Recreating the row on every resync churns the contact id that quotes,
    // invoices, and CRM records point at.
    expect(mocks.contactCreate).not.toHaveBeenCalled()
    expect(mocks.contactUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.contactUpdate).toHaveBeenCalledWith({
      where: { id: 'contact_existing' },
      data: expect.objectContaining({
        userId: 'user_owner',
        email: 'ada@example.com',
        isPrimary: true,
      }),
    })
  })

  it('demotes a hand-added primary contact rather than deleting it', async () => {
    // The row that is primary belongs to no 876 user — someone typed it in.
    mocks.contactFindFirst.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) =>
        where.isPrimary
          ? { id: 'contact_typed', userId: null, isPrimary: true }
          : null
    )

    await ensureCoreCustomerRows(
      { id: 'ten_platform', defaultCurrency: 'JMD', defaultLanguage: 'en' },
      'cust_123',
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
        primaryContact: { userId: 'user_owner', email: 'ada@example.com' },
      },
      'cust_123',
      'contact_new',
      1_787_050_000
    )

    // Locally-entered people are the workspace's own data — Core promoting its
    // owner must not delete them.
    expect(mocks.contactUpdate).toHaveBeenCalledWith({
      where: { id: 'contact_typed' },
      data: { isPrimary: false, updatedAt: 1_787_050_000 },
    })
    expect(mocks.contactCreate).toHaveBeenCalledTimes(1)
    expect(mocks.contactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'contact_new', isPrimary: true }),
    })
  })

  it('demotes the primary contact when Core reports the party has none', async () => {
    mocks.contactFindFirst.mockResolvedValue({
      id: 'contact_typed',
      userId: null,
      isPrimary: true,
    })

    await ensureCoreCustomerRows(
      { id: 'ten_platform', defaultCurrency: 'JMD', defaultLanguage: 'en' },
      'cust_123',
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
        primaryContact: null,
      },
      'cust_123',
      'contact_new',
      1_787_050_000
    )

    expect(mocks.contactCreate).not.toHaveBeenCalled()
    expect(mocks.contactUpdate).toHaveBeenCalledWith({
      where: { id: 'contact_typed' },
      data: { isPrimary: false, updatedAt: 1_787_050_000 },
    })
  })

  it('leaves contacts untouched when the payload omits primaryContact', async () => {
    await ensureCoreCustomerRows(
      { id: 'ten_platform', defaultCurrency: 'JMD', defaultLanguage: 'en' },
      'cust_123',
      {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_customer',
        name: 'Test Org',
      },
      'cust_123',
      'contact_new',
      1_787_050_000
    )

    expect(mocks.contactFindFirst).not.toHaveBeenCalled()
    expect(mocks.contactCreate).not.toHaveBeenCalled()
    expect(mocks.contactUpdate).not.toHaveBeenCalled()
  })
})
