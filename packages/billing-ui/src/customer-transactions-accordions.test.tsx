/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  CustomerTransactionsAccordions,
  type CustomerTransactionEntry,
} from './customer-transactions-accordions'

const entries: CustomerTransactionEntry[] = [
  {
    id: 'led_1',
    type: 'PAYMENT_RECEIVED',
    direction: 'CREDIT',
    amount: '15000',
    currency: 'JMD',
    description: 'Payment PAY-001 received',
    effectiveAt: 1_788_825_600,
    invoiceId: null,
    paymentId: 'pay_1',
    creditNoteId: null,
    refundId: null,
  },
  {
    id: 'led_2',
    type: 'REFUND_ISSUED',
    direction: 'DEBIT',
    amount: '2500',
    currency: 'JMD',
    description: 'Refund REF-001 issued',
    effectiveAt: 1_788_825_600,
    invoiceId: null,
    paymentId: 'pay_1',
    creditNoteId: null,
    refundId: 'ref_1',
  },
  {
    id: 'led_3',
    type: 'CREDIT_NOTE_ISSUED',
    direction: 'CREDIT',
    amount: '1000',
    currency: 'JMD',
    description: 'Credit note CN-001 issued',
    effectiveAt: 1_788_825_600,
    invoiceId: null,
    paymentId: null,
    creditNoteId: 'cn_1',
    refundId: null,
  },
]

describe('CustomerTransactionsAccordions', () => {
  it('renders real refund activity with exact minor-unit formatting and links', async () => {
    const user = userEvent.setup()
    render(
      <CustomerTransactionsAccordions
        entries={entries}
        currencyDecimals={{ JMD: 2 }}
        hrefByEntryId={{ led_2: '/payments/pay_1' }}
      />
    )

    expect(screen.queryByRole('button', { name: /Credit notes/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Refunds/i }))

    expect(screen.getByRole('link', { name: 'Refund REF-001 issued' })).toHaveAttribute(
      'href',
      '/payments/pay_1'
    )
    expect(screen.getByText('JMD 25.00')).toBeVisible()
    expect(screen.getByText('Debit')).toBeVisible()
  })

  it('lets Billing opt into the credit-note section without changing Invoice', () => {
    render(
      <CustomerTransactionsAccordions
        entries={entries}
        currencyDecimals={{ JMD: 2 }}
        includeCreditNotes
      />
    )

    expect(screen.getByRole('button', { name: /Credit notes/i })).toBeInTheDocument()
  })
})
