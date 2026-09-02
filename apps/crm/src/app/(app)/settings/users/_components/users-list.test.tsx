// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { OrgMember } from '../_lib/types'
import { UsersList } from './users-list'

const route = vi.hoisted(() => ({ segments: [] as string[], status: 'all' }))
vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => route.segments,
  useSearchParams: () =>
    new URLSearchParams(route.status === 'all' ? '' : `status=${route.status}`),
}))

function member(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    object: 'organization_member',
    id: 'mem_1',
    user_id: 'usr_1',
    role: 'member',
    role_id: null,
    position: 'Support lead',
    status: 'active',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    avatar: null,
    created_at: 1_700_000_000,
    ...overrides,
  }
}

describe('UsersList', () => {
  it('renders the full table when no member is selected', () => {
    route.segments = []
    render(<UsersList members={[member()]} />)
    expect(
      screen.getByRole('columnheader', { name: 'Member' })
    ).toBeInTheDocument()
  })
  it('renders the condensed pane when a member is selected', () => {
    route.segments = ['mem_1']
    render(<UsersList members={[member()]} />)
    expect(screen.getByText('Users')).toBeInTheDocument()
  })
  it('keeps position in the condensed row', () => {
    route.segments = ['mem_1']
    render(<UsersList members={[member()]} />)
    expect(screen.getByText('Support lead')).toBeInTheDocument()
  })
  it('keeps a non-active status badge in the condensed row', () => {
    route.segments = ['mem_1']
    render(<UsersList members={[member({ status: 'suspended' })]} />)
    expect(screen.getByText('suspended')).toBeInTheDocument()
  })
  it('marks the selected condensed row', () => {
    route.segments = ['mem_1']
    render(<UsersList members={[member()]} />)
    expect(
      screen.getByRole('link', { name: /view user ada/i })
    ).toHaveAttribute('data-state', 'selected')
  })
  it('renders an empty roster state', () => {
    route.segments = []
    render(<UsersList members={[]} />)
    expect(screen.getByText('No users')).toBeInTheDocument()
  })
  it('narrows rows by status', () => {
    route.segments = []
    route.status = 'suspended'
    render(
      <UsersList
        members={[
          member(),
          member({
            id: 'mem_2',
            first_name: 'Grace',
            last_name: 'Hopper',
            status: 'suspended',
          }),
        ]}
      />
    )
    expect(screen.queryByText('Ada Lovelace')).toBeNull()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })
  it('shows every row for the all status', () => {
    route.segments = []
    route.status = 'all'
    render(
      <UsersList
        members={[
          member(),
          member({
            id: 'mem_2',
            first_name: 'Grace',
            last_name: 'Hopper',
            status: 'suspended',
          }),
        ]}
      />
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })
  it('renders an em dash for a missing position', () => {
    route.segments = []
    render(<UsersList members={[member({ position: null })]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
  it('renders without throwing when email is missing', () => {
    route.segments = []
    render(<UsersList members={[member({ email: null })]} />)
    expect(screen.getByText('@usr_1')).toBeInTheDocument()
  })
})
