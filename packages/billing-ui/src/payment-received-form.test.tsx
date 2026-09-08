/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PaymentReceivedForm } from './payment-received-form'

const customers = [{ value: 'cus_1', label: 'Acme Ltd' }]
const accounts = [
  { value: 'acct_1', label: 'Main bank (JMD)', currency: 'JMD' },
]
const modes = [{ value: 'mode_1', label: 'Bank transfer' }]
const currencies = [
  { value: 'JMD', label: 'Jamaican Dollar (JMD)', decimalPlaces: 2 },
]
const invoices = [
  {
    id: 'inv_1',
    customerId: 'cus_1',
    number: 'INV-001',
    currency: 'JMD',
    amountDue: '12500',
  },
]

function renderForm(
  onSubmit: ReturnType<typeof vi.fn>,
  prefill: { customerId?: string; invoiceId?: string }
) {
  return render(
    <PaymentReceivedForm
      customers={customers}
      accounts={accounts}
      modes={modes}
      currencies={currencies}
      invoices={invoices}
      defaultCurrency="JMD"
      prefill={prefill}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />
  )
}

describe('PaymentReceivedForm', () => {
  it('prefills customer, amount, and allocation from an invoice', () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit, { invoiceId: 'inv_1' })

    expect(screen.getByLabelText('Customer')).toHaveValue('cus_1')
    expect(screen.getByLabelText('Amount received')).toHaveValue(125)
    expect(screen.getByLabelText('Apply')).toHaveValue(125)
    expect(screen.getByText('Unused / customer credit')).toBeVisible()
  })

  it('records a customer payment with no invoice allocation', async () => {
    const onSubmit = vi.fn(async () => ({ error: null }))
    const user = userEvent.setup()
    renderForm(onSubmit, { customerId: 'cus_1' })

    await user.type(screen.getByLabelText('Amount received'), '200')
    await user.selectOptions(screen.getByLabelText('Deposit to'), 'acct_1')
    await user.click(screen.getByRole('button', { name: 'Record payment' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_1',
        paymentModeId: 'mode_1',
        depositAccountId: 'acct_1',
        amount: '20000',
        bankCharges: '0',
        currency: 'JMD',
        allocations: [],
      })
    )
  })
})
