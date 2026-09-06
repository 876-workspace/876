/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { MemberInvitePanel } from './member-invite-panel'
import type { FinanceInviteSummary, FinanceRoleSummary } from './types'
const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const
const roles: FinanceRoleSummary[] = [
  {
    id: 'role_bookkeeper',
    slug: 'bookkeeper',
    name: 'Bookkeeper',
    description: '',
    permissions: [],
    isSystem: false,
    isDefault: false,
    memberCount: 0,
  },
]
const invites: FinanceInviteSummary[] = [
  {
    id: 'invite_alejandra',
    email: 'alejandra@example.com',
    roleId: 'role_bookkeeper',
    roleName: 'Bookkeeper',
    expiresAt: 1_800_000_000,
  },
]
function renderInvites(
  overrides: Partial<Parameters<typeof MemberInvitePanel>[0]> = {}
) {
  const onInvite =
    overrides.onInvite ?? vi.fn().mockResolvedValue({ error: null })
  const onRevoke =
    overrides.onRevoke ?? vi.fn().mockResolvedValue({ error: null })
  return {
    user: userEvent.setup(),
    onInvite,
    onRevoke,
    ...render(
      <MemberInvitePanel
        roles={roles}
        invites={invites}
        canManage
        {...overrides}
        onInvite={onInvite}
        onRevoke={onRevoke}
      />
    ),
  }
}
describe('MemberInvitePanel', () => {
  it('sends a trimmed email and exact selected role once', async () => {
    const { user, onInvite } = renderInvites()
    await user.type(
      screen.getByLabelText('Email'),
      ' alejandra+finance@example.com '
    )
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(onInvite).toHaveBeenCalledWith({
      email: 'alejandra+finance@example.com',
      roleId: 'role_bookkeeper',
    })
  })
  it('does not send an empty email', async () => {
    const { user, onInvite } = renderInvites()
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(onInvite).not.toHaveBeenCalled()
  })
  it('clears email value on successful invite', async () => {
    const { user, onInvite } = renderInvites()
    await user.type(screen.getByLabelText('Email'), 'alejandra@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })
  it('uses the supplied close link', () => {
    renderInvites({ closeHref: '/settings/users' })
    expect(
      screen.getByRole('link', { name: 'Close invite form' })
    ).toHaveAttribute('href', '/settings/users')
  })
  it('keeps email values and shows invite errors', async () => {
    const { user, onInvite } = renderInvites({
      onInvite: vi.fn().mockResolvedValue({
        error: { code: 'invite/exists', message: 'Already invited.' },
      }),
    })
    await user.type(screen.getByLabelText('Email'), 'alejandra@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(onInvite).toHaveBeenCalledTimes(1)
    expect(
      screen.getByDisplayValue('alejandra@example.com')
    ).toBeInTheDocument()
    expect(await screen.findByText('invite/exists')).toBeInTheDocument()
  })
  it('renders pending invites', () => {
    renderInvites()
    expect(screen.getByText('Pending invites')).toBeInTheDocument()
    expect(screen.getByText('alejandra@example.com')).toBeInTheDocument()
  })
  it('hides revoke controls without management access', () => {
    renderInvites({ canManage: false })
    expect(
      screen.queryByRole('button', { name: 'Revoke' })
    ).not.toBeInTheDocument()
  })
  it('calls revoke with the invite id once after confirmation', async () => {
    const { user, onRevoke } = renderInvites()
    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    await user.click(screen.getAllByRole('button', { name: 'Revoke' }).at(-1)!)
    expect(onRevoke).toHaveBeenCalledTimes(1)
    expect(onRevoke).toHaveBeenCalledWith('invite_alejandra')
  })
  it.each(SECURITY_INPUTS)(
    'does not submit security corpus invite email: %s',
    async (value) => {
      const { user, onInvite } = renderInvites()
      fireEvent.change(screen.getByLabelText('Email'), { target: { value } })
      expect(screen.getByRole('button', { name: 'Send invite' })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Send invite' }))
      expect(onInvite).not.toHaveBeenCalled()
    }
  )
})
