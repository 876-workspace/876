/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

import { RoleCardPanel } from './role-card-panel'
import type { FinancePermissionSurface, FinanceRoleSummary } from './types'

const surface: FinancePermissionSurface = {
  app: 'billing',
  editable: ['billing:access', 'customers:read', 'customers:write'],
  modules: [
    {
      key: 'customers',
      label: 'Customers',
      permissions: [
        { key: 'customers:read', label: 'View' },
        { key: 'customers:write', label: 'Manage' },
      ],
    },
  ],
}
function role(overrides: Partial<FinanceRoleSummary> = {}): FinanceRoleSummary {
  return {
    id: 'role_bookkeeper',
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
    user: userEvent.setup(),
    onSave,
    onDelete,
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

describe('RoleCardPanel', () => {
  it('renders system roles read-only without Save or Delete', () => {
    renderCard({ role: role({ isSystem: true }) })
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('System roles are read-only.')).toBeInTheDocument()
  })
  it('renders no Delete when the role has members', () => {
    renderCard({ role: role({ memberCount: 2 }) })
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Reassign 2 members/)).toBeInTheDocument()
  })
  it('renders role badges', () => {
    renderCard({ role: role({ isDefault: true }) })
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })
  it('uses the supplied close href', () => {
    renderCard()
    expect(
      screen.getByRole('link', { name: 'Close role details' })
    ).toHaveAttribute('href', '/settings/roles')
  })
  it('saves exact entered values and preserved grants', async () => {
    const { user, onSave } = renderCard({
      role: role({
        permissions: ['billing:access', 'customers:read', 'banking:read'],
      }),
    })
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      name: 'Collections',
      description: 'Records payments.',
      permissions: ['banking:read', 'billing:access', 'customers:read'],
    })
  })
  it('does not save a blank name', async () => {
    const { user, onSave } = renderCard()
    await user.clear(screen.getByLabelText('Name'))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).not.toHaveBeenCalled()
  })
  it('keeps entered values mounted and renders an error code after failed save', async () => {
    const { user, onSave } = renderCard({
      onSave: vi.fn().mockResolvedValue({
        error: { code: 'access/conflict', message: 'Name is in use.' },
      }),
    })
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Collections')
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Collects invoices.')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByDisplayValue('Collections')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Collects invoices.')).toBeInTheDocument()
    expect(await screen.findByText('access/conflict')).toBeInTheDocument()
  })
  it('disables editable inputs for an unauthorized host', () => {
    renderCard({ canManage: false })
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument()
  })
  it('calls delete once after confirmation', async () => {
    const { user, onDelete } = renderCard()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!)
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith()
  })
})
