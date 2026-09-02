// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberCard, MemberCardHeader } from './member-card'
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/users/mem_1',
}))
const member = {
  object: 'organization_member' as const,
  id: 'mem_1',
  user_id: 'usr_1',
  role: 'member',
  role_id: null,
  position: null,
  status: 'active',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  avatar: null,
  created_at: 1,
}
describe('Invoice MemberCard', () => {
  it('renders the member identity', () => {
    render(
      <MemberCard
        membershipId="mem_1"
        header={<MemberCardHeader member={member} />}
      >
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
  it('renders the overview tab', () => {
    render(
      <MemberCard membershipId="mem_1" header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })
  it('renders the app access tab', () => {
    render(
      <MemberCard membershipId="mem_1" header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('App access')).toBeInTheDocument()
  })
  it('renders the permissions tab', () => {
    render(
      <MemberCard membershipId="mem_1" header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Permissions')).toBeInTheDocument()
  })
  it('uses the member id in app-access routes', () => {
    render(
      <MemberCard membershipId="mem_1" header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('App access')).toHaveAttribute(
      'href',
      '/settings/users/mem_1/access'
    )
  })
  it('uses the member id in permission routes', () => {
    render(
      <MemberCard membershipId="mem_1" header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Permissions')).toHaveAttribute(
      'href',
      '/settings/users/mem_1/permissions'
    )
  })
})
