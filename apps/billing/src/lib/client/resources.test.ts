import { beforeEach, describe, expect, it, vi } from 'vitest'

import { client } from './index'
import { addons } from './addons'
import { auth } from './auth'
import { bankAccounts } from './bank-accounts'
import { bankTransactions } from './bank-transactions'
import { creditNotes } from './credit-notes'
import { currencies } from './currencies'
import { customers } from './customers'
import { discounts } from './discounts'
import { invoices } from './invoices'
import { invoicePreferences } from './invoice-preferences'
import { items } from './items'
import { members } from './members'
import { paymentModes } from './payment-modes'
import { paymentProviders } from './payment-providers'
import { paymentTerms } from './payment-terms'
import { payments } from './payments'
import { plans } from './plans'
import { prices } from './prices'
import { priceLists } from './price-lists'
import { products } from './products'
import { quotes } from './quotes'
import { refunds } from './refunds'
import { roles } from './roles'
import { salespeople } from './salespeople'
import { subscriptions } from './subscriptions'
import { taxAuthorities } from './tax-authorities'
import { taxRates } from './tax-rates'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

type RequestCase = {
  name: string
  act: () => unknown
  url: string
  init: RequestInit
}

const EMPTY = {} as never

const cases: RequestCase[] = [
  {
    name: 'switches the active organization',
    act: () => auth.switchOrganization({ organizationId: 'org_123' }),
    url: '/api/auth/switch-org',
    init: { method: 'POST', body: '{"organizationId":"org_123"}' },
  },
  {
    name: 'creates a bank account',
    act: () => bankAccounts.create(EMPTY),
    url: '/api/v1/banking/accounts',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a bank account',
    act: () => bankAccounts.update('ba /1', EMPTY),
    url: '/api/v1/banking/accounts/ba%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a bank account',
    act: () => bankAccounts.delete('ba /1'),
    url: '/api/v1/banking/accounts/ba%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a bank transaction',
    act: () => bankTransactions.create('ba /1', EMPTY),
    url: '/api/v1/banking/accounts/ba%20%2F1/transactions',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a bank transaction',
    act: () => bankTransactions.update('ba /1', 'btxn /1', EMPTY),
    url: '/api/v1/banking/accounts/ba%20%2F1/transactions/btxn%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a bank transaction',
    act: () => bankTransactions.delete('ba /1', 'btxn /1'),
    url: '/api/v1/banking/accounts/ba%20%2F1/transactions/btxn%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a credit note',
    act: () => creditNotes.create(EMPTY),
    url: '/api/v1/credit-notes',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'applies a credit note',
    act: () => creditNotes.apply('cn /1', EMPTY),
    url: '/api/v1/credit-notes/cn%20%2F1/apply',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'voids a credit note',
    act: () => creditNotes.void('cn /1'),
    url: '/api/v1/credit-notes/cn%20%2F1/void',
    init: { method: 'POST' },
  },
  {
    name: 'enables a currency',
    act: () => currencies.enable(EMPTY),
    url: '/api/v1/currencies',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'sets the default currency',
    act: () => currencies.setDefault(EMPTY),
    url: '/api/v1/currencies',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'creates a customer',
    act: () => customers.create(EMPTY),
    url: '/api/v1/customers',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a customer',
    act: () => customers.retrieve('cus /1'),
    url: '/api/v1/customers/cus%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a customer',
    act: () => customers.update('cus /1', EMPTY),
    url: '/api/v1/customers/cus%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a customer',
    act: () => customers.delete('cus /1'),
    url: '/api/v1/customers/cus%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates an invoice',
    act: () => invoices.create(EMPTY),
    url: '/api/v1/invoices',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'finalizes an invoice',
    act: () => invoices.finalize('inv /1', EMPTY),
    url: '/api/v1/invoices/inv%20%2F1/finalize',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'voids an invoice',
    act: () => invoices.void('inv /1', EMPTY),
    url: '/api/v1/invoices/inv%20%2F1/void',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves invoice preferences',
    act: () => invoicePreferences.retrieve(),
    url: '/api/v1/invoice-preferences',
    init: { method: 'GET' },
  },
  {
    name: 'updates invoice preferences',
    act: () => invoicePreferences.update(EMPTY),
    url: '/api/v1/invoice-preferences',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'assesses invoice late fees',
    act: () => invoicePreferences.assessLateFees(),
    url: '/api/v1/invoice-preferences/assess-late-fees',
    init: { method: 'POST' },
  },
  {
    name: 'creates a coupon',
    act: () => discounts.coupons.create(EMPTY),
    url: '/api/v1/discounts/coupons',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a coupon',
    act: () => discounts.coupons.retrieve('cpn /1'),
    url: '/api/v1/discounts/coupons/cpn%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a coupon',
    act: () => discounts.coupons.update('cpn /1', EMPTY),
    url: '/api/v1/discounts/coupons/cpn%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a coupon',
    act: () => discounts.coupons.delete('cpn /1'),
    url: '/api/v1/discounts/coupons/cpn%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a promotion code',
    act: () => discounts.promotionCodes.create(EMPTY),
    url: '/api/v1/discounts/promotion-codes',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a payment provider connection',
    act: () => paymentProviders.connections.create(EMPTY),
    url: '/api/v1/payment-providers/connections',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a payment term',
    act: () => paymentTerms.create(EMPTY),
    url: '/api/v1/payment-terms',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a salesperson',
    act: () => salespeople.create(EMPTY),
    url: '/api/v1/salespeople',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a payment mode',
    act: () => paymentModes.create(EMPTY),
    url: '/api/v1/payments/modes',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a payment mode',
    act: () => paymentModes.update('pmode /1', EMPTY),
    url: '/api/v1/payments/modes/pmode%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a payment mode',
    act: () => paymentModes.delete('pmode /1'),
    url: '/api/v1/payments/modes/pmode%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a payment',
    act: () => payments.create(EMPTY),
    url: '/api/v1/payments',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a payment',
    act: () => payments.update('pay /1', EMPTY),
    url: '/api/v1/payments/pay%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a payment',
    act: () => payments.delete('pay /1'),
    url: '/api/v1/payments/pay%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'retrieves an invoice',
    act: () => invoices.retrieve('inv /1'),
    url: '/api/v1/invoices/inv%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates an invoice',
    act: () => invoices.update('inv /1', EMPTY),
    url: '/api/v1/invoices/inv%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes an invoice',
    act: () => invoices.delete('inv /1'),
    url: '/api/v1/invoices/inv%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates an item',
    act: () => items.create(EMPTY),
    url: '/api/v1/items',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves an item',
    act: () => items.retrieve('item /1'),
    url: '/api/v1/items/item%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates an item',
    act: () => items.update('item /1', EMPTY),
    url: '/api/v1/items/item%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes an item',
    act: () => items.delete('item /1'),
    url: '/api/v1/items/item%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'updates a member',
    act: () => members.update('user /1', EMPTY),
    url: '/api/v1/members/user%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'creates a plan',
    act: () => plans.create(EMPTY),
    url: '/api/v1/plans',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a plan',
    act: () => plans.retrieve('plan /1'),
    url: '/api/v1/plans/plan%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a plan',
    act: () => plans.update('plan /1', EMPTY),
    url: '/api/v1/plans/plan%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a plan',
    act: () => plans.delete('plan /1'),
    url: '/api/v1/plans/plan%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'clones a plan',
    act: () => plans.clone('plan /1', EMPTY),
    url: '/api/v1/plans/plan%20%2F1/clone',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a price',
    act: () => prices.create(EMPTY),
    url: '/api/v1/prices',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates an add-on',
    act: () => addons.create(EMPTY),
    url: '/api/v1/addons',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves an add-on',
    act: () => addons.retrieve('addon /1'),
    url: '/api/v1/addons/addon%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates an add-on',
    act: () => addons.update('addon /1', EMPTY),
    url: '/api/v1/addons/addon%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes an add-on',
    act: () => addons.delete('addon /1'),
    url: '/api/v1/addons/addon%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'clones an add-on',
    act: () => addons.clone('addon /1', EMPTY),
    url: '/api/v1/addons/addon%20%2F1/clone',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates an add-on plan association',
    act: () => addons.upsertAssociation('addon /1', EMPTY),
    url: '/api/v1/addons/addon%20%2F1/associations',
    init: { method: 'PUT', body: '{}' },
  },
  {
    name: 'atomically updates add-on plan associations',
    act: () => addons.upsertAssociations('addon /1', []),
    url: '/api/v1/addons/addon%20%2F1/associations',
    init: {
      method: 'PUT',
      body: JSON.stringify({ associations: [] }),
    },
  },
  {
    name: 'creates a price list',
    act: () => priceLists.create(EMPTY),
    url: '/api/v1/price-lists',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a price list',
    act: () => priceLists.retrieve('plist /1'),
    url: '/api/v1/price-lists/plist%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a price list',
    act: () => priceLists.update('plist /1', EMPTY),
    url: '/api/v1/price-lists/plist%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a price list',
    act: () => priceLists.delete('plist /1'),
    url: '/api/v1/price-lists/plist%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'resolves a price list amount',
    act: () => priceLists.resolve('plist /1', 'prc_1', 3),
    url: '/api/v1/price-lists/plist%20%2F1/resolve',
    init: {
      method: 'POST',
      body: JSON.stringify({ priceId: 'prc_1', quantity: 3 }),
    },
  },
  {
    name: 'retrieves a price',
    act: () => prices.retrieve('prc /1'),
    url: '/api/v1/prices/prc%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a price',
    act: () => prices.update('prc /1', EMPTY),
    url: '/api/v1/prices/prc%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a price',
    act: () => prices.delete('prc /1'),
    url: '/api/v1/prices/prc%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a product',
    act: () => products.create(EMPTY),
    url: '/api/v1/products',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a product',
    act: () => products.retrieve('prod /1'),
    url: '/api/v1/products/prod%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a product',
    act: () => products.update('prod /1', EMPTY),
    url: '/api/v1/products/prod%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a product',
    act: () => products.delete('prod /1'),
    url: '/api/v1/products/prod%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a quote',
    act: () => quotes.create(EMPTY),
    url: '/api/v1/quotes',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a quote',
    act: () => quotes.retrieve('qt /1'),
    url: '/api/v1/quotes/qt%20%2F1',
    init: { method: 'GET' },
  },
  {
    name: 'updates a quote',
    act: () => quotes.update('qt /1', EMPTY),
    url: '/api/v1/quotes/qt%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a quote',
    act: () => quotes.delete('qt /1'),
    url: '/api/v1/quotes/qt%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a refund',
    act: () => refunds.create(EMPTY),
    url: '/api/v1/refunds',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a role',
    act: () => roles.create(EMPTY),
    url: '/api/v1/roles',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a role',
    act: () => roles.update('role /1', EMPTY),
    url: '/api/v1/roles/role%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a role',
    act: () => roles.del('role /1'),
    url: '/api/v1/roles/role%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a subscription',
    act: () => subscriptions.create(EMPTY),
    url: '/api/v1/subscriptions',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a tax authority',
    act: () => taxAuthorities.create(EMPTY),
    url: '/api/v1/tax-authorities',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a tax authority',
    act: () => taxAuthorities.update('taxa /1', EMPTY),
    url: '/api/v1/tax-authorities/taxa%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'creates a tax rate',
    act: () => taxRates.create(EMPTY),
    url: '/api/v1/tax-rates',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a tax rate',
    act: () => taxRates.update('taxr /1', EMPTY),
    url: '/api/v1/tax-rates/taxr%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
]

describe('Billing browser resource clients', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it.each(cases)('$name', async ({ act, url, init }) => {
    await act()

    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledWith(url, init)
  })

  it('exposes every resource facade on the root client', () => {
    expect(client).toEqual({
      addons,
      auth,
      bankAccounts,
      bankTransactions,
      creditNotes,
      currencies,
      customers,
      discounts,
      invoices,
      invoicePreferences,
      members,
      paymentModes,
      paymentProviders,
      paymentTerms,
      payments,
      items,
      plans,
      priceLists,
      prices,
      products,
      quotes,
      refunds,
      subscriptions,
      roles,
      salespeople,
      taxAuthorities,
      taxRates,
    })
  })

  it('keeps the role delete alias bound to the canonical function', () => {
    expect(roles.delete).toBe(roles.del)
  })
})
