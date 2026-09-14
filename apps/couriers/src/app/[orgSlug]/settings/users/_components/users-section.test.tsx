/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
  segments: [] as string[],
  pathname: '/island-logistics/settings/users',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => mocks.searchParams,
  useSelectedLayoutSegments: () => mocks.segments,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { UsersSection } from './users-section'

describe('UsersSection', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams()
    mocks.segments = []
    mocks.pathname = '/island-logistics/settings/users'
  })

  it('renders the users toolbar above the list while closed', () => {
    render(
      <UsersSection
        orgSlug="island-logistics"
        roles={[{ id: 'role_admin', name: 'Admin' }]}
        list={<div>Member rows</div>}
      >
        <div>Member card</div>
      </UsersSection>
    )

    expect(screen.getByText('All users')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add' })).toBeVisible()
    expect(screen.getByText('Member rows')).toBeVisible()
  })

  it('reflects the active status filter in the toolbar heading', () => {
    mocks.searchParams = new URLSearchParams('status=inactive')

    render(
      <UsersSection
        orgSlug="island-logistics"
        roles={[{ id: 'role_admin', name: 'Admin' }]}
        list={<div>Member rows</div>}
      >
        <div>Member card</div>
      </UsersSection>
    )

    expect(screen.getByText('Inactive users')).toBeVisible()
  })

  it('keeps the list mounted beside the open card', () => {
    mocks.segments = ['tmem_alejandra']
    mocks.pathname = '/island-logistics/settings/users/tmem_alejandra'

    render(
      <UsersSection
        orgSlug="island-logistics"
        roles={[{ id: 'role_admin', name: 'Admin' }]}
        list={<div>Member rows</div>}
      >
        <div>Member card</div>
      </UsersSection>
    )

    expect(screen.getByText('Member rows')).toBeVisible()
    expect(screen.getByText('Member card')).toBeVisible()
  })
})
