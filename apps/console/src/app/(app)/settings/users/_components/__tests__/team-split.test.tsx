// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TeamSplit } from '../team-split'
import type { TeamRow } from '../member-row'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/client', () => ({
  client: { team: { revoke: mocks.revoke } },
}))

function aTeamMember(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: 'user_1',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    email: 'alejandra@example.com',
    username: 'alejandra',
    avatar: null,
    position: 'Platform Engineer',
    affiliation: 'staff',
    role: 'admin',
    permissions: ['users:read', 'users:list'],
    status: 'active',
    createdAt: 1700000000,
    expiresAt: null,
    resolved: true,
    ...overrides,
  }
}

const members: TeamRow[] = [
  aTeamMember(),
  aTeamMember({
    id: 'user_2',
    firstName: 'Marcus',
    lastName: 'Sterling',
    email: 'marcus@example.com',
    username: 'marcus',
    role: 'staff',
    affiliation: 'contractor',
    expiresAt: 1893456000,
  }),
]

describe('TeamSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders team list in full table mode when no member is selected', () => {
    render(<TeamSplit members={members} selectedId={undefined} />)

    expect(screen.getByText('Alejandra Reyes')).toBeInTheDocument()
    expect(screen.getByText('Marcus Sterling')).toBeInTheDocument()
    expect(screen.queryByLabelText('Close member details')).toBeNull()
  })

  it('navigates to ?member=<id> when a row is clicked in full table mode', () => {
    render(<TeamSplit members={members} selectedId={undefined} />)

    fireEvent.click(screen.getByText('Alejandra Reyes'))
    expect(mocks.push).toHaveBeenCalledWith('/settings/users?member=user_1')
  })

  it('renders team member detail card to the right when a member is selected', () => {
    render(<TeamSplit members={members} selectedId="user_1" />)

    expect(screen.getByLabelText('Close member details')).toBeInTheDocument()
    expect(screen.getAllByText('Alejandra Reyes').length).toBeGreaterThan(0)
    expect(screen.getByText('Console Role')).toBeInTheDocument()
    expect(screen.getByText('Platform Identity')).toBeInTheDocument()
    expect(screen.getAllByText('user_1').length).toBeGreaterThan(0)
  })

  it('allows switching between Profile, App Access, and Activity tabs in member detail card', () => {
    render(<TeamSplit members={members} selectedId="user_1" />)

    // Initial tab is Profile
    expect(screen.getByText('Platform Identity')).toBeInTheDocument()

    // Switch to App Access
    const accessTab = screen.getByRole('tab', { name: 'App Access' })
    fireEvent.click(accessTab)
    expect(
      screen.getByRole('searchbox', { name: 'Filter permissions' })
    ).toBeInTheDocument()
    expect(screen.getByText('Revoke Console Access')).toBeInTheDocument()

    // Switch to Activity
    const activityTab = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(activityTab)
    expect(screen.getByText('Console access granted')).toBeInTheDocument()
  })

  it('renders empty state when members list is empty', () => {
    render(<TeamSplit members={[]} selectedId={undefined} />)

    expect(screen.getByText('No team members')).toBeInTheDocument()
  })
})
