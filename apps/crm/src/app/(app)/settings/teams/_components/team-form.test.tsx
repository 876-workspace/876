import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TeamForm } from './team-form'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    teams: { create: mocks.create, update: mocks.update },
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

function createTeamResult() {
  return {
    data: {
      object: 'team' as const,
      id: 'crm_team_support_123',
      tenantId: 'org_island_123',
      name: 'Customer Support',
      slug: 'customer-support',
      description: null,
      color: 'blue',
      isDefault: false,
      autoAssign: 'NONE' as const,
      status: 'ACTIVE' as const,
      createdBy: 'user_althea_123',
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
    },
    error: null,
  }
}

describe('TeamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue(createTeamResult())
  })

  it('blocks an empty name without calling the client', async () => {
    const user = userEvent.setup()
    render(<TeamForm />)

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('submits the exact create payload for a valid team', async () => {
    const user = userEvent.setup()
    render(<TeamForm />)
    await user.type(screen.getByLabelText('Name'), 'Customer Support')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith({
      name: 'Customer Support',
      description: null,
      color: 'blue',
      autoAssign: 'NONE',
      isDefault: false,
    })
    expect(mocks.replace).toHaveBeenCalledTimes(1)
    expect(mocks.replace).toHaveBeenCalledWith(
      '/settings/teams/crm_team_support_123'
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
