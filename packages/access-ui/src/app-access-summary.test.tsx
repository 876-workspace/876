import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppAccessSummary } from './app-access-summary'
import type { AccessAppEntry } from './types'

function entry(overrides: Partial<AccessAppEntry> = {}): AccessAppEntry {
  return {
    assignmentId: 'assignment_1',
    appId: 'app_billing',
    appSlug: '876-billing',
    appName: 'Billing',
    entitled: true,
    assigned: true,
    status: 'active',
    role: {
      id: 'role_viewer',
      key: 'viewer',
      name: 'Viewer',
      description: null,
      permissions: [],
      isSystem: true,
      isDefault: true,
    },
    roles: [],
    grants: [],
    denies: [],
    effectivePermissions: ['reports.view', 'settings.edit'],
    catalog: [],
    ...overrides,
  }
}

describe('AppAccessSummary', () => {
  it('renders one row per entitled app', () => {
    render(
      <AppAccessSummary
        entries={[entry(), entry({ appId: 'app_crm', appName: 'CRM' })]}
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders No access for an unassigned app', () => {
    render(
      <AppAccessSummary entries={[entry({ assigned: false, role: null })]} />
    )

    expect(screen.getByText('No access')).toBeVisible()
  })

  it('renders the exact effective-permission count', () => {
    render(<AppAccessSummary entries={[entry()]} />)

    expect(screen.getByText('2 effective permissions')).toBeVisible()
  })

  it('renders an empty state with no entitled apps', () => {
    render(<AppAccessSummary entries={[]} />)

    expect(screen.getByText('No entitled apps')).toBeVisible()
  })
})
