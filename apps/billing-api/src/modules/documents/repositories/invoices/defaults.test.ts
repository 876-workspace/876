import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  customer: vi.fn(),
  invoicePreference: vi.fn(),
  documentPreference: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    customer: { findFirst: mocks.customer },
    invoicePreference: { findUnique: mocks.invoicePreference },
    documentPreference: { findUnique: mocks.documentPreference },
  },
}))

import { resolveInvoiceDefaults } from './defaults'

describe('resolveInvoiceDefaults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.customer.mockResolvedValue({
      id: 'cust_123',
      taxBehaviorOverride: null,
      invoiceNotes: null,
      invoiceTerms: null,
      addresses: [],
    })
    mocks.invoicePreference.mockResolvedValue({
      defaultTaxBehavior: 'EXCLUSIVE',
      defaultNotes: null,
      defaultTerms: null,
    })
    mocks.documentPreference.mockResolvedValue(null)
  })

  it('returns null only when the active customer does not exist', async () => {
    mocks.customer.mockResolvedValue(null)

    await expect(
      resolveInvoiceDefaults('ten_123', 'cust_missing')
    ).resolves.toBeNull()
  })

  it('treats missing tenant preferences as a provisioning failure', async () => {
    mocks.invoicePreference.mockResolvedValue(null)

    await expect(resolveInvoiceDefaults('ten_123', 'cust_123')).rejects.toThrow(
      'Invoice preferences missing for Billing tenant ten_123.'
    )
  })
})
