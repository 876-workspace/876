/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { RoleSection } from './roles-section'

describe('Invoice RoleSection', () => {
  it('renders a system role with no destructive action in Invoice', () => {
    render(
      <RoleSection
        role={{
          id: 'Role_system',
          slug: 'staff',
          name: 'Staff',
          description: 'Built-in finance role.',
          permissions: ['billing:access', 'roles:read'],
          isSystem: true,
          isDefault: true,
          memberCount: 0,
        }}
        canManage
      />
    )

    expect(screen.getByText('System roles are read-only.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
