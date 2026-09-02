// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { UsersList } from './users-list'
const member = (overrides = {}) => ({
  object: 'organization_member' as const,
  id: 'mem_1',
  user_id: 'usr_1',
  role: 'member',
  role_id: null,
  position: null,
  status: 'active',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  avatar: null,
  created_at: 1,
  ...overrides,
})
describe('UsersList', () => {
  it('renders the full table when no member is open', () => {
    resetNavigationTestState()
    render(<UsersList members={[member()]} />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
  it('renders the condensed pane for an open member', () => {
    resetNavigationTestState()
    navigationTestState.segments = ['mem_1']
    render(<UsersList members={[member()]} />)
    expect(
      screen.getByRole('link', { name: 'View user Ada Lovelace' })
    ).toHaveAttribute('aria-current', 'true')
  })
  it('filters the pane by status', () => {
    resetNavigationTestState()
    navigationTestState.segments = ['mem_2']
    navigationTestState.searchParams = new URLSearchParams('status=suspended')
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
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })
  it('keeps a suspended status in the condensed pane', () => {
    resetNavigationTestState()
    navigationTestState.segments = ['mem_1']
    render(<UsersList members={[member({ status: 'suspended' })]} />)
    expect(screen.getByText('suspended')).toBeInTheDocument()
  })
})
