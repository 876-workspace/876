/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
const navigation = vi.hoisted(() => ({
  search: new URLSearchParams(),
  segments: [] as string[],
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/roles',
  useSearchParams: () => navigation.search,
  useSelectedLayoutSegments: () => navigation.segments,
  useRouter: () => ({ refresh: vi.fn() }),
}))
import { RolesShell } from './roles-shell'
describe('RolesShell', () => {
  it('renders the supplied title, list, and detail', () => {
    navigation.search = new URLSearchParams()
    navigation.segments = []
    render(
      <RolesShell
        title="Roles"
        newHref="/roles/new"
        canCreate
        list={<div>role-list</div>}
      >
        <div>role-detail</div>
      </RolesShell>
    )
    expect(screen.getByText('role-list')).toBeInTheDocument()
    expect(screen.getByText('role-detail')).toBeInTheDocument()
  })
  it('uses the supplied new href', () => {
    navigation.search = new URLSearchParams()
    render(
      <RolesShell
        title="Roles"
        newHref="/tenant/roles/new"
        canCreate
        list={null}
      >
        {null}
      </RolesShell>
    )
    expect(screen.getByRole('link', { name: /add/i })).toHaveAttribute(
      'href',
      '/tenant/roles/new'
    )
  })
  it('disables creation without hiding the Add affordance', () => {
    navigation.search = new URLSearchParams()
    render(
      <RolesShell
        title="Roles"
        newHref="/roles/new"
        canCreate={false}
        list={null}
      >
        {null}
      </RolesShell>
    )
    expect(screen.getByRole('link', { name: /add/i })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })
  it('reads the system filter from search params', () => {
    navigation.search = new URLSearchParams('type=system')
    render(
      <RolesShell title="Roles" newHref="/roles/new" canCreate list={null}>
        {null}
      </RolesShell>
    )
    expect(screen.getByText('System Roles')).toBeInTheDocument()
  })
  it('falls back to all roles for an absent filter', () => {
    navigation.search = new URLSearchParams()
    render(
      <RolesShell title="Roles" newHref="/roles/new" canCreate list={null}>
        {null}
      </RolesShell>
    )
    expect(screen.getByText('All Roles')).toBeInTheDocument()
  })
})
