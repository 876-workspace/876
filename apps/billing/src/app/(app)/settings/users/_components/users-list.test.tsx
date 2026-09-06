// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsersList } from './users-list'
const navigation = vi.hoisted(() => ({ segments: [] as string[], searchParams: new URLSearchParams() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.searchParams, useSelectedLayoutSegments: () => navigation.segments }))
function member(overrides: Partial<import('@876/access-ui/member-types').OrgMember> = {}): import('@876/access-ui/member-types').OrgMember { return { object: 'organization_member', id: 'mem_1', user_id: 'usr_1', role: 'member', role_id: null, position: null, status: 'active', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', avatar: null, created_at: 1, ...overrides } }
describe('Billing UsersList', () => {
  it('renders the member table', () => { navigation.segments = []; navigation.searchParams = new URLSearchParams(); render(<UsersList members={[member()]} />); expect(screen.getByText('Ada Lovelace')).toBeInTheDocument(); expect(screen.getByText('Organization role')).toBeInTheDocument() })
  it('renders the selected member in the condensed pane', () => { navigation.segments = ['mem_1']; navigation.searchParams = new URLSearchParams(); render(<UsersList members={[member()]} />); expect(screen.getByRole('link', { name: 'View user Ada Lovelace' })).toHaveAttribute('aria-current', 'true') })
  it('filters members by status', () => { navigation.segments = []; navigation.searchParams = new URLSearchParams('status=suspended'); render(<UsersList members={[member(), member({ id: 'mem_2', first_name: 'Grace', last_name: 'Hopper', status: 'suspended' })]} />); expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument(); expect(screen.getByText('Grace Hopper')).toBeInTheDocument() })
  it('shows an empty filtered state', () => { navigation.segments = []; navigation.searchParams = new URLSearchParams('status=suspended'); render(<UsersList members={[member()]} />); expect(screen.getByText('No users found')).toBeInTheDocument() })
})
