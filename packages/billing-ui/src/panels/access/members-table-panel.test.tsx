/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { MembersTablePanel } from './members-table-panel'
import type { FinanceMemberSummary, FinanceRoleSummary } from './types'
const member: FinanceMemberSummary = {
  id: 'member_alejandra',
  userId: 'user_alejandra',
  name: 'Alejandra Reyes',
  email: 'alejandra@example.com',
  avatarUrl: null,
  roleId: 'role_bookkeeper',
  roleName: 'Bookkeeper',
  status: 'ACTIVE',
}
const roles: FinanceRoleSummary[] = [
  {
    id: 'role_bookkeeper',
    slug: 'bookkeeper',
    name: 'Bookkeeper',
    description: '',
    permissions: [],
    isSystem: false,
    isDefault: false,
    memberCount: 1,
  },
  {
    id: 'role_admin',
    slug: 'admin',
    name: 'Administrator',
    description: '',
    permissions: [],
    isSystem: true,
    isDefault: false,
    memberCount: 1,
  },
]
function renderMembers(
  overrides: Partial<Parameters<typeof MembersTablePanel>[0]> = {}
) {
  const onChangeRole =
    overrides.onChangeRole ?? vi.fn().mockResolvedValue({ error: null })
  const onChangeStatus =
    overrides.onChangeStatus ?? vi.fn().mockResolvedValue({ error: null })
  const onRemove =
    overrides.onRemove ?? vi.fn().mockResolvedValue({ error: null })
  return {
    user: userEvent.setup(),
    onChangeRole,
    onChangeStatus,
    onRemove,
    ...render(
      <MembersTablePanel
        members={[member]}
        roles={roles}
        canManage
        {...overrides}
        onChangeRole={onChangeRole}
        onChangeStatus={onChangeStatus}
        onRemove={onRemove}
      />
    ),
  }
}
describe('MembersTablePanel', () => {
  it('renders a member name, email, role, and status badge', () => {
    renderMembers()
    expect(screen.getByText('Alejandra Reyes')).toBeInTheDocument()
    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
  it('calls role mutation with exact arguments once', async () => {
    const { user, onChangeRole } = renderMembers()
    await user.selectOptions(
      screen.getByLabelText('Role for Alejandra Reyes'),
      'role_admin'
    )
    expect(onChangeRole).toHaveBeenCalledTimes(1)
    expect(onChangeRole).toHaveBeenCalledWith('member_alejandra', 'role_admin')
  })
  it('shows role as text without management access', () => {
    renderMembers({ canManage: false })
    expect(screen.getByText('Bookkeeper')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Role for Alejandra Reyes')
    ).not.toBeInTheDocument()
  })
  it('does not show action controls without management access', () => {
    renderMembers({ canManage: false })
    expect(
      screen.queryByLabelText('Actions for Alejandra Reyes')
    ).not.toBeInTheDocument()
  })
  it('renders a failure in place', async () => {
    const { user, onChangeRole } = renderMembers({
      onChangeRole: vi.fn().mockResolvedValue({
        error: { code: 'access/forbidden', message: 'Not allowed.' },
      }),
    })
    await user.selectOptions(
      screen.getByLabelText('Role for Alejandra Reyes'),
      'role_admin'
    )
    expect(onChangeRole).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('access/forbidden')).toBeInTheDocument()
  })
  it('does not call mutations before an action', () => {
    const { onChangeRole, onChangeStatus, onRemove } = renderMembers()
    expect(onChangeRole).not.toHaveBeenCalled()
    expect(onChangeStatus).not.toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
  })
  it('calls status mutation with exact arguments once', async () => {
    const { user, onChangeStatus } = renderMembers()
    const actions = screen.getByLabelText('Actions for Alejandra Reyes')
    actions.focus()
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getByText('Suspend'))
    expect(onChangeStatus).toHaveBeenCalledTimes(1)
    expect(onChangeStatus).toHaveBeenCalledWith('member_alejandra', 'SUSPENDED')
  })
  it('calls remove mutation with the member id once', async () => {
    const { user, onRemove } = renderMembers()
    const actions = screen.getByLabelText('Actions for Alejandra Reyes')
    actions.focus()
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getByText('Remove'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith('member_alejandra')
  })
})
