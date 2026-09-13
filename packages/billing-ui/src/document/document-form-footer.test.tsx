import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  DocumentFormFooter,
  documentFooterTotal,
  documentTotalQuantity,
} from './document-form-footer'
import type { DocumentLineDraft } from './document-line-items-editor'

function line(quantity: string): DocumentLineDraft {
  return { id: quantity, description: 'Hosting', quantity, unitAmount: '1' }
}

describe('documentTotalQuantity', () => {
  it('sums whole positive quantities', () => {
    expect(documentTotalQuantity([line('2'), line('3')])).toBe(5)
  })

  it.each(['', '0', '-1', '1.5', 'abc'])('skips the quantity %j', (value) => {
    expect(documentTotalQuantity([line('4'), line(value)])).toBe(4)
  })

  it('is zero for no lines', () => {
    expect(documentTotalQuantity([])).toBe(0)
  })
})

describe('documentFooterTotal', () => {
  const format = (amount: bigint) => `$${amount}`

  it('formats a ready total', () => {
    expect(
      documentFooterTotal(
        {
          status: 'ready',
          totals: {
            subtotalAmount: 5n,
            taxAmount: 0n,
            lineDiscountAmount: 0n,
            linesTotalAmount: 5n,
            discountAmount: 0n,
            shippingAmount: 0n,
            adjustmentAmount: 0n,
            totalAmount: 5n,
            lines: [],
          },
        },
        format
      )
    ).toBe('$5')
  })

  it('shows a dash when totals are missing or invalid', () => {
    expect(documentFooterTotal(null, format)).toBe('—')
    expect(
      documentFooterTotal({ status: 'invalid', message: 'x' }, format)
    ).toBe('—')
  })
})

describe('DocumentFormFooter', () => {
  it('renders the actions beside the running total and quantity', () => {
    render(
      <DocumentFormFooter totalAmount="JMD 115.00" totalQuantity={3}>
        <button type="submit">Save as draft</button>
      </DocumentFormFooter>
    )

    expect(
      screen.getByRole('button', { name: 'Save as draft' })
    ).toBeInTheDocument()
    expect(screen.getByText('Total amount: JMD 115.00')).toBeInTheDocument()
    expect(screen.getByText('Total quantity: 3')).toBeInTheDocument()
  })
})
