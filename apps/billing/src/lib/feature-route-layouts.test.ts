import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireBillingFeature: vi.fn() }))

vi.mock('@/lib/auth/billing-context', () => ({
  requireBillingFeature: mocks.requireBillingFeature,
}))

import CreditNotesLayout from '../app/(app)/(sales)/credit-notes/layout'
import EstimatesLayout from '../app/(app)/(sales)/estimates/layout'
import ExpensesLayout from '../app/(app)/purchases/expenses/layout'
import PurchasesLayout from '../app/(app)/purchases/layout'
import VendorsLayout from '../app/(app)/purchases/vendors/layout'

describe('Billing feature route layouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireBillingFeature.mockResolvedValue(undefined)
  })

  it.each([
    ['Estimates', EstimatesLayout, 'estimates'],
    ['Credit notes', CreditNotesLayout, 'invoices'],
    ['Purchases', PurchasesLayout, 'purchases'],
    ['Vendors', VendorsLayout, 'vendors'],
    ['Expenses', ExpensesLayout, 'expenses'],
  ] as const)(
    '%s requires its matching capability',
    async (_, Layout, feature) => {
      await expect(Layout({ children: 'content' })).resolves.toBe('content')
      expect(mocks.requireBillingFeature).toHaveBeenCalledWith(feature)
    }
  )
})
