/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InvoiceLifecycleActions } from './invoice-lifecycle-actions'

const success = async () => ({ error: null })

describe('InvoiceLifecycleActions', () => {
  it('shows finalize and draft editing actions only for a draft', async () => {
    // ARRANGE
    const finalize = vi.fn(success)
    const user = userEvent.setup()
    render(
      <InvoiceLifecycleActions
        status="DRAFT"
        editHref="/invoices/inv_1/edit"
        canEdit
        canDelete
        onFinalize={finalize}
        onDelete={success}
      />
    )

    // ACT
    await user.click(screen.getByRole('button', { name: 'Finalize' }))

    // ASSERT
    expect(finalize).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/invoices/inv_1/edit'
    )
    expect(screen.queryByRole('button', { name: 'Write off' })).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('keeps mark-sent and write-off actions available for an overdue invoice', () => {
    // ARRANGE
    render(
      <InvoiceLifecycleActions
        status="OVERDUE"
        onSend={success}
        onVoid={async () => ({ error: null })}
        onWriteOff={async () => ({ error: null })}
      />
    )

    // ACT
    const send = screen.getByRole('button', { name: 'Mark sent' })

    // ASSERT
    expect(send).toBeVisible()
    expect(screen.getByRole('button', { name: 'Write off' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('shows void for a plain open invoice when the host supplies the action', () => {
    // ARRANGE
    render(
      <InvoiceLifecycleActions
        status="OPEN"
        onVoid={async () => ({ error: null })}
      />
    )

    // ACT
    const voidAction = screen.getByRole('button', { name: 'Void' })

    // ASSERT
    expect(voidAction).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('requires a write-off reason before invoking the host callback', async () => {
    // ARRANGE
    const writeOff = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<InvoiceLifecycleActions status="OPEN" onWriteOff={writeOff} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Write off' }))
    const submit = screen.getByRole('button', { name: 'Write off balance' })

    // ASSERT
    expect(submit).toBeDisabled()
    expect(writeOff).not.toHaveBeenCalled()

    // AFTER — testing-library performs cleanup.
  })

  it('passes the trimmed write-off reason to the host callback', async () => {
    // ARRANGE
    const writeOff = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    render(<InvoiceLifecycleActions status="OPEN" onWriteOff={writeOff} />)

    // ACT
    await user.click(screen.getByRole('button', { name: 'Write off' }))
    await user.type(
      screen.getByLabelText('Reason'),
      '  Customer permanently closed  '
    )
    await user.click(screen.getByRole('button', { name: 'Write off balance' }))

    // ASSERT
    expect(writeOff).toHaveBeenCalledWith('Customer permanently closed')

    // AFTER — testing-library performs cleanup.
  })

  it('shows only print and mark-sent lifecycle actions for a paid invoice', () => {
    // ARRANGE
    render(<InvoiceLifecycleActions status="PAID" onSend={success} />)

    // ACT
    const print = screen.getByRole('button', { name: 'Print' })

    // ASSERT
    expect(print).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mark sent' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Write off' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })

  it('exposes no collection lifecycle commands for void and uncollectible invoices', () => {
    // ARRANGE
    const { rerender } = render(<InvoiceLifecycleActions status="VOID" />)

    // ACT
    rerender(<InvoiceLifecycleActions status="UNCOLLECTIBLE" />)

    // ASSERT
    expect(screen.queryByRole('button', { name: 'Write off' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark sent' })).not.toBeInTheDocument()

    // AFTER — testing-library performs cleanup.
  })
})