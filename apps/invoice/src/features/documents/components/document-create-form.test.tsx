/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  customerList: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    customers: { list: mocks.customerList },
    documents: { create: mocks.create },
  },
}))

import { DocumentCreateForm } from './document-create-form'

const customers = [
  {
    id: 'cus_123',
    name: 'Alejandra Reyes',
    companyName: null,
    email: 'alejandra@example.test',
    phone: '+15550100',
    workPhone: null,
    primaryContact: null,
  },
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
      unitAmount: '1500.07',
      discountAmount: '0',
      taxAmount: '0',
    },
  ],
}

/**
 * The customer control is a server-backed typeahead: it fetches nothing until
 * the character threshold is reached, so a test has to type rather than click.
 */
async function chooseCustomer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'ale')
  await user.click(
    await screen.findByRole('option', { name: /Alejandra Reyes/ })
  )
}

async function fillValidDocument(user: ReturnType<typeof userEvent.setup>) {
  await chooseCustomer(user)
  await user.type(screen.getByLabelText('Line 1 description'), 'Consulting')
  await user.type(screen.getByLabelText('Line 1 rate'), '1500.07')
}

describe('DocumentCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/failed', message: 'Invoice could not be saved.' },
    })
    mocks.customerList.mockResolvedValue({
      data: { data: customers },
      error: null,
    })
  })

  it('renders the shared line-item editor for manual invoice lines', async () => {
    await act(async () => {
      render(<DocumentCreateForm kind="invoice" />)
    })

    expect(screen.getByLabelText('Line 1 description')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Add line' })).not.toBeNull()
    // The catalogue column is always available now: even with no items loaded
    // up front, the picker can search the catalogue as the user types.
    expect(
      screen.getByRole('combobox', { name: 'Line 1 item' })
    ).toBeInTheDocument()
  })

  it('does not carry a local line-editor module beside the document form', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'src/features/documents/components/document-line-items-editor.tsx'
        )
      )
    ).toBe(false)
  })

  it('keeps the customer control loading while customer options resolve', async () => {
    await act(async () => {
      render(<DocumentCreateForm kind="invoice" />)
    })

    expect(
      screen.getByRole('combobox', { name: 'Customer' })
    ).not.toBeDisabled()
  })

  it('blocks the request when no customer is selected', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await screen.findByLabelText('Customer')
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    expect(
      screen.getByText('Select the customer this document is for.')
    ).not.toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('submits after the shared totals snapshot is ready', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await fillValidDocument(user)
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
  })

  it('hydrates and submits the customer selected by the page URL', async () => {
    const user = userEvent.setup()
    render(
      <DocumentCreateForm
        kind="invoice"
        initialCustomer={Promise.resolve({
          data: customers[0]!,
          error: null,
        })}
      />
    )

    expect(
      await screen.findByRole('combobox', { name: 'Customer' })
    ).toHaveValue('Alejandra Reyes')
    await user.type(screen.getByLabelText('Line 1 description'), 'Consulting')
    await user.type(screen.getByLabelText('Line 1 rate'), '1500.07')
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cus_123' }),
        '/api/invoices'
      )
    )
    expect(mocks.customerList).not.toHaveBeenCalled()
  })

  it('blocks submission and shows the shared totals message when totals are invalid', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await fillValidDocument(user)
    await user.type(screen.getByLabelText('Line 1 discount'), '2000')
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    expect(
      screen.getAllByText('A line discount cannot exceed the line subtotal.')
    ).not.toHaveLength(0)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('blocks the request when a line description is missing', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await chooseCustomer(user)
    await user.type(screen.getByLabelText('Line 1 rate'), '10')
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    expect(
      screen.getByText(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
    ).not.toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('blocks the request when a line rate is missing', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await chooseCustomer(user)
    await user.type(screen.getByLabelText('Line 1 description'), 'Consulting')
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    expect(
      screen.getByText(
        'Every line needs a description, positive quantity, and valid amounts.'
      )
    ).not.toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('posts schema-shaped minor-unit integers through the invoice client', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await fillValidDocument(user)
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      {
        customerId: 'cus_123',
        issueAt: expect.any(Number),
        notes: null,
        terms: null,
        lines: [
          {
            description: 'Consulting',
            quantity: 1,
            unitAmount: '150007',
            discountAmount: '0',
            taxAmount: '0',
          },
        ],
      },
      '/api/invoices'
    )
  })

  it('keeps entered values on screen when the invoice request is rejected', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="invoice" />)

    await fillValidDocument(user)
    await user.click(screen.getByRole('button', { name: 'Add invoice' }))

    expect(
      await screen.findByText('Invoice could not be saved.')
    ).not.toBeNull()
    expect(screen.getByLabelText('Line 1 description')).toHaveProperty(
      'value',
      'Consulting'
    )
    expect(screen.getByLabelText('Line 1 rate')).toHaveProperty(
      'value',
      '1500.07'
    )
  })

  it('renders quote-specific title and submission copy', async () => {
    render(<DocumentCreateForm kind="quote" />)

    expect(await screen.findByLabelText('Quote date')).not.toBeNull()
    expect(
      screen.getByText('Add every product or service included in this quote.')
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Add quote' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Add invoice' })).toBeNull()
  })

  it('posts a quote submission to the quote endpoint with the exact body', async () => {
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="quote" />)

    await fillValidDocument(user)
    fireEvent.change(screen.getByLabelText('Quote date'), {
      target: { value: '2026-09-06' },
    })
    await user.type(
      screen.getByLabelText('Customer note'),
      'Valid for 30 days.'
    )
    await user.click(screen.getByRole('button', { name: 'Add quote' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith(
      {
        customerId: 'cus_123',
        issueAt: 1_788_652_800,
        notes: 'Valid for 30 days.',
        terms: null,
        lines: [
          {
            description: 'Consulting',
            quantity: 1,
            unitAmount: '150007',
            discountAmount: '0',
            taxAmount: '0',
          },
        ],
      },
      '/api/quotes'
    )
  })

  it('keeps a failed quote form mounted with entered values and an inline error notice', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'billing/failed', message: 'Quote could not be saved.' },
    })
    const user = userEvent.setup()
    render(<DocumentCreateForm kind="quote" />)

    await fillValidDocument(user)
    await user.click(screen.getByRole('button', { name: 'Add quote' }))

    const notice = await screen.findByRole('status')
    const form = notice.closest('form')
    expect(notice.textContent).toBe('Quote could not be saved.')
    expect(form?.contains(notice)).toBe(true)
    expect(screen.getByLabelText('Line 1 description')).toHaveProperty(
      'value',
      'Consulting'
    )
    expect(screen.getByLabelText('Line 1 rate')).toHaveProperty(
      'value',
      '1500.07'
    )
    expect(document.querySelector('[data-sonner-toast]')).toBeNull()
  })

  it('renders the shared line-items editor in draft edit mode', async () => {
    render(
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={editableInvoice}
      />
    )

    expect(
      await screen.findByRole('button', { name: 'Add line' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Line 1 description')).toHaveValue(
      'Consulting'
    )
  })

  it('does not render the line-items editor for a restricted edit', () => {
    render(
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={{ ...editableInvoice, status: 'SENT' }}
      />
    )

    expect(screen.queryByRole('button', { name: 'Add line' })).toBeNull()
    expect(screen.queryByLabelText('Order number')).toBeNull()
  })

  it('submits the draft edit payload through the supplied handler', async () => {
    const submit = vi.fn().mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={editableInvoice}
        onSubmit={submit}
      />
    )

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
            unitAmount: '150007',
            discountAmount: '0',
            taxAmount: '0',
          },
        ],
      })
    )
  })

  it('keeps draft edit values mounted after a failed submission', async () => {
    const submit = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'billing/failed',
        message: 'Invoice could not be updated.',
      },
    })
    const user = userEvent.setup()
    render(
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={editableInvoice}
        onSubmit={submit}
      />
    )

    await user.click(
      await screen.findByRole('button', { name: 'Save invoice' })
    )

    expect(
      await screen.findByText('Invoice could not be updated.')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Line 1 description')).toHaveValue(
      'Consulting'
    )
    expect(document.querySelector('[data-sonner-toast]')).toBeNull()
  })

  it('submits only restricted fields for a sent invoice edit', async () => {
    const submit = vi.fn().mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(
      <DocumentCreateForm
        kind="invoice"
        mode="edit"
        initialDocument={{ ...editableInvoice, status: 'SENT' }}
        onSubmit={submit}
      />
    )

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
