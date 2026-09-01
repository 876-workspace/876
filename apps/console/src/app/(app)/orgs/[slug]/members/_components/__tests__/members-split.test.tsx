// @vitest-environment jsdom
import type { AdminOrgMember } from '@876/platform/compat'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MembersSplit } from '../members-split'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/orgs/test-org/members',
}))

function aMember(overrides: Partial<AdminOrgMember> = {}): AdminOrgMember {
  return {
    object: 'organization_member',
    id: 'mem_1',
    user_id: 'user_1',
    role: 'admin',
    role_id: null,
    status: 'active',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    avatar: null,
    created_at: 1700000000,
    ...overrides,
  }
}

const members = [
  aMember(),
  aMember({
    id: 'mem_2',
    user_id: 'user_2',
    first_name: 'John',
    email: 'john@example.com',
    role: 'staff',
  }),
]

describe('MembersSplit', () => {
  it('renders members list in full table mode when no selection', () => {
    render(
      <MembersSplit
        members={members}
        selectedId={undefined}
        basePath="/orgs/test-org/members"
      />
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders member detail sheet when a member is selected', () => {
    render(
      <MembersSplit
        members={members}
        apps={<div>Apps Content</div>}
        activity={<div>Activity Content</div>}
        selectedId="mem_1"
        basePath="/orgs/test-org/members"
      />
    )
    expect(screen.getByLabelText('Close member details')).toBeInTheDocument()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)
    expect(screen.getAllByText('mem_1').length).toBeGreaterThan(0)
  })

  it('renders empty state when members list is empty', () => {
    render(
      <MembersSplit
        members={[]}
        selectedId={undefined}
        basePath="/orgs/test-org/members"
      />
    )
    expect(screen.getByText('No members')).toBeInTheDocument()
  })
})
