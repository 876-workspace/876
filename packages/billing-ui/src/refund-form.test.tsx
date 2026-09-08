/** @vitest-environment jsdom */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RefundForm, type RefundFormProps } from './refund-form'

const modes = [
  { value: 'mode_1', label: 'Bank transfer' },
  { value: 'mode_2', label: 'Cheque' },
]
const accounts = [
  { value: 'acct_jmd', label: 'JMD clearing', currency: 'JMD' },
  { value: 'acct_usd', label: 'USD clearing', currency: 'USD' },
]

function renderForm(
  onSubmit: RefundFormProps['onSubmit'],
  overrides: Partial<RefundFormProps> = {}
) {
  return render(
    <RefundForm
      currency="JMD"
      decimalPlaces={2}
      availableAmount="12500"
      modes={modes}
      accounts={accounts}
      defaultModeId="mode_1"
      sourceLabel="PAY-001 · unapplied payment credit"
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...overrides}
    />
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RefundForm', () => {
  it('filters funding accounts to the refund currency', () => {
    renderForm(vi.fn(async () => ({ error: null })))

    const account = screen.getByLabelText('Refund from')
    expect(within(account).getByRole('option', { name: 'JMD clearing' })).toBeInTheDocument()
    expect(within(account).queryByRole('option', { name: 'USD clearing' })).not.toBeInTheDocument()
  })

  it('submits exact minor units with settlement evidence', async () => {
    const onSubmit = vi.fn<RefundFormProps['onSubmit']>(async () => ({ error: null }))
    const user = userEvent.setup()
    renderForm(onSubmit, {
      currency: 'JMD',
      decimalPlaces: 2,
      availableAmount: '12500',
    })

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '12.34')
    await user.selectOptions(screen.getByLabelText('Refund from'), 'acct_jmd')
    await user.clear(screen.getByLabelText('Refund date'))
    await user.type(screen.getByLabelText('Refund date'), '2026-09-08')
    await user.type(screen.getByLabelText('Reason'), 'Duplicate payment')
    await user.type(screen.getByLabelText('Notes'), 'Customer requested return.')
    await user.click(screen.getByRole('button', { name: 'Record refund' }))

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '1234',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_jmd',
      reason: 'Duplicate payment',
      notes: 'Customer requested return.',
      refundedAt: 1_788_825_600,
    })
  })

  it('rejects a refund above the available credit before mutation', async () => {
    const onSubmit = vi.fn<RefundFormProps['onSubmit']>(async () => ({ error: null }))
    const user = userEvent.setup()
    renderForm(onSubmit)

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '125.01')
    await user.selectOptions(screen.getByLabelText('Refund from'), 'acct_jmd')
    await user.click(screen.getByRole('button', { name: 'Record refund' }))

    expect(
      screen.getByText('Refund amount cannot exceed the available customer credit.')
    ).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('supports currencies with three decimal places without floating-point conversion', async () => {
    const onSubmit = vi.fn<RefundFormProps['onSubmit']>(async () => ({ error: null }))
    const user = userEvent.setup()
    renderForm(onSubmit, {
      currency: 'JOD',
      decimalPlaces: 3,
      availableAmount: '2500',
      accounts: [{ value: 'acct_jod', label: 'JOD clearing', currency: 'JOD' }],
      defaultAccountId: 'acct_jod',
    })

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '1.234')
    await user.click(screen.getByRole('button', { name: 'Record refund' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '1234', depositAccountId: 'acct_jod' })
    )
  })
})
