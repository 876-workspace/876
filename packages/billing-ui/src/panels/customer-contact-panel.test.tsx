import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerContactPanel } from './customer-contact-panel'

describe('CustomerContactPanel', () => {
  it('renders a ready contact', () => { render(<CustomerContactPanel state={{ status: 'ready', data: { avatar: null, name: 'Ada Lovelace', role: 'Owner', sourceLabel: '876 user', email: 'ada@example.com', phone: '555-0100' } }} />); expect(screen.getByText('Ada Lovelace')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerContactPanel state={{ status: 'empty' }} />); expect(screen.getByText(/No contact details/)).toBeInTheDocument() })
  it('renders an error separately from empty', () => { render(<CustomerContactPanel state={{ status: 'error', error: { code: 'billing/unavailable', message: 'Try again.' } }} />); expect(screen.getByText('Try again.')).toBeInTheDocument() })
  it('contains no hard-coded route href', () => { expect(readFileSync('src/panels/customer-contact-panel.tsx', 'utf8')).not.toMatch(/href=|\/customers\//) })
})
