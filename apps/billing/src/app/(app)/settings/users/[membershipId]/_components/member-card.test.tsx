// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberCard, MemberCardHeader } from './member-card'
import type { OrgMember } from '@876/access-ui/member-types'
const member: OrgMember = {
  object: 'organization_member',
  id: 'mem_1',
  user_id: 'usr_1',
  role: 'super-admin',
  role_id: null,
  position: null,
  status: 'active',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  avatar: null,
  created_at: 1,
}
describe('Billing member record', () => {
  it('renders the member name and email', () => {
    render(<MemberCardHeader member={member} />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })
  it('renders fallback initials', () => {
    render(
      <MemberCardHeader
        member={{
          ...member,
          first_name: 'Ada',
          last_name: 'Lovelace',
          avatar: null,
        }}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
  })
  it('renders a suspended status', () => {
    render(<MemberCardHeader member={{ ...member, status: 'suspended' }} />)
    expect(screen.getByText('suspended')).toBeInTheDocument()
  })
  it('renders all member tabs', () => {
    render(
      <MemberCard
        membershipId="mem_1"
        header={<MemberCardHeader member={member} />}
      >
        <span>record</span>
      </MemberCard>
    )
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/settings/users/mem_1'
    )
    expect(screen.getByRole('link', { name: 'App access' })).toHaveAttribute(
      'href',
      '/settings/users/mem_1/access'
    )
    expect(screen.getByRole('link', { name: 'Permissions' })).toHaveAttribute(
      'href',
      '/settings/users/mem_1/permissions'
    )
  })
})
