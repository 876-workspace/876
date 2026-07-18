/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { AdminUser } from '@876/admin'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountFactsPanel } from './account-facts-panel'

vi.mock('./overview-lazy', () => ({
  LazyProfileFacts: ({ userId }: { userId: string }) => (
    <dt>Lazy profile facts for {userId}</dt>
  ),
}))

const user: AdminUser = {
  object: 'user',
  id: 'user_123',
  company: null,
  company_short_name: null,
  company_logo: null,
  workos_user_id: 'user_workos',
  stripe_customer_id: 'cus_123',
  email: 'ada@example.com',
  username: 'ada',
  email_verified: true,
  first_name: 'Ada',
  last_name: 'Lovelace',
  middle_name: 'Byron',
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

describe('AccountFactsPanel', () => {
  it('renders stable account facts and keeps lazy profile facts isolated', () => {
    render(<AccountFactsPanel user={user} />)

    expect(screen.getByText('First name')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Middle name')).toBeInTheDocument()
    expect(screen.getByText('Byron')).toBeInTheDocument()
    expect(screen.getByText('Email verified')).toBeInTheDocument()
    expect(screen.getByText('cus_123')).toBeInTheDocument()
    expect(
      screen.getByText('Lazy profile facts for user_123')
    ).toBeInTheDocument()
  })

  it('renders empty optional fields and banned status without phantom facts', () => {
    render(
      <AccountFactsPanel
        user={{
          ...user,
          first_name: '',
          last_name: '',
          middle_name: null,
          stripe_customer_id: null,
          username: null,
          email_verified: false,
          banned: true,
        }}
      />
    )

    expect(screen.queryByText('Middle name')).not.toBeInTheDocument()
    expect(screen.queryByText('Stripe customer')).not.toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('banned')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3)
  })
})
