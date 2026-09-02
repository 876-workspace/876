// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { OrgMember } from '../../_lib/types'
import { MemberOverview } from './member-overview'

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
  created_at: 1_700_000_000,
}
const profile = {
  employee_number: 'E-100',
  job_title: 'Engineer',
  department_id: 'dept_1',
  location_id: 'loc_1',
  manager_membership_id: 'mem_2',
  employment_type: 'full-time',
  employment_status: 'active',
  start_date: 1_700_000_000,
}
function renderOverview(
  overrides: Partial<Parameters<typeof MemberOverview>[0]> = {}
) {
  return render(
    <MemberOverview
      member={member}
      members={[
        member,
        { ...member, id: 'mem_2', first_name: 'Grace', last_name: 'Hopper' },
      ]}
      profile={profile}
      employeeError={null}
      accessError={null}
      accessEntries={[]}
      {...overrides}
    />
  )
}

describe('MemberOverview', () => {
  it('renders every present employment field', () => {
    renderOverview()
    expect(screen.getByText('E-100')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('full-time')).toBeInTheDocument()
  })
  it('omits null employment fields', () => {
    renderOverview({ profile: { ...profile, employee_number: null } })
    expect(screen.queryByText('Employee number')).toBeNull()
  })
  it('renders profile alone when no employee profile exists', () => {
    renderOverview({ profile: null })
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.queryByText('Employment')).toBeNull()
  })
  it('keeps profile mounted when employee loading fails', () => {
    renderOverview({
      profile: null,
      employeeError: { code: 'core/unavailable', message: 'Try again.' },
    })
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Try again.')).toBeInTheDocument()
  })
  it('resolves the manager from the member roster', () => {
    renderOverview()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })
  it('renders the app access summary below profile details', () => {
    renderOverview()
    expect(screen.getByText('No entitled apps')).toBeInTheDocument()
  })
  it('distinguishes an app access failure from an empty entitlement list', () => {
    renderOverview({
      accessError: { code: 'core/unavailable', message: 'Access unavailable.' },
    })

    expect(screen.getByText('Access unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('No entitled apps')).toBeNull()
  })
})
