import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaymentMode } from '@876/billing'

import { PaymentModeSettingsPanel } from './payment-mode-settings-panel'

function createMode(overrides: Partial<PaymentMode> = {}): PaymentMode {
  return {
    object: 'payment_mode',
    id: 'pm_bank_transfer',
    name: 'Bank transfer',
    isDefault: false,
    isActive: true,
    isSystem: false,
    createdAt: 1_757_000_000,
    updatedAt: 1_757_000_000,
    ...overrides,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof PaymentModeSettingsPanel>[0]> = {}
) {
  const onCreate = vi.fn().mockResolvedValue({ error: null })
  const onUpdate = vi.fn().mockResolvedValue({ error: null })
  const onDelete = vi.fn().mockResolvedValue({ error: null })
  const onSuccess = vi.fn()

  render(
    <PaymentModeSettingsPanel
      modes={[createMode()]}
      canManage
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onSuccess={onSuccess}
      {...props}
    />
  )

  return { onCreate, onUpdate, onDelete, onSuccess }
}

describe('PaymentModeSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders each payment mode by name', () => {
    renderPanel({
      modes: [createMode(), createMode({ id: 'pm_cash', name: 'Cash' })],
    })

    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('renders an empty state rather than a bare list when there are no modes', () => {
    renderPanel({ modes: [] })

    expect(screen.getByText('No payment modes')).toBeInTheDocument()
  })

  it('marks the default mode so it is distinguishable from the rest', () => {
    renderPanel({ modes: [createMode({ isDefault: true })] })

    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('marks an archived mode as archived rather than hiding it', () => {
    renderPanel({ modes: [createMode({ isActive: false })] })

    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('hides the create affordance from a viewer who cannot manage', () => {
    renderPanel({ canManage: false })

    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Payment mode name')).not.toBeInTheDocument()
  })

  it('still lists the modes for a viewer who cannot manage', () => {
    renderPanel({ canManage: false })

    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
  })

  it('creates a payment mode with the trimmed name', async () => {
    const user = userEvent.setup()
    const { onCreate, onSuccess } = renderPanel({ modes: [] })

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Payment mode name'), '  Cheque  ')
    await user.click(
      screen.getByRole('button', { name: 'Create payment mode' })
    )

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({ name: 'Cheque' })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces a create failure inline and does not report success', async () => {
    const user = userEvent.setup()
    const onCreate = vi
      .fn()
      .mockResolvedValue({ error: { message: 'Name already used.' } })
    const { onSuccess } = renderPanel({ modes: [], onCreate })

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Payment mode name'), 'Cheque')
    await user.click(
      screen.getByRole('button', { name: 'Create payment mode' })
    )

    expect(await screen.findByText('Name already used.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does not call onCreate when the name is only whitespace', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderPanel({ modes: [] })

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Payment mode name'), '   ')
    await user.click(
      screen.getByRole('button', { name: 'Create payment mode' })
    )

    expect(onCreate).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Enter a payment mode name.')
    ).toBeInTheDocument()
  })

  it('contains no hard-coded host route', async () => {
    const { readFileSync } = await import('node:fs')

    expect(
      readFileSync('src/panels/payment-mode-settings-panel.tsx', 'utf8')
    ).not.toMatch(/href=/)
  })
})
