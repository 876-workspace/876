/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { financePermissionSurface } from '@876/core/access/finance-catalog'
import { RoleCardPanel } from '@876/billing-ui/panels/access/role-card-panel'
import { RoleFormPanel } from '@876/billing-ui/panels/access/role-form-panel'
import { RolesShell } from '@876/billing-ui/panels/access/roles-shell'
import type { FinanceRoleSummary } from '@876/billing-ui/panels/access/types'

const surface = financePermissionSurface('billing')

function role(overrides: Partial<FinanceRoleSummary> = {}): FinanceRoleSummary {
  return {
    id: 'role_1',
    slug: 'bookkeeper',
    name: 'Bookkeeper',
    description: 'Records payments.',
    permissions: ['billing:access', 'customers:read'],
    isSystem: false,
    isDefault: false,
    memberCount: 0,
    ...overrides,
  }
}

function renderCard(
  overrides: Partial<Parameters<typeof RoleCardPanel>[0]> = {}
) {
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue({ error: null })
  const onDelete =
    overrides.onDelete ?? vi.fn().mockResolvedValue({ error: null })

  return {
    onSave,
    onDelete,
    user: userEvent.setup(),
    ...render(
      <RoleCardPanel
        role={role()}
        surface={surface}
        canManage
        closeHref="/settings/roles"
        {...overrides}
        onSave={onSave}
        onDelete={onDelete}
      />
    ),
  }
}

describe('Billing shared role panels', () => {
  it('creating a role sends the matrix selection with implied reads', async () => {
    const onCreate = vi.fn().mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(
      <RoleFormPanel
        surface={surface}
        closeHref="/settings/roles"
        onCreate={onCreate}
      />
    )

    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.click(screen.getByLabelText('Customers: Manage'))
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Collections',
      slug: 'collections',
      description: '',
      permissions: ['billing:access', 'customers:read', 'customers:write'],
    })
  })

  it('a system role offers neither save nor delete', () => {
    renderCard({ role: role({ isSystem: true }) })

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('a role with members offers no delete', () => {
    renderCard({ role: role({ memberCount: 2 }) })

    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.getByText(/Reassign 2 members/)).toBeInTheDocument()
  })

  it('a failed save keeps form values mounted and renders the error code without a toast', async () => {
    const { onSave, user } = renderCard({
      onSave: vi.fn().mockResolvedValue({
        error: { code: 'access/conflict', message: 'Name is in use.' },
      }),
    })
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByDisplayValue('Collections')).toBeInTheDocument()
    expect(await screen.findByText('access/conflict')).toBeInTheDocument()
    expect(screen.queryByText('Role saved.')).toBeNull()
  })

  it('saving sends the current fields exactly once', async () => {
    const { onSave, user } = renderCard()
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      name: 'Collections',
      description: 'Records payments.',
      permissions: ['billing:access', 'customers:read'],
    })
  })

  it('does not save a blank role name', async () => {
    const { onSave, user } = renderCard()
    await user.clear(screen.getByLabelText('Name'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('clearing a read grant removes its write grant', async () => {
    const { onSave, user } = renderCard({
      role: role({
        permissions: ['billing:access', 'customers:read', 'customers:write'],
      }),
    })
    await user.click(screen.getByLabelText('Customers: View'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith({
      name: 'Bookkeeper',
      description: 'Records payments.',
      permissions: ['billing:access'],
    })
  })

  it('keeps a role form error beside the entered fields', async () => {
    const onCreate = vi.fn().mockResolvedValue({
      error: { code: 'access/duplicate', message: 'Slug exists.' },
    })
    const user = userEvent.setup()
    render(
      <RoleFormPanel
        surface={surface}
        closeHref="/settings/roles"
        onCreate={onCreate}
      />
    )
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByDisplayValue('Collections')).toBeInTheDocument()
    expect(await screen.findByText('access/duplicate')).toBeInTheDocument()
  })

  it('does not submit a form with an invalid slug', async () => {
    const onCreate = vi.fn().mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(
      <RoleFormPanel
        surface={surface}
        closeHref="/settings/roles"
        onCreate={onCreate}
      />
    )
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'not valid')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreate).not.toHaveBeenCalled()
  })

  it('calls deletion only after its confirmation action', async () => {
    const { onDelete, user } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith()
  })

  it('opening a role leaves the list beside it in the split view', () => {
    render(
      <RolesShell
        title="Roles"
        newHref="/settings/roles/new"
        canCreate
        list={<div>persistent role list</div>}
      >
        <div>opened role detail</div>
      </RolesShell>
    )

    expect(screen.getByText('persistent role list')).toBeInTheDocument()
    expect(screen.getByText('opened role detail')).toBeInTheDocument()
  })

  it('honours the shared close route for a role record', () => {
    renderCard()

    expect(
      screen.getByRole('link', { name: 'Close role details' })
    ).toHaveAttribute('href', '/settings/roles')
  })
})
