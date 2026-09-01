/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
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
  conditions: [],
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('ProfileCardFrame', () => {
  it('renders 3 top-level tabs (Settings, Routing, Documents) and switches between them', () => {
    render(
      <ProfileCardFrame
        profile={mockProfile}
        slug="876-billing"
        appId="app_billing"
        resourceTabLabel="Documents"
        documentsCount={0}
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

    // Runs link
    const runsLink = screen.getByRole('link', { name: 'Runs' })
    expect(runsLink).toHaveAttribute(
      'href',
      '/settings/orgs/provisioning/runs?app_id=app_billing'
    )

    // 3 Tabs present
    expect(
      screen.getByRole('button', { name: /Settings/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Routing/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Documents/i })
    ).toBeInTheDocument()

    // Initial tab content is Settings
    expect(screen.getByText('Settings Form Content')).toBeInTheDocument()
    expect(screen.queryByText('Routing Form Content')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Documents Editor Content')
    ).not.toBeInTheDocument()

    // Switch to Routing tab
    const routingTab = screen.getByRole('button', { name: /Routing/i })
    fireEvent.click(routingTab)

    expect(screen.queryByText('Settings Form Content')).not.toBeInTheDocument()
    expect(screen.getByText('Routing Form Content')).toBeInTheDocument()
    expect(
      screen.queryByText('Documents Editor Content')
    ).not.toBeInTheDocument()

    // Switch to Documents tab
    const documentsTab = screen.getByRole('button', { name: /Documents/i })
    fireEvent.click(documentsTab)

    expect(screen.queryByText('Settings Form Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Routing Form Content')).not.toBeInTheDocument()
    expect(screen.getByText('Documents Editor Content')).toBeInTheDocument()

    // Close button
    const closeBtn = screen.getByRole('button', {
      name: 'Close provisioning profile',
    })
    fireEvent.click(closeBtn)
    expect(mockPush).toHaveBeenCalledWith('/apps/876-billing/provisioning')
  })
})
