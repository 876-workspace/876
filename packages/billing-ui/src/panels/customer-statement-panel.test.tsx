import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerStatementPanel } from './customer-statement-panel'

const data = { currency: 'JMD', openingBalance: 'J$0.00', closingBalance: 'J$10.00', rows: [{ id: 'line_1', date: '6 Sep 2026', description: 'Invoice', amount: 'J$10.00', balance: 'J$10.00' }] }
describe('CustomerStatementPanel', () => {
  it('renders a ready statement', () => { render(<CustomerStatementPanel state={{ status: 'ready', data }} />); expect(screen.getByText('Closing balance')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerStatementPanel state={{ status: 'empty' }} />); expect(screen.getByText(/No statement/)).toBeInTheDocument() })
  it('renders its error state', () => { render(<CustomerStatementPanel state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }} />); expect(screen.getByText('Unavailable')).toBeInTheDocument() })
  it('contains no hard-coded route href', () => { expect(readFileSync('src/panels/customer-statement-panel.tsx', 'utf8')).not.toMatch(/href=|\/customers\//) })
})
