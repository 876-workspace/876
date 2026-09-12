import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DocumentToolbar, type DocumentToolbarProps } from './document-toolbar'

const success = async () => ({ error: null })

function props(
  overrides: Partial<DocumentToolbarProps> = {}
): DocumentToolbarProps {
  return {
    status: 'OPEN',
    sharePath: '/invoices/inv_123',
    document: { number: 'INV-000123', totalAmount: '$1,234.00' },
    editHref: '/invoices/inv_123/edit',
    recordPaymentHref: '/payments/new?customerId=cus_1&invoiceId=inv_123',
    canEdit: true,
    canDelete: false,
    ...overrides,
  }
}

async function openMoreMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'More actions' }))
  return screen.findByRole('menu')
}

describe('DocumentToolbar', () => {
  beforeEach(() => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers Finalize as the draft primary action and fires it once', async () => {
    // ARRANGE
    const finalize = vi.fn(success)
    const user = userEvent.setup()
    render(
      <DocumentToolbar {...props({ status: 'DRAFT' })} onFinalize={finalize} />
    )

    // ACT
    await user.click(screen.getByRole('button', { name: 'Finalize' }))

    // ASSERT
    expect(finalize).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('omits Finalize once the invoice has left draft', () => {
    // ARRANGE
    render(
      <DocumentToolbar {...props({ status: 'OPEN' })} onFinalize={success} />
    )

    // ACT
    const finalize = screen.queryByRole('button', { name: 'Finalize' })

    // ASSERT
    expect(finalize).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('links Edit at the host href when the writer may edit', () => {
    // ARRANGE
    render(<DocumentToolbar {...props()} />)

    // ACT
    const edit = screen.getByRole('link', { name: 'Edit' })

    // ASSERT
    expect(edit).toHaveAttribute('href', '/invoices/inv_123/edit')

    // AFTER — testing-library performs cleanup.
  })

  it('omits Edit when the host does not allow editing', () => {
    // ARRANGE
    render(<DocumentToolbar {...props({ canEdit: false })} />)

    // ACT
    const edit = screen.queryByRole('link', { name: 'Edit' })

    // ASSERT
    expect(edit).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('emails the invoice from the Send menu', async () => {
    // ARRANGE
    const send = vi.fn(success)
    const user = userEvent.setup()
    render(<DocumentToolbar {...props({ status: 'OVERDUE' })} onSend={send} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Email' }))

    // ASSERT
    expect(send).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('opens WhatsApp with the invoice number, total and share link', async () => {
    // ARRANGE
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<DocumentToolbar {...props({ status: 'SENT' })} onSend={success} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(await screen.findByRole('menuitem', { name: 'WhatsApp' }))

    // ASSERT
    expect(open).toHaveBeenCalledTimes(1)
    const target = open.mock.calls[0]![0]
    expect(target).toBe(
      `https://wa.me/?text=${encodeURIComponent(
        `INV-000123 · $1,234.00\nhttp://localhost:3000/invoices/inv_123`
      )}`
    )
    expect(open.mock.calls[0]![1]).toBe('_blank')

    // AFTER — testing-library performs cleanup.
  })

  it('omits the Send menu for a draft', () => {
    // ARRANGE
    render(<DocumentToolbar {...props({ status: 'DRAFT' })} onSend={success} />)

    // ACT
    const send = screen.queryByRole('button', { name: 'Send' })

    // ASSERT
    expect(send).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('copies the absolute invoice link and confirms it', async () => {
    // ARRANGE
    const user = userEvent.setup()
    const writeText = vi.spyOn(window.navigator.clipboard, 'writeText')
    render(<DocumentToolbar {...props()} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Share' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Copy link' }))

    // ASSERT
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/invoices/inv_123'
    )
    expect(await screen.findByRole('button', { name: 'Share' })).toHaveTextContent(
      'Copied'
    )

    // AFTER — testing-library performs cleanup.
  })

  it('reports a local failure when the clipboard rejects the write', async () => {
    // ARRANGE
    const user = userEvent.setup()
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: vi.fn(async () => {
          throw new Error('denied')
        }),
      },
      configurable: true,
    })
    render(<DocumentToolbar {...props()} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Share' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Copy link' }))

    // ASSERT
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Copy the invoice link from the address bar.'
    )
    expect(
      screen.queryByRole('button', { name: 'Copied' })
    ).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('prints the document from the PDF/Print menu', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'PDF/Print' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Print' }))

    // ASSERT
    expect(window.print).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('saves as PDF through the browser print dialog', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'PDF/Print' }))
    const saveAsPdf = await screen.findByRole('menuitem', {
      name: /Save as PDF/,
    })

    // ASSERT — the item names the browser dialog rather than promising a file.
    expect(
      screen.getByText('Choose “Save as PDF” in the browser print dialog')
    ).toBeVisible()

    // ACT
    await user.click(saveAsPdf)

    // ASSERT
    expect(window.print).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('links Record payment at the host href for a collectible invoice', () => {
    // ARRANGE
    render(<DocumentToolbar {...props({ status: 'PARTIALLY_PAID' })} />)

    // ACT
    const recordPayment = screen.getByRole('link', {
      name: 'Record payment',
    })

    // ASSERT
    expect(recordPayment).toHaveAttribute(
      'href',
      '/payments/new?customerId=cus_1&invoiceId=inv_123'
    )

    // AFTER — testing-library performs cleanup.
  })

  it('omits Record payment for a draft', () => {
    // ARRANGE
    render(<DocumentToolbar {...props({ status: 'DRAFT' })} />)

    // ACT
    const recordPayment = screen.queryByRole('link', {
      name: 'Record payment',
    })

    // ASSERT
    expect(recordPayment).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('clones the invoice from the more menu', async () => {
    // ARRANGE
    const clone = vi.fn(success)
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} onClone={clone} />)

    // ACT
    await openMoreMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Clone' }))

    // ASSERT
    expect(clone).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('creates a recurring profile from the more menu with the supplied schedule', async () => {
    // ARRANGE
    const makeRecurring = vi.fn(success)
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} onMakeRecurring={makeRecurring} />)

    // ACT
    await openMoreMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: 'Make recurring' })
    )
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('Number of invoices'), {
      target: { value: '6' },
    })
    await user.click(screen.getByRole('button', { name: 'Create profile' }))

    // ASSERT
    expect(makeRecurring).toHaveBeenCalledTimes(1)
    expect(makeRecurring).toHaveBeenCalledWith({
      profileName: 'INV-000123',
      frequency: { intervalUnit: 'month', intervalCount: 1 },
      startAt: Date.parse('2026-10-01T00:00:00.000Z') / 1000,
      endAt: null,
      maxCycles: 6,
      generationMode: 'draft',
    })

    // AFTER — testing-library performs cleanup.
  })

  it('blocks a recurring profile without a profile name', async () => {
    // ARRANGE
    const makeRecurring = vi.fn(success)
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} onMakeRecurring={makeRecurring} />)

    // ACT
    await openMoreMenu(user)
    await user.click(
      await screen.findByRole('menuitem', { name: 'Make recurring' })
    )
    await user.clear(screen.getByLabelText('Profile name'))
    await user.click(screen.getByRole('button', { name: 'Create profile' }))

    // ASSERT
    expect(makeRecurring).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a profile name.')).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('passes the trimmed void reason to the host', async () => {
    // ARRANGE
    const voidInvoice = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(
      <DocumentToolbar {...props({ status: 'SENT' })} onVoid={voidInvoice} />
    )

    // ACT
    await openMoreMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Void' }))
    await user.type(
      screen.getByLabelText('Reason (optional)'),
      '  Duplicate of INV-000122  '
    )
    await user.click(screen.getByRole('button', { name: 'Void invoice' }))

    // ASSERT
    expect(voidInvoice).toHaveBeenCalledWith('Duplicate of INV-000122')

    // AFTER — testing-library performs cleanup.
  })

  it('requires a write-off reason before invoking the host', async () => {
    // ARRANGE
    const writeOff = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} onWriteOff={writeOff} />)

    // ACT
    await openMoreMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Write off' }))
    const submit = screen.getByRole('button', { name: 'Write off balance' })

    // ASSERT
    expect(submit).toBeDisabled()
    expect(writeOff).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('confirms before deleting the invoice', async () => {
    // ARRANGE
    const remove = vi.fn(success)
    const user = userEvent.setup()
    render(
      <DocumentToolbar
        {...props({ status: 'DRAFT', canDelete: true })}
        onDelete={remove}
      />
    )

    // ACT
    await openMoreMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // ASSERT
    expect(remove).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('shows Invoice preferences when the host has that page', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(
      <DocumentToolbar
        {...props()}
        onClone={success}
        preferencesHref="/subscriptions/invoice-preferences"
      />
    )

    // ACT
    await openMoreMenu(user)
    const preferences = await screen.findByRole('menuitem', {
      name: 'Invoice preferences',
    })

    // ASSERT
    expect(preferences).toHaveAttribute(
      'href',
      '/subscriptions/invoice-preferences'
    )

    // AFTER — testing-library performs cleanup.
  })

  it('omits Invoice preferences when the host has no such page', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(<DocumentToolbar {...props()} onClone={success} />)

    // ACT
    await openMoreMenu(user)
    await screen.findByRole('menuitem', { name: 'Clone' })

    // ASSERT
    expect(
      screen.queryByRole('menuitem', { name: 'Invoice preferences' })
    ).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('renders no control for capabilities without a backend', async () => {
    // ARRANGE
    const user = userEvent.setup()
    render(
      <DocumentToolbar
        {...props({ status: 'OVERDUE' })}
        onSend={success}
        onClone={success}
        onMakeRecurring={success}
        onWriteOff={success}
        preferencesHref="/subscriptions/invoice-preferences"
        canDelete
        onDelete={success}
      />
    )

    // ACT
    await openMoreMenu(user)
    await screen.findByRole('menuitem', { name: 'Clone' })

    // ASSERT
    expect(
      screen.queryByRole('menuitem', { name: /reminder/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/attachment/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/comment/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('separates the toolbar groups with dividers', () => {
    // ARRANGE
    const { container } = render(<DocumentToolbar {...props()} />)

    // ACT
    const dividers = container.querySelectorAll('[data-toolbar-divider]')

    // ASSERT
    // Edit │ Share + PDF/Print │ Record payment — three groups, two dividers.
    // Share and PDF/Print sit in one group because they are the two controls
    // that depend on neither status nor permission, and they share a component.
    expect(dividers).toHaveLength(2)
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      ['Edit', 'Record payment']
    )

    // AFTER — testing-library performs cleanup.
  })

  it('omits the more-actions menu when it would hold no items', () => {
    // ARRANGE
    render(
      <DocumentToolbar
        {...props({ canEdit: false, recordPaymentHref: undefined })}
      />
    )

    // ACT
    const more = screen.queryByLabelText('More actions')

    // ASSERT
    expect(more).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })
})
