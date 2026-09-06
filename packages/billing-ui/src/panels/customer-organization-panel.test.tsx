import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerOrganizationPanel } from './customer-organization-panel'

const data = { name: 'Acme', slug: 'acme', members: '3', status: 'active' }
describe('CustomerOrganizationPanel', () => {
  it('renders a linked organization', () => { render(<CustomerOrganizationPanel state={{ status: 'ready', data }} />); expect(screen.getByText('Acme')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerOrganizationPanel state={{ status: 'empty' }} />); expect(screen.getByText(/not linked/)).toBeInTheDocument() })
  it('renders its error state', () => { render(<CustomerOrganizationPanel state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }} />); expect(screen.getByText('Unavailable')).toBeInTheDocument() })
  it('contains no hard-coded route href', () => { expect(readFileSync('src/panels/customer-organization-panel.tsx', 'utf8')).not.toMatch(/href=|\/customers\//) })
})
