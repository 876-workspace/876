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
  it('renders every provisioned resource in the sidebar', () => {
    render(
      <ProfileCardFrame
        profile={mockProfile}
        slug="876-billing"
        appId="app_billing"
        overviewContent={<div>Overview Content</div>}
        routingContent={<div>Routing Form Content</div>}
        resourceSections={[
          {
            key: 'app_role',
            label: 'Roles',
            count: 3,
            content: <div>Roles Editor Content</div>,
          },
          {
            key: 'document_preference',
            label: 'Documents',
            count: 4,
            content: <div>Documents Editor Content</div>,
          },
        ]}
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

    const overviewBtn = within(nav).getByRole('button', { name: 'Overview' })
    const routingBtn = within(nav).getByRole('button', { name: 'Routing' })
    const documentsBtn = within(nav).getByRole('button', { name: 'Documents' })
    const rolesBtn = within(nav).getByRole('button', { name: 'Roles' })

    expect(overviewBtn).toBeInTheDocument()
    expect(routingBtn).toBeInTheDocument()
    expect(documentsBtn).toBeInTheDocument()
    expect(rolesBtn).toBeInTheDocument()

    expect(overviewBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Overview Content')).toBeInTheDocument()

    // Switch to Routing in collapsed mode
    fireEvent.click(routingBtn)
    expect(routingBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Routing Form Content')).toBeInTheDocument()

    expect(within(nav).getByText('Profile')).toBeInTheDocument()
    const collapseBtn = within(nav).getByRole('button', {
      name: 'Collapse sidebar',
    })
    expect(collapseBtn).toBeInTheDocument()

    expect(within(nav).getByText('1')).toBeInTheDocument()

    fireEvent.click(rolesBtn)
    expect(rolesBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Roles Editor Content')).toBeInTheDocument()

    // Collapse again
    fireEvent.click(collapseBtn)
    expect(
      within(nav).getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument()
  })

  it('renders CRM provisioning resources with distinct colors and icons', () => {
    render(
      <ProfileCardFrame
        profile={{
          ...mockProfile,
          app_id: 'app_crm',
          app_slug: '876-crm',
        }}
        slug="876-crm"
        appId="app_crm"
        overviewContent={<div>Overview</div>}
        routingContent={<div>Routing</div>}
        resourceSections={[
          {
            key: 'request_priority',
            label: 'Priorities',
            count: 3,
            content: <div>Priorities Editor</div>,
          },
          {
            key: 'request_category',
            label: 'Categories',
            count: 5,
            content: <div>Categories Editor</div>,
          },
          {
            key: 'request_subcategory',
            label: 'Subcategories',
            count: 2,
            content: <div>Subcategories Editor</div>,
          },
          {
            key: 'app_role',
            label: 'Roles',
            count: 4,
            content: <div>Roles Editor</div>,
          },
        ]}
      />
    )

    const nav = screen.getByRole('navigation', { name: 'Profile sections' })
    const prioritiesBtn = within(nav).getByRole('button', { name: 'Priorities' })
    const categoriesBtn = within(nav).getByRole('button', { name: 'Categories' })
    const subcategoriesBtn = within(nav).getByRole('button', {
      name: 'Subcategories',
    })
    const rolesBtn = within(nav).getByRole('button', { name: 'Roles' })

    expect(prioritiesBtn).toBeInTheDocument()
    expect(categoriesBtn).toBeInTheDocument()
    expect(subcategoriesBtn).toBeInTheDocument()
    expect(rolesBtn).toBeInTheDocument()

    // Ensure icons have distinct color classes
    const prioritiesIcon = prioritiesBtn.querySelector('svg')
    const categoriesIcon = categoriesBtn.querySelector('svg')
    const subcategoriesIcon = subcategoriesBtn.querySelector('svg')
    const rolesIcon = rolesBtn.querySelector('svg')

    expect(prioritiesIcon).toHaveClass('text-amber-500')
    expect(categoriesIcon).toHaveClass('text-emerald-500')
    expect(subcategoriesIcon).toHaveClass('text-teal-500')
    expect(rolesIcon).toHaveClass('text-purple-500')
  })
})
