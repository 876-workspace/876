import { render, screen } from '@testing-library/react'

import { TeamActivity } from './team-activity'
import type { TeamRow } from './team-row'

function createTeam(overrides: Partial<TeamRow> = {}): TeamRow {
  return {
    id: 'crm_team_9f21',
    name: 'Technical Support',
    slug: 'technical-support',
    description: 'L2 and L3 technical investigation',
    color: 'blue',
    members: [],
    isDefault: false,
    autoAssign: 'ROUND_ROBIN',
    status: 'ACTIVE',
    createdAt: 1720000000,
    updatedAt: 1720000000,
    ...overrides,
  }
}

describe('TeamActivity', () => {
  it('renders only the creation event when the team has never changed', () => {
    render(<TeamActivity team={createTeam()} />)

    expect(screen.getByText('Team created')).toBeInTheDocument()
    expect(screen.queryByText('Team updated')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('adds an update event when updatedAt is later than createdAt', () => {
    render(
      <TeamActivity
        team={createTeam({ createdAt: 1720000000, updatedAt: 1724400000 })}
      />
    )

    expect(screen.getByText('Team created')).toBeInTheDocument()
    expect(screen.getByText('Team updated')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('reports the latest change as an archive when the team is archived', () => {
    render(
      <TeamActivity
        team={createTeam({
          status: 'ARCHIVED',
          createdAt: 1720000000,
          updatedAt: 1724400000,
        })}
      />
    )

    expect(screen.getByText('Team archived')).toBeInTheDocument()
    expect(screen.queryByText('Team updated')).not.toBeInTheDocument()
  })

  it('orders events newest first', () => {
    render(
      <TeamActivity
        team={createTeam({ createdAt: 1720000000, updatedAt: 1724400000 })}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Team updated')
    expect(items[1]).toHaveTextContent('Team created')
  })

  it('ignores an updatedAt that is not later than createdAt', () => {
    render(
      <TeamActivity
        team={createTeam({ createdAt: 1724400000, updatedAt: 1720000000 })}
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Team created')).toBeInTheDocument()
  })

  it('renders the creation timestamp', () => {
    render(<TeamActivity team={createTeam({ createdAt: 1720000000 })} />)

    expect(screen.getByText('Jul 3, 2024, 9:46 AM')).toBeInTheDocument()
  })

  it('states that detailed change history is not recorded', () => {
    render(<TeamActivity team={createTeam()} />)

    expect(
      screen.getByText('Detailed change history is not recorded for teams yet.')
    ).toBeInTheDocument()
  })
})
