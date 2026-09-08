/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { QuoteLifecycleActions } from './quote-lifecycle-actions'

const success = async () => ({ error: null })

describe('QuoteLifecycleActions', () => {
  it('shows send and draft editing actions for a valid draft', async () => {
    const onAction = vi.fn(success)
    const user = userEvent.setup()

    render(
      <QuoteLifecycleActions
        status="DRAFT"
        isExpired={false}
        canWrite
        canDelete
        canConvert
        editHref="/quotes/quo_1/edit"
        onAction={onAction}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onAction).toHaveBeenCalledWith('send')

    // Draft editing lives in the overflow menu, so it only exists once opened.
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    // Base UI's `render` merge keeps the menuitem role on the anchor, so the
    // href is asserted on the menu item rather than on a bare link role.
    expect(
      await screen.findByRole('menuitem', { name: 'Edit' })
    ).toHaveAttribute('href', '/quotes/quo_1/edit')
  })

  it('shows accept, decline, and resend for a valid sent quote', async () => {
    const onAction = vi.fn(success)
    const user = userEvent.setup()

    render(
      <QuoteLifecycleActions
        status="SENT"
        isExpired={false}
        canWrite
        canDelete={false}
        canConvert={false}
        onAction={onAction}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await user.click(screen.getByRole('button', { name: 'Decline' }))

    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Resend' }))

    expect(onAction).toHaveBeenNthCalledWith(1, 'accept')
    expect(onAction).toHaveBeenNthCalledWith(2, 'decline')
    expect(onAction).toHaveBeenNthCalledWith(3, 'send')
  })

  it('replaces mutable actions with explicit expiry once the decision window closes', async () => {
    const onAction = vi.fn(success)
    const user = userEvent.setup()

    render(
      <QuoteLifecycleActions
        status="SENT"
        isExpired
        canWrite
        canDelete
        canConvert
        editHref="/quotes/quo_1/edit"
        onAction={onAction}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Accept' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Decline' })
    ).not.toBeInTheDocument()
    // An expired quote has no menu actions at all, so editing is unreachable
    // rather than merely hidden behind a closed menu.
    expect(
      screen.queryByRole('button', { name: 'More actions' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark expired' }))
    expect(onAction).toHaveBeenCalledWith('expire')
  })

  it('offers conversion only for an accepted unconverted quote', async () => {
    const onAction = vi.fn(success)
    const user = userEvent.setup()

    render(
      <QuoteLifecycleActions
        status="ACCEPTED"
        isExpired={false}
        canWrite={false}
        canDelete={false}
        canConvert
        onAction={onAction}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Convert to invoice' }))
    expect(onAction).toHaveBeenCalledWith('convert')
  })

  it('shows the linked invoice instead of conversion after conversion', () => {
    render(
      <QuoteLifecycleActions
        status="ACCEPTED"
        isExpired={false}
        canWrite={false}
        canDelete={false}
        canConvert
        convertedInvoiceHref="/invoices/inv_1"
        onAction={success}
      />
    )

    expect(screen.getByRole('link', { name: 'View invoice' })).toHaveAttribute(
      'href',
      '/invoices/inv_1'
    )
    expect(
      screen.queryByRole('button', { name: 'Convert to invoice' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'More actions' })
    ).not.toBeInTheDocument()
  })

  it('renders no lifecycle actions for terminal unconverted states without authority', () => {
    render(
      <QuoteLifecycleActions
        status="DECLINED"
        isExpired={false}
        canWrite={false}
        canDelete={false}
        canConvert={false}
        onAction={success}
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
