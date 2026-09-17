// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { OrgMember } from '@/types/users'
import { MemberCard, MemberCardHeader } from './member-card'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/users/mem_1',
}))

const member: OrgMember = {
  object: 'organization_member',
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

describe('MemberCard', () => {
  it('renders tab chrome with the member identity', () => {
    render(
      <MemberCard
        membershipId={member.id}
        header={<MemberCardHeader member={member} />}
      >
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })
  it('renders overview, app access, and permissions tabs immediately', () => {
    render(
      <MemberCard membershipId={member.id} header={<p>Identity loading</p>}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('App access')).toBeInTheDocument()
    expect(screen.getByText('Permissions')).toBeInTheDocument()
  })
  it('carries the membership id in the overview tab href', () => {
    render(
      <MemberCard membershipId={member.id} header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Overview')).toHaveAttribute(
      'href',
      '/settings/users/mem_1'
    )
  })
  it('carries the membership id in the app access tab href', () => {
    render(
      <MemberCard membershipId={member.id} header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('App access')).toHaveAttribute(
      'href',
      '/settings/users/mem_1/access'
    )
  })
  it('carries the membership id in the permissions tab href', () => {
    render(
      <MemberCard membershipId={member.id} header={null}>
        <p>Body</p>
      </MemberCard>
    )
    expect(screen.getByText('Permissions')).toHaveAttribute(
      'href',
      '/settings/users/mem_1/permissions'
    )
  })
  it('renders the detail card as the column root', () => {
    const { container } = render(
      <MemberCard membershipId={member.id} header={null}>
        <p>Body</p>
      </MemberCard>
    )

    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild).toHaveAttribute(
      'data-slot',
      'detail-card'
    )
  })
})
