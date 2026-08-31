/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminProvisioningSetup } from '@876/platform/compat'

import { SetupsList } from './setups-list'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => [],
}))

const mockSetups: AdminProvisioningSetup[] = [
  {
    id: 'setup_jm',
    object: 'provisioning_setup',
    key: 'jamaica',
    name: 'Jamaica',
    description: 'Standard Jamaican finance setup',
    status: 'active',
    is_default: true,
    country_code: 'JM',
    currency_code: 'JMD, USD',
    manifest_target: 'finance/jamaica',
    published_revision: 3,
    has_draft: false,
    organization_count: 14,
    created_at: 1700000000,
    updated_at: 1700000000,
  },
  {
    id: 'setup_us',
    object: 'provisioning_setup',
    key: 'united_states',
    name: 'United States',
    description: null,
    status: 'archived',
    is_default: false,
    country_code: 'US',
    currency_code: 'USD',
    manifest_target: 'finance/united_states',
    published_revision: 1,
    has_draft: true,
    organization_count: 2,
    created_at: 1700000000,
    updated_at: 1700000000,
  },
]

describe('SetupsList', () => {
  it('renders table headers for Setup, Description, Currencies, Organizations, Status', () => {
    render(<SetupsList setups={mockSetups} />)

    expect(screen.getByRole('columnheader', { name: 'Setup' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Description' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Currencies' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Organizations' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Status' })
    ).toBeInTheDocument()
  })

  it('renders setup rows with badges for currencies and status', () => {
    render(<SetupsList setups={mockSetups} />)

    expect(screen.getByText('Jamaica')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(
      screen.getByText('Standard Jamaican finance setup')
    ).toBeInTheDocument()

    // Currencies rendered as badges
    expect(screen.getByText('JMD')).toBeInTheDocument()
    expect(screen.getAllByText('USD').length).toBeGreaterThanOrEqual(1)

    // Organizations
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Status badges
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('archived')).toBeInTheDocument()
  })
})
