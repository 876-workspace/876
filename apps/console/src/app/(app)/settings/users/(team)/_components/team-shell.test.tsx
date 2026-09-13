// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type React from 'react'
import { expect, it, vi } from 'vitest'

import { TeamShell } from './team-shell'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/users',
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

it('keeps the team Add action visible with an open detail record', () => {
  render(
    <TeamShell list={<div>Users</div>}>
      <div>User detail</div>
    </TeamShell>
  )

  expect(screen.getByText('User detail')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
    'href',
    '/settings/users/new'
  )
})
