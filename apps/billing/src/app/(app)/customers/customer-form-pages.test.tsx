/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FormField } from '@/types/form'

const mocks = vi.hoisted(() => ({
  createForm: vi.fn(),
  customerInvoicePreferenceForm: vi.fn(),
  customersRetrieve: vi.fn(),
  currenciesList: vi.fn(),
  notFound: vi.fn(),
  priceListsList: vi.fn(),
  requirePagePermission: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/components/billing-create-form', () => ({
  CreateForm: (props: { fields: FormField[] }) => {
    mocks.createForm(props)
    return <div data-testid="customer-form" />
  },
}))
vi.mock('@/components/customer-invoice-preference-form', () => ({
  CustomerInvoicePreferenceForm: (props: unknown) => {
    mocks.customerInvoicePreferenceForm(props)
    return <div data-testid="customer-invoice-preferences" />
  },
}))
vi.mock('@/lib/auth/billing-context', () => ({
  requirePagePermission: mocks.requirePagePermission,
}))
vi.mock('@/lib/service', () => ({
  service: {
    currencies: { list: mocks.currenciesList },
    customers: { retrieve: mocks.customersRetrieve },
    priceLists: { list: mocks.priceListsList },
  },
}))

import EditCustomerPage from './[customerId]/edit/page'
import NewCustomerPage from './new/page'

const CUSTOMER_FIELDS = [
  'customerNumber',
  'website',
  'taxRegistrationNumber',
  'notes',
] as const

function selectedCustomerFields(): FormField[] {
  const props = mocks.createForm.mock.calls[0]?.[0] as
    | { fields: FormField[] }
    | undefined

  return (
    props?.fields.filter((field) =>
      CUSTOMER_FIELDS.includes(field.name as (typeof CUSTOMER_FIELDS)[number])
    ) ?? []
  )
}

describe('customer form pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePagePermission.mockResolvedValue({ tenant: { id: 'ten_876' } })
    mocks.currenciesList.mockResolvedValue([])
    mocks.priceListsList.mockResolvedValue([])
    mocks.customersRetrieve.mockResolvedValue({
      id: 'cus_876',
      name: 'Island Supply Co.',
      email: 'billing@islandsupply.test',
      phone: '876-555-0112',
      customerNumber: 'C-876',
      website: 'islandsupply.test',
      taxRegistrationNumber: 'TRN-876',
      notes: 'Wholesale account.',
      defaultCurrency: 'JMD',
      status: 'ACTIVE',
      priceListId: null,
      taxBehaviorOverride: null,
      lateFeeExempt: false,
      invoiceNotes: null,
      invoiceTerms: null,
    })
  })

  it('configures the four commercial fields on customer creation', async () => {
    render(await NewCustomerPage())

    expect(selectedCustomerFields()).toEqual([
      { name: 'customerNumber', label: 'Customer number', type: 'text' },
      { name: 'website', label: 'Website', type: 'text' },
      {
        name: 'taxRegistrationNumber',
        label: 'Tax registration number',
        type: 'text',
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ])
  })

  it('configures editable values and null clearing for all four fields', async () => {
    render(
      await EditCustomerPage({
        params: Promise.resolve({ customerId: 'cus_876' }),
      })
    )

    expect(selectedCustomerFields()).toEqual([
      {
        name: 'customerNumber',
        label: 'Customer number',
        type: 'text',
        initialValue: 'C-876',
        emptyAsNull: true,
      },
      {
        name: 'website',
        label: 'Website',
        type: 'text',
        initialValue: 'islandsupply.test',
        emptyAsNull: true,
      },
      {
        name: 'taxRegistrationNumber',
        label: 'Tax registration number',
        type: 'text',
        initialValue: 'TRN-876',
        emptyAsNull: true,
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        initialValue: 'Wholesale account.',
        emptyAsNull: true,
      },
    ])
  })
})
