// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type React from 'react'
import { expect, it, vi } from 'vitest'

import { RolesShell } from './roles-shell'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/users/roles',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@876/ui/list-detail-section', () => ({
  ListDetailSection: ({
    toolbar,
    children,
  }: {
    toolbar: React.ReactNode
    children: React.ReactNode
  }) => (
    <div>
      {toolbar}
      {children}
    </div>
  ),
}))

it('keeps the roles Add action visible with an open detail record', () => {
  render(
    <RolesShell list={<div>Roles</div>}>
      <div>Role detail</div>
    </RolesShell>
  )

  expect(screen.getByText('Role detail')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
    'href',
    '/settings/users/roles/new'
  )
})
