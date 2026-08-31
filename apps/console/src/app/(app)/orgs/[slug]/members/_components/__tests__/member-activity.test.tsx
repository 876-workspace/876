// @vitest-environment jsdom
import type { AdminOrgMember } from '@876/platform/compat'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberActivity } from '../member-activity'

const member: AdminOrgMember = {
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
}

describe('MemberActivity', () => {
  it('renders joined event from member created_at', () => {
    render(<MemberActivity member={member} />)
    expect(screen.getByText('Joined organization')).toBeInTheDocument()
    expect(screen.getByText(/Role assigned: admin/)).toBeInTheDocument()
  })
})
