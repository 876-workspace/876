// @vitest-environment jsdom
import type { AdminOrgMember, AdminUser } from '@876/platform/compat'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberDetail } from '../member-detail'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

const member: AdminOrgMember = {
  object: 'organization_member',
  id: 'mem_1',
  user_id: 'user_1',
  role: 'super-admin',
  role_id: null,
  status: 'active',
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
  avatar: null,
  created_at: 1700000000,
}

const user: AdminUser = {
  object: 'user',
  id: 'user_1',
  company: null,
  company_short_name: null,
  company_logo: null,
  workos_user_id: 'wos_1',
  stripe_customer_id: null,
  email: 'alice@example.com',
  username: 'alicesmith',
  email_verified: true,
  first_name: 'Alice',
  last_name: 'Smith',
  middle_name: null,
  avatar: null,
  avatar_file_id: null,
  status: 'active',
  platform_role: 'admin',
  banned: false,
  banned_reason: null,
  deleted_at: null,
  deleted_by: null,
  deletion_reason: null,
  created_at: 1690000000,
  updated_at: 1700000000,
}

describe('MemberDetail', () => {
  it('renders member header and overview details', () => {
    render(
      <MemberDetail
        member={member}
        user={user}
        now={1700000000}
        onClose={vi.fn()}
      />
    )
    expect(
      screen.getByRole('heading', { name: 'Alice Smith' })
    ).toBeInTheDocument()
    expect(screen.getAllByText('super-admin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText('@alicesmith')).toBeInTheDocument()
    expect(screen.getAllByText('mem_1').length).toBeGreaterThan(0)
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <MemberDetail
        member={member}
        user={user}
        now={1700000000}
        onClose={onClose}
      />
    )
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Close member details'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches tabs to Apps and Activity', async () => {
    const userEventSetup = userEvent.setup()
    render(
      <MemberDetail
        member={member}
        user={user}
        apps={<div>APPS_TAB_CONTENT</div>}
        activity={<div>ACTIVITY_TAB_CONTENT</div>}
        now={1700000000}
        onClose={vi.fn()}
      />
    )

    await userEventSetup.click(screen.getByRole('tab', { name: 'Apps' }))
    expect(screen.getByText('APPS_TAB_CONTENT')).toBeInTheDocument()

    await userEventSetup.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(screen.getByText('ACTIVITY_TAB_CONTENT')).toBeInTheDocument()
  })
})
