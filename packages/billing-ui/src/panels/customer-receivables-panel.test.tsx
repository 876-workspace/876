import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerReceivablesPanel } from './customer-receivables-panel'

const data = {
  outstanding: 'J$10.00',
  overdue: 'J$2.00',
  availableCredit: 'J$1.00',
  netPosition: 'J$9.00',
  billed: 'J$18.00',
  paid: 'J$8.00',
  currency: 'JMD',
}
describe('CustomerReceivablesPanel', () => {
  it('renders ready totals', () => {
    render(<CustomerReceivablesPanel state={{ status: 'ready', data }} />)
    expect(screen.getByText('J$10.00')).toBeInTheDocument()
  })
  it('renders its empty state', () => {
    render(<CustomerReceivablesPanel state={{ status: 'empty' }} />)
    expect(screen.getByText(/No receivables/)).toBeInTheDocument()
  })
  it('renders its error state', () => {
    render(
      <CustomerReceivablesPanel
        state={{
          status: 'error',
          error: { code: 'x', message: 'Unavailable' },
        }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
  it('contains no hard-coded route href', () => {
    expect(
      readFileSync('src/panels/customer-receivables-panel.tsx', 'utf8')
    ).not.toMatch(/href=|\/customers\//)
  })
})
