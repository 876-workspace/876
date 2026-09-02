import '@testing-library/jest-dom/vitest'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppAccessPanel } from './app-access-panel'
import { EffectivePermissionList } from './effective-permissions'
import type { AccessAppEntry } from './types'

const corpus = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '__proto__',
  'x'.repeat(10_000),
]

function entry(overrides: Partial<AccessAppEntry>): AccessAppEntry {
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
      permissions: ['reports.view'],
      isSystem: true,
      isDefault: true,
    },
    roles: [],
    grants: [],
    denies: [],
    effectivePermissions: ['reports.view'],
    catalog: [
      {
        key: 'reports.view',
        moduleKey: 'reports',
        moduleLabel: 'Reports',
        action: 'view',
        label: 'View reports',
        isDangerous: false,
      },
    ],
    ...overrides,
  }
}

describe('access UI security corpus', () => {
  it.each(corpus)(
    'renders an app name as text without executing %s',
    (value) => {
      const { container } = render(
        <AppAccessPanel entries={[entry({ appName: value })]} />
      )

      expect(container.textContent).toContain(value)
      expect(container.querySelectorAll('script')).toHaveLength(0)
    }
  )

  it.each(corpus)(
    'renders a role name as text without executing %s',
    (value) => {
      const role = { ...entry({}).role!, name: value }
      const { container } = render(
        <AppAccessPanel entries={[entry({ role, roles: [role] })]} />
      )

      expect(container.textContent).toContain(value)
      expect(container.querySelectorAll('script')).toHaveLength(0)
    }
  )

  it.each(corpus)(
    'renders a permission label as text without executing %s',
    (value) => {
      const { container } = render(
        <AppAccessPanel
          entries={[
            entry({ catalog: [{ ...entry({}).catalog[0], label: value }] }),
          ]}
        />
      )

      expect(container.textContent).toContain(value)
      expect(container.querySelectorAll('script')).toHaveLength(0)
    }
  )

  it.each(corpus)(
    'renders a module label as text without executing %s',
    (value) => {
      const { container } = render(
        <EffectivePermissionList
          permissions={['reports.view']}
          catalog={[{ ...entry({}).catalog[0], moduleLabel: value }]}
        />
      )

      expect(container.textContent).toContain(value)
      expect(container.querySelectorAll('script')).toHaveLength(0)
    }
  )
})
