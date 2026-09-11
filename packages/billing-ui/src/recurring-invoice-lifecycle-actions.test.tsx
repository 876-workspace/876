/** @vitest-environment jsdom */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import {
  RecurringInvoiceLifecycleActions,
  type RecurringInvoiceLifecycleActionsProps,
} from './recurring-invoice-lifecycle-actions'

const success = async () => ({ error: null })

function renderActions(
  overrides: Partial<RecurringInvoiceLifecycleActionsProps> = {}
) {
  return render(
    <RecurringInvoiceLifecycleActions
      status="active"
      generatedCount={0}
      onPause={success}
      onResume={success}
      onStop={success}
      onDelete={success}
      {...overrides}
    />
  )
}

describe('RecurringInvoiceLifecycleActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows pause, stop, and delete for an active profile with no invoices', () => {
    // ARRANGE
    renderActions({ status: 'active', generatedCount: 0 })

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()

    // AFTER — testing-library performs cleanup.
  })

  it('shows resume instead of pause for a paused profile', () => {
    // ARRANGE
    renderActions({ status: 'paused' })

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('hides delete once the profile has generated invoices', () => {
    // ARRANGE
    renderActions({ status: 'active', generatedCount: 3 })

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('exposes only delete for a stopped profile that never generated', () => {
    // ARRANGE
    renderActions({ status: 'stopped', generatedCount: 0 })

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('renders nothing for an expired profile that already generated', () => {
    // ARRANGE
    const { container } = renderActions({ status: 'expired', generatedCount: 4 })

    // ACT — no interaction needed.

    // ASSERT
    expect(container).toBeEmptyDOMElement()

    // AFTER — testing-library performs cleanup.
  })

  it('pauses immediately without a confirmation dialog', async () => {
    // ARRANGE
    const onPause = vi.fn(success)
    const user = userEvent.setup()
    renderActions({ onPause })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    // ASSERT
    expect(onPause).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('confirms stop in a dialog before invoking the host callback', async () => {
    // ARRANGE
    const onStop = vi.fn(success)
    const user = userEvent.setup()
    renderActions({ onStop })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Stop schedule' }))

    // ASSERT
    expect(onStop).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('confirms delete in a dialog before invoking the host callback', async () => {
    // ARRANGE
    const onDelete = vi.fn(success)
    const user = userEvent.setup()
    renderActions({ onDelete })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete' })
    )

    // ASSERT
    expect(onDelete).toHaveBeenCalledTimes(1)

    // AFTER — testing-library performs cleanup.
  })

  it('renders the action error inline when the host callback fails', async () => {
    // ARRANGE
    const user = userEvent.setup()
    renderActions({ onPause: async () => ({ error: 'Already paused.' }) })

    // ACT
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    // ASSERT
    expect(screen.getByRole('alert')).toHaveTextContent('Already paused.')

    // AFTER — testing-library performs cleanup.
  })
})
