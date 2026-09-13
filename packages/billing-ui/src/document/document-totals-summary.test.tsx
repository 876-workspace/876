import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { calculateDocumentTotals, formatMinorUnits } from '@876/core/money'

import type { DocumentTotalsSnapshot } from './document-line-items-editor'
import {
  DocumentTotalsSummary,
  parseDocumentAdjustments,
} from './document-totals-summary'

const formatAmount = (amount: bigint) => `J$${formatMinorUnits(amount)}`

function ready(
  params: Parameters<typeof calculateDocumentTotals>[0]
): DocumentTotalsSnapshot {
  const result = calculateDocumentTotals(params)
  if (result.error) throw new Error(result.error.message)
  return { status: 'ready', totals: result.data }
}

describe('parseDocumentAdjustments', () => {
  it('reads blank fields as zero', () => {
    expect(
      parseDocumentAdjustments(
        { discount: '', shipping: ' ', adjustment: '' },
        2
      )
    ).toEqual({ discount: 0n, shipping: 0n, adjustment: 0n })
  })

  it('reads typed amounts in minor units and allows a negative adjustment', () => {
    expect(
      parseDocumentAdjustments(
        { discount: '10.50', shipping: '1,200', adjustment: '-3.25' },
        2
      )
    ).toEqual({ discount: 1050n, shipping: 120000n, adjustment: -325n })
  })

  it.each([
    { discount: '-1', shipping: '', adjustment: '' },
    { discount: '', shipping: '-1', adjustment: '' },
    { discount: 'abc', shipping: '', adjustment: '' },
    { discount: '', shipping: '1.234', adjustment: '' },
    { discount: '', shipping: '', adjustment: '1..2' },
  ])('rejects %j', (values) => {
    expect(parseDocumentAdjustments(values, 2)).toBeNull()
  })

  it('respects a zero-decimal currency', () => {
    expect(
      parseDocumentAdjustments(
        { discount: '5', shipping: '0.5', adjustment: '' },
        0
      )
    ).toBeNull()
  })
})

describe('DocumentTotalsSummary', () => {
  it('shows subtotal, tax, and the grand total with its currency', () => {
    render(
      <DocumentTotalsSummary
        snapshot={ready({
          lines: [{ subtotalAmount: 10000n, taxAmount: 1500n }],
        })}
        formatAmount={formatAmount}
        currency="JMD"
      />
    )

    expect(screen.getByTestId('total-subtotal')).toHaveTextContent('J$100.00')
    expect(screen.getByTestId('total-tax')).toHaveTextContent('J$15.00')
    expect(screen.getByTestId('total-total')).toHaveTextContent('J$115.00')
    expect(screen.getByText('Total (JMD)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Shipping')).not.toBeInTheDocument()
    expect(screen.queryByTestId('total-line-discounts')).not.toBeInTheDocument()
  })

  it('shows line discounts only when there are some', () => {
    render(
      <DocumentTotalsSummary
        snapshot={ready({
          lines: [{ subtotalAmount: 10000n, discountAmount: 2500n }],
        })}
        formatAmount={formatAmount}
      />
    )
    expect(screen.getByTestId('total-line-discounts')).toHaveTextContent(
      '−J$25.00'
    )
  })

  it('renders dashes rather than zeroes while totals are invalid', () => {
    render(
      <DocumentTotalsSummary
        snapshot={{ status: 'invalid', message: 'Bad discount.' }}
        formatAmount={formatAmount}
      />
    )
    expect(screen.getByTestId('total-subtotal')).toHaveTextContent('—')
    expect(screen.getByTestId('total-total')).toHaveTextContent('—')
  })

  it('reports each edited adjustment as a patch', () => {
    const onChange = vi.fn()
    render(
      <DocumentTotalsSummary
        snapshot={ready({
          lines: [{ subtotalAmount: 10000n }],
          discountAmount: 1000n,
          shippingAmount: 500n,
        })}
        formatAmount={formatAmount}
        adjustments={{
          values: { discount: '10', shipping: '5', adjustment: '' },
          onChange,
        }}
      />
    )

    fireEvent.change(screen.getByLabelText('Shipping'), {
      target: { value: '7.50' },
    })
    fireEvent.change(screen.getByLabelText('Adjustment'), {
      target: { value: '-2' },
    })

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(1, { shipping: '7.50' })
    expect(onChange).toHaveBeenNthCalledWith(2, { adjustment: '-2' })
    expect(screen.getByTestId('total-total')).toHaveTextContent('J$95.00')
  })

  it('refuses a minus sign in discount and shipping', () => {
    const onChange = vi.fn()
    render(
      <DocumentTotalsSummary
        snapshot={ready({ lines: [{ subtotalAmount: 10000n }] })}
        formatAmount={formatAmount}
        adjustments={{
          values: { discount: '', shipping: '', adjustment: '' },
          onChange,
        }}
      />
    )

    fireEvent.change(screen.getByLabelText('Discount'), {
      target: { value: '-5' },
    })
    fireEvent.change(screen.getByLabelText('Shipping'), {
      target: { value: '-5' },
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})
