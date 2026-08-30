// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { DirectoryMember } from '@/features/directory/types'
import { TeamDetail } from '../team-detail'
import type { TeamRow } from '../team-row'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addMember: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  onClose: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

describe('TeamDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: aTeam(), error: null })
    mocks.delete.mockResolvedValue({
      data: { object: 'team', id: 'team_1', deleted: true },
      error: null,
    })
    mocks.addMember.mockResolvedValue({
      data: {
        object: 'team_member',
        id: 'crm_tm_1',
        tenantId: 'org_1',
        teamId: 'team_1',
        userId: 'user_marcus_456',
        role: 'MEMBER',
        addedBy: 'user_1',
        createdAt: 1788000000,
        updatedAt: 1788000000,
      },
      error: null,
    })
    mocks.updateMember.mockResolvedValue({
      data: {
        object: 'team_member',
        id: 'crm_tm_1',
        tenantId: 'org_1',
        teamId: 'team_1',
        userId: 'user_althea_123',
        role: 'MEMBER',
        addedBy: 'user_1',
        createdAt: 1788000000,
        updatedAt: 1788000000,
      },
      error: null,
    })
    mocks.removeMember.mockResolvedValue({
      data: { object: 'team_member', id: 'crm_tm_1', deleted: true },
      error: null,
    })
  })

  it('renders team header and overview metadata', () => {
    render(
      <TeamDetail
        team={aTeam()}
        directory={directory}
        onClose={mocks.onClose}
      />
    )

    expect(screen.getAllByText('Customer Success').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(
      screen.getByText('Handles support and client queries')
    ).toBeInTheDocument()
    expect(screen.getByText('Round robin')).toBeInTheDocument()
    expect(screen.getByText('team_1')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <TeamDetail
        team={aTeam()}
        directory={directory}
        onClose={mocks.onClose}
      />
    )

    fireEvent.click(screen.getByLabelText('Close team details'))
    expect(mocks.onClose).toHaveBeenCalledTimes(1)
  })

  it('renders members and allows updating member roles and removing members', async () => {
    const user = userEvent.setup()
    render(
      <TeamDetail
        team={aTeam()}
        directory={directory}
        onClose={mocks.onClose}
      />
    )

    // Switch to Members tab
    fireEvent.click(screen.getByRole('tab', { name: /Members/ }))
    expect(screen.getByText('Althea Campbell')).toBeInTheDocument()
    expect(screen.getByText('althea@example.com')).toBeInTheDocument()
    expect(screen.getByText('Lead')).toBeInTheDocument()

    // Open member actions dropdown
    const actionsButton = screen.getByLabelText('Actions for Althea Campbell')
    await user.click(actionsButton)

    // Make member
    const makeMemberItem = await screen.findByText('Make member')
    await user.click(makeMemberItem)

    expect(mocks.updateMember).toHaveBeenCalledWith(
      'team_1',
      'user_althea_123',
      { role: 'MEMBER' }
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })
})
