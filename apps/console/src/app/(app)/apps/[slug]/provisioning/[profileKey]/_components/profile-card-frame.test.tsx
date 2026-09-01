/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'

import { ProfileCardFrame } from './profile-card-frame'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => '/apps/876-billing/provisioning/default',
}))

const mockProfile: ApplicationProvisioningProfile = {
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
  conditions: [
    {
      object: 'application_provisioning_profile_condition',
      id: 'cond-1',
      group_key: 'default-rule',
      field: 'setup',
      operator: 'equals',
      value: 'jamaica',
      priority: 1,
      created_at: 1700000000,
      updated_at: 1700000000,
    },
  ],
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('ProfileCardFrame', () => {
  it('defaults to collapsed icon-only floating sidebar and can be expanded', () => {
    render(
      <ProfileCardFrame
        profile={mockProfile}
        slug="876-billing"
        appId="app_billing"
        resourceTabLabel="Documents"
        documentsCount={4}
        settingsContent={<div>Settings Form Content</div>}
        routingContent={<div>Routing Form Content</div>}
        documentsContent={<div>Documents Editor Content</div>}
      />
    )

    expect(screen.getByText('Default Profile')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('r2')).toBeInTheDocument()
    expect(screen.getByText('app_prof_default')).toBeInTheDocument()

    // Sidebar navigation exists
    const nav = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(nav).toBeInTheDocument()

    // Expand button is present in collapsed mode
    const expandBtn = within(nav).getByRole('button', {
      name: 'Expand sidebar',
    })
    expect(expandBtn).toBeInTheDocument()

    const settingsBtn = within(nav).getByRole('button', { name: 'Settings' })
    const routingBtn = within(nav).getByRole('button', { name: 'Routing' })
    const documentsBtn = within(nav).getByRole('button', { name: 'Documents' })

    expect(settingsBtn).toBeInTheDocument()
    expect(routingBtn).toBeInTheDocument()
    expect(documentsBtn).toBeInTheDocument()

    // Initial state: Settings active
    expect(settingsBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Settings Form Content')).toBeInTheDocument()

    // Switch to Routing in collapsed mode
    fireEvent.click(routingBtn)
    expect(routingBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Routing Form Content')).toBeInTheDocument()

    // Click expand button
    fireEvent.click(expandBtn)

    // In expanded mode, "Profile" heading and collapse button appear
    expect(within(nav).getByText('Profile')).toBeInTheDocument()
    const collapseBtn = within(nav).getByRole('button', {
      name: 'Collapse sidebar',
    })
    expect(collapseBtn).toBeInTheDocument()

    // Condition count pill is visible in expanded mode
    expect(within(nav).getByText('1')).toBeInTheDocument()

    // Switch to Documents in expanded mode
    const expandedDocumentsBtn = within(nav).getByRole('button', {
      name: /Documents/i,
    })
    fireEvent.click(expandedDocumentsBtn)
    expect(expandedDocumentsBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Documents Editor Content')).toBeInTheDocument()

    // Collapse again
    fireEvent.click(collapseBtn)
    expect(
      within(nav).getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument()
  })
})
