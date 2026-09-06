import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerBillingFactsPanel } from './customer-billing-facts-panel'

const data = { type: '876 organization', currency: 'JMD', reference: 'org_1', addedDate: '6 Sep 2026' }
describe('CustomerBillingFactsPanel', () => {
  it('renders ready facts', () => { render(<CustomerBillingFactsPanel state={{ status: 'ready', data }} />); expect(screen.getByText('org_1')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerBillingFactsPanel state={{ status: 'empty' }} />); expect(screen.getByText(/No billing facts/)).toBeInTheDocument() })
  it('renders its error state', () => { render(<CustomerBillingFactsPanel state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }} />); expect(screen.getByText('Unavailable')).toBeInTheDocument() })
  it('contains no hard-coded route href', () => { expect(readFileSync('src/panels/customer-billing-facts-panel.tsx', 'utf8')).not.toMatch(/href=|\/customers\//) })
})
