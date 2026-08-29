// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { DirectoryMember } from '@/features/directory/types'
import { TeamSplit } from '../team-split'
import type { TeamRow } from '../team-row'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addMember: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    teams: {
      update: mocks.update,
      delete: mocks.delete,
      members: {
        add: mocks.addMember,
        update: mocks.updateMember,
        remove: mocks.removeMember,
      },
    },
  },
}))

function aTeam(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: 'team_1',
    name: 'Customer Success',
    slug: 'customer-success',
    description: 'Handles support and client queries',
    color: 'blue',
    members: [
      {
        userId: 'user_althea_123',
        name: 'Althea Campbell',
        email: 'althea@example.com',
        avatar: null,
        role: 'LEAD',
      },
    ],
    isDefault: true,
    autoAssign: 'ROUND_ROBIN',
    status: 'ACTIVE',
    createdAt: 1788000000,
    updatedAt: 1788000000,
    ...overrides,
  }
}

const directory: DirectoryMember[] = [
  {
    userId: 'user_althea_123',
    name: 'Althea Campbell',
    email: 'althea@example.com',
    avatar: null,
  },
  {
    userId: 'user_marcus_456',
    name: 'Marcus Sterling',
    email: 'marcus@example.com',
    avatar: null,
  },
]

const teams: TeamRow[] = [
  aTeam(),
  aTeam({
    id: 'team_2',
    name: 'Technical Escalations',
    slug: 'technical-escalations',
    description: 'Tier 2 technical engineering team',
    color: 'violet',
    members: [],
    isDefault: false,
    autoAssign: 'LEAST_BUSY',
    status: 'ACTIVE',
  }),
]

describe('TeamSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders teams list in full table mode when no team is selected', () => {
    render(
      <TeamSplit teams={teams} directory={directory} selectedId={undefined} />
    )

    expect(screen.getByText('Customer Success')).toBeInTheDocument()
    expect(screen.getByText('Technical Escalations')).toBeInTheDocument()
    expect(screen.queryByLabelText('Close team details')).toBeNull()
  })

  it('navigates to ?team=<id> when a row is clicked in full table mode', () => {
    render(
      <TeamSplit teams={teams} directory={directory} selectedId={undefined} />
    )

    fireEvent.click(screen.getByText('Customer Success'))
    expect(mocks.push).toHaveBeenCalledWith('/settings/teams?team=team_1')
  })

  it('renders team detail card to the right when a team is selected', () => {
    render(
      <TeamSplit teams={teams} directory={directory} selectedId="team_1" />
    )

    expect(screen.getByLabelText('Close team details')).toBeInTheDocument()
    expect(screen.getAllByText('Customer Success').length).toBeGreaterThan(0)
    expect(screen.getByText('Auto-Assign')).toBeInTheDocument()
    expect(
      screen.getByText('Handles support and client queries')
    ).toBeInTheDocument()
    expect(screen.getAllByText('team_1').length).toBeGreaterThan(0)
  })

  it('allows switching between Overview, Members, and Activity tabs in team detail card', () => {
    render(
      <TeamSplit teams={teams} directory={directory} selectedId="team_1" />
    )

    // Initial tab is Overview
    expect(
      screen.getByText('Handles support and client queries')
    ).toBeInTheDocument()

    // Switch to Members tab
    const membersTab = screen.getByRole('tab', { name: /Members/ })
    fireEvent.click(membersTab)
    expect(screen.getByText('Althea Campbell')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add Member' })
    ).toBeInTheDocument()

    // Switch to Activity tab
    const activityTab = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(activityTab)
    expect(screen.getByText('Team created')).toBeInTheDocument()
  })

  it('renders empty state when teams list is empty', () => {
    render(
      <TeamSplit teams={[]} directory={directory} selectedId={undefined} />
    )

    expect(screen.getByText('No teams yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
