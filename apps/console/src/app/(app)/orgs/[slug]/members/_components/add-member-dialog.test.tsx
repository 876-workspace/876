/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminOrgRole, AdminUser } from '@876/platform/compat'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  searchMembers: vi.fn(),
  createMember: vi.fn(),
  createInvite: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    members: {
      search: mocks.searchMembers,
      create: mocks.createMember,
    },
    invites: {
      create: mocks.createInvite,
    },
  },
}))

import { AddMemberDialog } from './add-member-dialog'

const roles = [
  {
    id: 'role_member',
    name: 'staff',
    display_name: 'Member',
  },
  {
    id: 'role_owner',
    name: 'super-admin',
    display_name: 'Owner',
  },
] as unknown as AdminOrgRole[]

const existingUser = {
  id: 'user_existing',
  first_name: 'Test',
  last_name: 'User',
  email: 'member@example.com',
} as unknown as AdminUser

function renderDialog() {
  render(<AddMemberDialog orgId="org_01" orgName="Test Org" roles={roles} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add member' }))
  return screen.getByRole('dialog')
}

async function searchFor(value: string) {
  fireEvent.change(screen.getByLabelText('Email or user'), {
    target: { value },
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300)
  })
}

describe('AddMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.searchMembers.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds an existing 876 user immediately', async () => {
    mocks.searchMembers.mockResolvedValue({ data: [existingUser], error: null })
    mocks.createMember.mockResolvedValue({
      data: {
        object: 'membership',
        id: 'mem_01',
        organization_id: 'org_01',
        user_id: 'user_existing',
        role: 'staff',
        status: 'active',
      },
      error: null,
    })
    const dialog = renderDialog()

    await searchFor('member@example.com')
    fireEvent.click(within(dialog).getByRole('button', { name: /Test User/i }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add member' }))
    await act(async () => Promise.resolve())

    expect(mocks.createMember).toHaveBeenCalledTimes(1)
    expect(mocks.createMember).toHaveBeenCalledWith('org_01', {
      userId: 'user_existing',
      role: 'staff',
    })
    expect(mocks.createInvite).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Member added')).toBeVisible()
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('creates an invitation when no existing user is selected', async () => {
    mocks.createInvite.mockResolvedValue({
      data: {
        object: 'invite_token',
        id: 'inv_01',
        organization_id: 'org_01',
        email: 'new@example.com',
        role: 'staff',
        token: 'secret-token',
        status: 'pending',
        expires_at: 1_786_000_000,
        created_at: 1_785_000_000,
      },
      error: null,
    })
    const dialog = renderDialog()

    await searchFor('new@example.com')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create invitation' })
    )
    await act(async () => Promise.resolve())

    expect(mocks.searchMembers).toHaveBeenCalledWith(
      'org_01',
      'new@example.com'
    )
    expect(mocks.createInvite).toHaveBeenCalledTimes(1)
    expect(mocks.createInvite).toHaveBeenCalledWith('org_01', {
      email: 'new@example.com',
      role: 'staff',
    })
    expect(mocks.createMember).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Invitation created')).toBeVisible()
    expect(within(dialog).getByText(/secret-token/)).toBeVisible()
  })

  it('never substitutes an invite record id when the secret token is missing', async () => {
    mocks.createInvite.mockResolvedValue({
      data: {
        object: 'invite_token',
        id: 'inv_public_record',
        organization_id: 'org_01',
        email: 'new@example.com',
        role: 'staff',
        token: null,
        status: 'pending',
        expires_at: 1_786_000_000,
        created_at: 1_785_000_000,
      },
      error: null,
    })
    const dialog = renderDialog()

    await searchFor('new@example.com')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create invitation' })
    )
    await act(async () => Promise.resolve())

    expect(
      within(dialog).getByText(/no shareable token was returned/i)
    ).toBeVisible()
    expect(
      within(dialog).queryByText(/inv_public_record/)
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: 'Copy invitation link' })
    ).not.toBeInTheDocument()
  })
})
