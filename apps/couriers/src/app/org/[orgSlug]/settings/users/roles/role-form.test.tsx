/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoleView } from '@/types/role'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    roles: {
      create: mocks.create,
      update: mocks.update,
      delete: mocks.del,
    },
  },
}))

import { RoleForm } from './role-form'

function createRole(overrides: Partial<RoleView> = {}): RoleView {
  return {
    id: 'role_dispatcher',
    name: 'Dispatcher',
    description: 'Coordinates parcels.',
    permissions: ['packages.view'],
    isDefault: false,
    systemKey: null,
    memberCount: 0,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('RoleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'role_new' }, error: null })
    mocks.update.mockResolvedValue({
      data: createRole({ name: 'Dispatch' }),
      error: null,
    })
  })

  it('creates a custom role with matrix permissions then returns to the list', async () => {
    const user = userEvent.setup()

    render(<RoleForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Dispatcher')
    await user.type(
      screen.getByLabelText('Description'),
      'Coordinates parcels.'
    )
    await user.click(screen.getByRole('checkbox', { name: 'View Packages' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledTimes(1)
    })
    expect(mocks.create).toHaveBeenCalledWith('island-logistics', {
      name: 'Dispatcher',
      description: 'Coordinates parcels.',
      permissions: ['packages.view'],
    })
    expect(mocks.push).toHaveBeenCalledWith(
      '/org/island-logistics/settings/users/roles'
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('locks default roles: fields disabled, no Save/Delete, no client calls', async () => {
    const user = userEvent.setup()

    render(
      <RoleForm
        orgSlug="island-logistics"
        role={createRole({
          id: 'role_admin',
          name: 'Admin',
          isDefault: true,
          systemKey: 'admin',
          permissions: [],
        })}
      />
    )

    expect(screen.getByText(/cannot be edited/i)).toBeVisible()
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Description')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'View Items' }))

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('shows service errors inline and does not navigate away', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'role/name-taken',
        message: 'A role with that name already exists.',
      },
    })

    render(<RoleForm orgSlug="island-logistics" />)

    await user.type(screen.getByLabelText('Name'), 'Dispatcher')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('A role with that name already exists.')
    ).toBeVisible()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
