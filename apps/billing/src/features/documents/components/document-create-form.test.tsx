/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoiceCreate: vi.fn(),
  quoteCreate: vi.fn(),
  resolvePrice: vi.fn(),
  customerList: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client', () => ({
  client: {
    invoices: { create: mocks.invoiceCreate },
    customers: { list: mocks.customerList },
    priceLists: { resolve: mocks.resolvePrice },
    quotes: { create: mocks.quoteCreate },
  },
}))

import { DocumentCreateForm } from './document-create-form'

const customers = [
  {
    id: 'cus_123',
    name: 'Kingston Studio',
    customerKind: 'BUSINESS',
    companyName: 'Kingston Studio',
    salutation: null,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    workPhone: null,
    priceListId: null,
    primaryContact: null,
  },
]
const items = [
  {
    value: 'price:price_123',
    label: 'Consulting',
    itemId: 'item_123',
    priceId: 'price_123',
    defaultAmount: '12500',
    currency: 'JMD',
  },
]
const currencies = [
  { value: 'JMD', label: 'Jamaican dollar (JMD)', decimalPlaces: 2 },
]

const editableInvoice = {
  invoiceId: 'in_123',
  status: 'DRAFT' as const,
  values: {
    issueAt: 1_788_652_800,
    dueAt: 1_791_244_800,
    notes: 'Original note',
    terms: 'Net 30',
    orderNumber: 'PO-1',
    referenceNumber: 'REF-1',
    subject: 'September services',
  },
  lines: [
    {
      id: 'line-1',
      description: 'Consulting',
      quantity: '1',
      unitAmount: '125.00',
      discountAmount: '0',
      taxAmount: '0',
    },
  ],
}

function renderForm(
  overrides: Partial<React.ComponentProps<typeof DocumentCreateForm>> = {}
) {
  return render(
    <DocumentCreateForm
      kind="invoice"
      items={items}
      currencies={currencies}
      defaultCurrency="JMD"
      returnUrl="/invoices"
      {...overrides}
    />
  )
}

async function fillValidLine(user: ReturnType<typeof userEvent.setup>) {
  // The customer control is a server-backed typeahead: it fetches nothing
  // until the character threshold is reached, so type rather than click.
  await user.type(
    screen.getByRole('combobox', { name: 'Customer' }),
    'kingston'
  )
  await user.click(
    await screen.findByRole('option', { name: /Kingston Studio/ })
  )
  await user.type(screen.getByLabelText('Line 1 description'), 'Consulting')
  await user.type(screen.getByLabelText('Line 1 rate'), '125.00')
}

describe('DocumentCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.invoiceCreate.mockResolvedValue({
      data: { id: 'in_123' },
      error: null,
    })
    mocks.quoteCreate.mockResolvedValue({ data: { id: 'qt_123' }, error: null })
    mocks.resolvePrice.mockResolvedValue({ data: null, error: null })
    mocks.customerList.mockResolvedValue({
      data: { data: customers },
      error: null,
    })
  })

  // The line-item catalogue control is a SearchableSelect combobox, not a native
  // <select>, so it is opened and chosen by role. Mirrors the interaction in
  // packages/ui/src/components/searchable-select.test.tsx.
  async function chooseCatalogueOption(
    user: ReturnType<typeof userEvent.setup>,
    lineLabel: string,
    optionName: string | RegExp
  ) {
    await user.click(screen.getByRole('combobox', { name: lineLabel }))
    await user.click(await screen.findByRole('option', { name: optionName }))
  }

  it('renders every catalogue option in the shared editor', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('combobox', { name: 'Line 1 item' }))

    expect(
      await screen.findByRole('option', { name: /Consulting/ })
    ).toBeVisible()
    expect(screen.getByRole('option', { name: /One-off line/ })).toBeVisible()
  })

  it('fills an item line from the catalogue selection', async () => {
    const user = userEvent.setup()
    renderForm()

    await chooseCatalogueOption(user, 'Line 1 item', /Consulting/)

    expect(screen.getByLabelText('Line 1 description')).toHaveValue(
      'Consulting'
    )
    expect(screen.getByLabelText('Line 1 rate')).toHaveValue('125.00')
  })

  it('locks a catalogue price rate while a price list is selected', async () => {
    const user = userEvent.setup()
    renderForm({ priceLists: [{ value: 'pl_123', label: 'Standard' }] })

    await user.selectOptions(
      screen.getByLabelText('Price list (optional)'),
      'pl_123'
    )
    await chooseCatalogueOption(user, 'Line 1 item', /Consulting/)

    expect(screen.getByLabelText('Line 1 rate')).toBeDisabled()
  })

  it('resolves a selected price-list line in the host before rendering totals', async () => {
    const user = userEvent.setup()
    mocks.resolvePrice.mockResolvedValue({
      data: { amount: '25000', currency: 'JMD' },
      error: null,
    })
    renderForm({ priceLists: [{ value: 'pl_123', label: 'Standard' }] })

    await user.selectOptions(
      screen.getByLabelText('Price list (optional)'),
      'pl_123'
    )
    await chooseCatalogueOption(user, 'Line 1 item', /Consulting/)

    await waitFor(() =>
      expect(mocks.resolvePrice).toHaveBeenCalledWith('pl_123', 'price_123', 1)
    )
    expect(screen.getByTestId('line-total-0')).toHaveTextContent('JMD 250.00')
  })

  it('clears a resolved price-list subtotal after the list is removed', async () => {
    const user = userEvent.setup()
    mocks.resolvePrice.mockResolvedValue({
      data: { amount: '25000', currency: 'JMD' },
      error: null,
    })
    renderForm({ priceLists: [{ value: 'pl_123', label: 'Standard' }] })

    await user.selectOptions(
      screen.getByLabelText('Price list (optional)'),
      'pl_123'
    )
    await chooseCatalogueOption(user, 'Line 1 item', /Consulting/)
    await waitFor(() =>
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('JMD 250.00')
    )
    await user.selectOptions(screen.getByLabelText('Price list (optional)'), '')

    await waitFor(() =>
      expect(screen.getByTestId('line-total-0')).toHaveTextContent('JMD 125.00')
    )
  })

  it('shows the shared totals error and disables submission for an invalid discount', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Line 1 rate'), '100.00')
    await user.type(screen.getByLabelText('Line 1 discount'), '101.00')

    expect(
      await screen.findByText(
        'A line discount cannot exceed the line subtotal.'
      )
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Save draft invoice' })
    ).toBeDisabled()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('does not call the service when the customer is missing', async () => {
    const user = userEvent.setup()
    renderForm()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save draft invoice' })
      ).toBeEnabled()
    )

    await user.click(screen.getByRole('button', { name: 'Save draft invoice' }))

    expect(
      await screen.findByText('Select the customer this document is for.')
    ).toBeVisible()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('does not call the service when a line cannot produce a payload', async () => {
    const user = userEvent.setup()
    renderForm()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save draft invoice' })
      ).toBeEnabled()
    )
    await user.type(
      screen.getByRole('combobox', { name: 'Customer' }),
      'kingston'
    )
    await user.click(
      await screen.findByRole('option', { name: /Kingston Studio/ })
    )
    await user.click(screen.getByRole('button', { name: 'Save draft invoice' }))

    expect(
      await screen.findByText(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
    ).toBeVisible()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('submits a percentage discount as its resolved minor-unit amount', async () => {
    const user = userEvent.setup()
    renderForm()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save draft invoice' })
      ).toBeEnabled()
    )
    await fillValidLine(user)
    await user.selectOptions(
      screen.getByLabelText('Line 1 discount type'),
      'PERCENTAGE'
    )
    await user.type(screen.getByLabelText('Line 1 discount'), '10')

    await user.click(screen.getByRole('button', { name: 'Save draft invoice' }))

    await waitFor(() =>
      expect(mocks.invoiceCreate).toHaveBeenCalledWith({
        customerId: 'cus_123',
        priceListId: null,
        currency: 'JMD',
        issueAt: Math.floor(
          Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`) /
            1000
        ),
        notes: null,
        terms: null,
        lines: [
          {
            description: 'Consulting',
            quantity: 1,
            unitAmount: '12500',
            discountAmount: '1250',
            taxAmount: '0',
          },
        ],
        salespersonId: null,
        orderNumber: null,
        referenceNumber: null,
        subject: null,
        discountAmount: '0',
        shippingAmount: '0',
        adjustmentAmount: '0',
      })
    )
    expect(mocks.invoiceCreate).toHaveBeenCalledTimes(1)
  })

  it('navigates to the created invoice after a successful submission', async () => {
    const user = userEvent.setup()
    renderForm()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save draft invoice' })
      ).toBeEnabled()
    )
    await fillValidLine(user)

    await user.click(screen.getByRole('button', { name: 'Save draft invoice' }))

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith('/invoices/in_123')
    )
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('renders the shared line-items editor in draft edit mode', async () => {
    renderForm({ mode: 'edit', initialDocument: editableInvoice })

    expect(
      await screen.findByRole('button', { name: 'Add line' })
    ).toBeVisible()
    expect(screen.getByLabelText('Line 1 description')).toHaveValue(
      'Consulting'
    )
  })

  it('does not render a line-items editor for restricted invoice edits', () => {
    renderForm({
      mode: 'edit',
      initialDocument: { ...editableInvoice, status: 'SENT' },
    })

    expect(screen.queryByRole('button', { name: 'Add line' })).toBeNull()
    expect(screen.queryByLabelText('Order number')).toBeNull()
  })

  it('submits draft edit line changes through the supplied handler', async () => {
    const submit = vi.fn().mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    renderForm({
      mode: 'edit',
      initialDocument: editableInvoice,
      onSubmit: submit,
    })

    await user.click(
      await screen.findByRole('button', { name: 'Save invoice' })
    )

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        issueAt: 1_788_652_800,
        dueAt: 1_791_244_800,
        lines: [
          {
            description: 'Consulting',
            quantity: 1,
            unitAmount: '12500',
            discountAmount: '0',
            taxAmount: '0',
          },
        ],
      })
    )
  })

  it('keeps the entered draft edit values beside an inline submission failure', async () => {
    const submit = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invoice could not be updated.' },
    })
    const user = userEvent.setup()
    renderForm({
      mode: 'edit',
      initialDocument: editableInvoice,
      onSubmit: submit,
    })

    await user.click(
      await screen.findByRole('button', { name: 'Save invoice' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invoice could not be updated.'
    )
    expect(screen.getByLabelText('Line 1 description')).toHaveValue(
      'Consulting'
    )
    expect(document.querySelector('[data-sonner-toast]')).toBeNull()
  })

  it('sends only permitted fields through a restricted edit handler', async () => {
    const submit = vi.fn().mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    renderForm({
      mode: 'edit',
      initialDocument: { ...editableInvoice, status: 'SENT' },
      onSubmit: submit,
    })

    await user.click(screen.getByRole('button', { name: 'Save invoice' }))

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit).toHaveBeenCalledWith({
      dueAt: 1_791_244_800,
      notes: 'Original note',
      terms: 'Net 30',
      referenceNumber: 'REF-1',
    })
  })
})
