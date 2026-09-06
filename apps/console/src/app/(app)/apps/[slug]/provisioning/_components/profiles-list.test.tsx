/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'

import { ProfilesList } from './profiles-list'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

let detailSegments: string[] = []

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => detailSegments,
}))

const mockProfiles: ApplicationProvisioningProfile[] = [
  {
    id: 'app_prof_default',
    object: 'application_provisioning_profile',
    app_id: 'app_billing',
    app_slug: '876-billing',
    key: 'default',
    name: 'Default Profile',
    description: 'Default fallback billing profile',
    status: 'active',
    is_default: true,
    manifest_target: 'application/876-billing/default',
    published_revision: 2,
    has_draft: false,
    selection_count: 15,
    conditions: [],
    created_at: 1700000000,
    updated_at: 1700000000,
  },
  {
    id: 'app_prof_jm',
    object: 'application_provisioning_profile',
    app_id: 'app_billing',
    app_slug: '876-billing',
    key: 'jamaica',
    name: 'Jamaica Enterprise',
    description: null,
    status: 'draft',
    is_default: false,
    manifest_target: 'application/876-billing/jamaica',
    published_revision: null,
    has_draft: true,
    selection_count: 3,
    conditions: [
      {
        object: 'application_provisioning_profile_condition',
        id: 'cond_1',
        group_key: 'rule-1',
        field: 'country',
        operator: 'equals',
        value: 'JM',
        priority: 10,
        created_at: 1700000000,
        updated_at: 1700000000,
      },
    ],
    created_at: 1700000000,
    updated_at: 1700000000,
  },
]

describe('ProfilesList', () => {
  afterEach(() => {
    detailSegments = []
  })

  it('renders table headers for profile details, revision, conditions, organizations, and status', () => {
    render(<ProfilesList profiles={mockProfiles} slug="876-billing" />)

    expect(
      screen.getByRole('columnheader', { name: 'Profile' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Description' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Published revision' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Conditions' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Organizations' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Status' })
    ).toBeInTheDocument()
  })

  it('renders profile rows with revision, conditions, and status', () => {
    render(<ProfilesList profiles={mockProfiles} slug="876-billing" />)

    expect(screen.getByText('Default Profile')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(
      screen.getByText('Default fallback billing profile')
    ).toBeInTheDocument()
    expect(screen.getByText('Default fallback')).toBeInTheDocument()

    // Published revisions
    expect(screen.getByText('r2')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    // Variant profile
    expect(screen.getByText('Jamaica Enterprise')).toBeInTheDocument()
    expect(screen.getByText('1 condition')).toBeInTheDocument()

    // Organizations
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // Status badges
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
  })

  it('renders condensed list mode when a profile is open', () => {
    detailSegments = ['default']
    render(<ProfilesList profiles={mockProfiles} slug="876-billing" />)

    expect(screen.getByText('Default Profile')).toHaveClass('text-sky-600')
    expect(screen.getByText('Jamaica Enterprise')).toHaveClass('text-sky-600')
  })
})
