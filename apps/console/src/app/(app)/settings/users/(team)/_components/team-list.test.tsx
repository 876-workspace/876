// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamList } from './team-list'
import type { TeamMemberRow } from './team-member-row'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
}))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => new URLSearchParams(),
}))

function aTeamMember(overrides: Partial<TeamMemberRow> = {}): TeamMemberRow {
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

const members: TeamMemberRow[] = [
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

describe('TeamList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
  })

  it('renders team list in full table mode when no member is selected', () => {
    render(<TeamList members={members} />)

    expect(screen.getByText('Alejandra Reyes')).toBeInTheDocument()
    expect(screen.getByText('Marcus Sterling')).toBeInTheDocument()
    expect(screen.queryByLabelText('Close member details')).toBeNull()
  })

  it('links rows to their member route in full table mode', () => {
    render(<TeamList members={members} />)

    expect(
      screen.getByRole('link', { name: 'View team member Alejandra Reyes' })
    ).toHaveAttribute('href', '/settings/users/user_1')
  })

  it('renders team member detail card to the right when a member is selected', () => {
    mocks.segments = ['user_1']
    render(<TeamList members={members} />)

    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getAllByText('Alejandra Reyes').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: 'View team member Marcus Sterling' })
    ).toBeInTheDocument()
  })

  it('renders empty state when members list is empty', () => {
    render(<TeamList members={[]} />)

    expect(screen.getByText('No users')).toBeInTheDocument()
  })
})
