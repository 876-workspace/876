import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  DOCUMENT_PAYMENT_TERMS,
  DocumentPaymentTermsControl,
  resolveTermDueDate,
} from './document-payment-terms'

describe('resolveTermDueDate', () => {
  it.each([
    ['due-on-receipt', '2026-09-13'],
    ['net-15', '2026-09-28'],
    ['net-30', '2026-10-13'],
    ['net-45', '2026-10-28'],
    ['net-60', '2026-11-12'],
    ['end-of-month', '2026-09-30'],
    ['end-of-next-month', '2026-10-31'],
  ] as const)('resolves %s from 2026-09-13 to %s', (term, expected) => {
    expect(resolveTermDueDate(term, '2026-09-13')).toBe(expected)
  })

  it('crosses a year boundary', () => {
    expect(resolveTermDueDate('net-30', '2026-12-15')).toBe('2027-01-14')
    expect(resolveTermDueDate('end-of-next-month', '2026-12-15')).toBe(
      '2027-01-31'
    )
  })

  it('handles a leap-year February end of month', () => {
    expect(resolveTermDueDate('end-of-month', '2028-02-10')).toBe('2028-02-29')
  })

  it('returns null for a custom term', () => {
    expect(resolveTermDueDate('custom', '2026-09-13')).toBeNull()
  })

  it.each(['', '13/09/2026', '2026-02-30x', 'not a date'])(
    'returns null for the unreadable issue date %j',
    (issueDate) => {
      expect(resolveTermDueDate('net-30', issueDate)).toBeNull()
    }
  )

  it('offers every term exactly once', () => {
    const values = DOCUMENT_PAYMENT_TERMS.map((term) => term.value)
    expect(new Set(values).size).toBe(values.length)
    expect(values).toHaveLength(8)
  })
})

describe('DocumentPaymentTermsControl', () => {
  function renderControl(onChange = vi.fn()) {
    render(
      <DocumentPaymentTermsControl
        idPrefix="invoice"
        issueDate="2026-09-13"
        term="due-on-receipt"
        dueDate="2026-09-13"
        onChange={onChange}
      />
    )
    return onChange
  }

  it('recalculates the due date when the term changes', () => {
    const onChange = renderControl()

    fireEvent.change(screen.getByLabelText('Payment terms'), {
      target: { value: 'net-30' },
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      term: 'net-30',
      dueDate: '2026-10-13',
    })
  })

  it('keeps the current due date when switching to custom', () => {
    const onChange = renderControl()

    fireEvent.change(screen.getByLabelText('Payment terms'), {
      target: { value: 'custom' },
    })

    expect(onChange).toHaveBeenCalledWith({
      term: 'custom',
      dueDate: '2026-09-13',
    })
  })

  it('marks the term custom when the due date is edited by hand', () => {
    const onChange = renderControl()

    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-09-20' },
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      term: 'custom',
      dueDate: '2026-09-20',
    })
  })

  it('does not allow a due date before the issue date', () => {
    renderControl()
    expect(screen.getByLabelText('Due date')).toHaveAttribute(
      'min',
      '2026-09-13'
    )
  })
})
