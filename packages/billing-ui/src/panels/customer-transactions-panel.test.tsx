import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerTransactionsPanel } from './customer-transactions-panel'

const data = [{ id: 'in_1', number: 'INV-001', type: 'Invoice', date: '6 Sep 2026', status: 'Open', amount: 'J$10.00' }]
describe('CustomerTransactionsPanel', () => {
  it('renders ready documents', () => { render(<CustomerTransactionsPanel state={{ status: 'ready', data }} hrefForDocument={(id) => `/documents/${id}`} />); expect(screen.getByText('INV-001')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerTransactionsPanel state={{ status: 'empty' }} hrefForDocument={(id) => `/documents/${id}`} />); expect(screen.getByText(/No documents/)).toBeInTheDocument() })
  it('renders its error state', () => { render(<CustomerTransactionsPanel state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }} hrefForDocument={(id) => `/documents/${id}`} />); expect(screen.getByText('Unavailable')).toBeInTheDocument() })
  it('uses the host href builder instead of a hard-coded route', () => { render(<CustomerTransactionsPanel state={{ status: 'ready', data }} hrefForDocument={(id) => `/orgs/acme/workspace/billing/documents/${id}`} />); expect(screen.getByRole('link', { name: 'INV-001' })).toHaveAttribute('href', '/orgs/acme/workspace/billing/documents/in_1'); expect(readFileSync('src/panels/customer-transactions-panel.tsx', 'utf8')).not.toMatch(/href=\"\//) })
})
