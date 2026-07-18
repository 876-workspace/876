/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { AdminUser } from '@876/admin'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppIdentitiesPanel, appIdentityCount } from './app-identities-panel'

vi.mock('./overview-lazy', () => ({
  LazyEnterpriseIdentities: ({ userId }: { userId: string }) => (
    <span>Enterprise identities for {userId}</span>
  ),
}))

const user: AdminUser = {
  object: 'user',
  id: 'user_123',
  company: null,
  company_short_name: null,
  company_logo: null,
  workos_user_id: 'user_workos',
  stripe_customer_id: null,
  email: 'ada@example.com',
  username: 'ada',
  email_verified: true,
  first_name: 'Ada',
  last_name: 'Lovelace',
  middle_name: null,
  avatar: null,
  status: 'active',
  platform_role: null,
  banned: false,
  banned_reason: null,
  deleted_at: null,
  deleted_by: null,
  deletion_reason: null,
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('AppIdentitiesPanel', () => {
  it('builds app identity rows from memberships and platform role', () => {
    render(
      <AppIdentitiesPanel
        user={user}
        membershipCount={2}
        mcRole="admin"
        enrolledApps={[]}
      />
    )

    expect(screen.getByText('876')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
    expect(screen.getByText('Console')).toBeInTheDocument()
    expect(
      screen.getByText('Enterprise identities for user_123')
    ).toBeInTheDocument()
  })

  it('renders only the consumer identity for a consumer without memberships', () => {
    render(
      <AppIdentitiesPanel
        user={{ ...user, username: null }}
        membershipCount={0}
        mcRole={null}
        enrolledApps={[]}
      />
    )

    expect(screen.getByText('876')).toBeInTheDocument()
    expect(screen.getByText('Consumer account')).toBeInTheDocument()
    expect(screen.queryByText('Enterprise')).not.toBeInTheDocument()
    expect(screen.queryByText('Console')).not.toBeInTheDocument()
  })

  it('counts visible identities without materializing React rows in the page', () => {
    expect(appIdentityCount(null, 0)).toBe(1)
    expect(appIdentityCount(null, 1)).toBe(2)
    expect(appIdentityCount('admin', 1)).toBe(3)
  })
})
