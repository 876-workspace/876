import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EffectivePermissionList } from './effective-permissions'

const catalog = [
  {
    key: 'reports.view',
    moduleKey: 'reports',
    moduleLabel: 'Reports',
    action: 'view',
    label: 'View reports',
    isDangerous: false,
  },
  {
    key: 'settings.edit',
    moduleKey: 'settings',
    moduleLabel: 'Settings',
    action: 'edit',
    label: 'Edit settings',
    isDangerous: false,
  },
]

describe('EffectivePermissionList', () => {
  it('groups permissions by module in catalog order', () => {
    render(
      <EffectivePermissionList
        permissions={['reports.view', 'settings.edit']}
        catalog={catalog}
      />
    )

    expect(
      screen
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent)
    ).toEqual(['Reports', 'Settings'])
  })

  it('renders human labels instead of known raw keys', () => {
    render(
      <EffectivePermissionList
        permissions={['reports.view']}
        catalog={catalog}
      />
    )

    expect(screen.getByText('View reports')).toBeVisible()
    expect(screen.queryByText('reports.view')).not.toBeInTheDocument()
  })

  it('renders a stale raw key marked unknown', () => {
    render(
      <EffectivePermissionList
        permissions={['legacy.super-admin']}
        catalog={catalog}
      />
    )

    expect(screen.getByText('legacy.super-admin (unknown)')).toBeVisible()
  })

  it('renders the supplied empty label for an empty list', () => {
    render(
      <EffectivePermissionList
        permissions={[]}
        catalog={catalog}
        emptyLabel="Nothing active"
      />
    )

    expect(screen.getByText('Nothing active')).toBeVisible()
  })

  it('does not mutate permissions or catalog props', () => {
    const permissions = ['settings.edit', 'reports.view']
    const originalCatalog = structuredClone(catalog)
    render(
      <EffectivePermissionList permissions={permissions} catalog={catalog} />
    )

    expect(permissions).toEqual(['settings.edit', 'reports.view'])
    expect(catalog).toEqual(originalCatalog)
  })

  it('renders duplicate permission keys once', () => {
    render(
      <EffectivePermissionList
        permissions={['reports.view', 'reports.view']}
        catalog={catalog}
      />
    )

    expect(screen.getAllByText('View reports')).toHaveLength(1)
  })
})
