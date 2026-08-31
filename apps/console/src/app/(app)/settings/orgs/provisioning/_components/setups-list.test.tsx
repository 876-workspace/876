/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminProvisioningSetup } from '@876/platform/compat'

import { SetupsList } from './setups-list'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

let detailSegments: string[] = []

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => detailSegments,
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
  afterEach(() => {
    detailSegments = []
  })

  it('renders table headers for setup details, published revision, organizations, and status', () => {
    render(<SetupsList setups={mockSetups} />)

    expect(
      screen.getByRole('columnheader', { name: 'Setup' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Description' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Published revision' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Organizations' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Status' })
    ).toBeInTheDocument()
  })

  it('renders setup rows with revision and status', () => {
    render(<SetupsList setups={mockSetups} />)

    expect(screen.getByText('Jamaica')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(
      screen.getByText('Standard Jamaican finance setup')
    ).toBeInTheDocument()

    // Published revisions
    expect(screen.getByText('v3')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    // Organizations
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Status badges
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('archived')).toBeInTheDocument()
  })

  it('keeps condensed setup names blue while a provisioning card is open', () => {
    detailSegments = ['barbados']
    render(<SetupsList setups={mockSetups} />)

    expect(screen.getByText('Jamaica')).toHaveClass('text-sky-600')
    expect(screen.getByText('Jamaica')).toHaveClass('dark:text-sky-400')
  })
})
