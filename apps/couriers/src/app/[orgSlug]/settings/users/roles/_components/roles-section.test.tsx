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

import { isRoleTypeFilter, RolesSection } from './roles-section'

describe('isRoleTypeFilter', () => {
  it.each([
    ['all', true],
    ['system', true],
    ['custom', true],
    ['active', false],
    ['archived', false],
    ['', false],
  ])('resolves %s as %s', (value, expected) => {
    expect(isRoleTypeFilter(value)).toBe(expected)
  })

  it('rejects null', () => {
    expect(isRoleTypeFilter(null)).toBe(false)
  })
})

describe('RolesSection', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams()
    mocks.segments = []
    mocks.pathname = '/island-logistics/settings/users'
  })

  it('renders the roles toolbar with an Add action into the create route', () => {
    render(
      <RolesSection orgSlug="island-logistics" list={<div>Role rows</div>}>
        <div>Role card</div>
      </RolesSection>
    )

    expect(screen.getByText('All Roles')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/island-logistics/settings/users/roles/new'
    )
    expect(screen.getByText('Role rows')).toBeVisible()
  })

  it('reflects the active type filter in the toolbar heading', () => {
    mocks.searchParams = new URLSearchParams('type=custom')

    render(
      <RolesSection orgSlug="island-logistics" list={<div>Role rows</div>}>
        <div>Role card</div>
      </RolesSection>
    )

    expect(screen.getByText('Custom Roles')).toBeVisible()
  })

  it('keeps the list mounted beside the open card', () => {
    mocks.segments = ['role_admin']
    mocks.pathname = '/island-logistics/settings/users/roles/role_admin'

    render(
      <RolesSection orgSlug="island-logistics" list={<div>Role rows</div>}>
        <div>Role card</div>
      </RolesSection>
    )

    expect(screen.getByText('Role rows')).toBeVisible()
    expect(screen.getByText('Role card')).toBeVisible()
  })
})
