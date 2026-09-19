import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'

const mocks = vi.hoisted(() => ({ requireBillingFeature: vi.fn() }))

vi.mock('@/lib/auth/billing-context', () => ({
  requireBillingFeature: mocks.requireBillingFeature,
}))

import CreditNotesLayout from '../../app/(app)/(sales)/credit-notes/layout'
import ExpensesLayout from '../../app/(app)/purchases/expenses/layout'
import PurchasesLayout from '../../app/(app)/purchases/layout'
import VendorsLayout from '../../app/(app)/purchases/vendors/layout'
import RecurringInvoicesLayout from '../../app/(app)/(sales)/recurring-invoices/layout'

describe('Billing feature route layouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireBillingFeature.mockResolvedValue(undefined)
  })

  describe('pass-through guards', () => {
    it.each([
      ['Purchases', PurchasesLayout, 'purchases'],
      ['Expenses', ExpensesLayout, 'expenses'],
    ] as const)(
      '%s requires its matching capability and renders its children unchanged',
      async (_, Layout, feature) => {
        await expect(Layout({ children: 'content' })).resolves.toBe('content')

        expect(mocks.requireBillingFeature).toHaveBeenCalledTimes(1)
        expect(mocks.requireBillingFeature).toHaveBeenCalledWith(feature)
      }
    )
  })

  describe('list/detail guards', () => {
    // These layouts own their section shell so the list stays mounted while a
    // record opens beside it. The capability guard still has to run first.
    it.each([
      ['Credit notes', CreditNotesLayout, 'invoices'],
      ['Recurring invoices', RecurringInvoicesLayout, 'invoices'],
      ['Vendors', VendorsLayout, 'vendors'],
    ] as const)(
      '%s requires its matching capability and hands children to the section',
      async (_, Layout, feature) => {
        const element = await Layout({ children: 'content' })

        expect(mocks.requireBillingFeature).toHaveBeenCalledTimes(1)
        expect(mocks.requireBillingFeature).toHaveBeenCalledWith(feature)

        expect(isValidElement(element)).toBe(true)
        const props = (element as { props: { children?: unknown } }).props
        expect(props.children).toBe('content')
      }
    )

    it('does not render when the capability check rejects', async () => {
      mocks.requireBillingFeature.mockRejectedValue(new Error('NEXT_REDIRECT'))

      await expect(CreditNotesLayout({ children: 'content' })).rejects.toThrow(
        'NEXT_REDIRECT'
      )
    })
  })
})
