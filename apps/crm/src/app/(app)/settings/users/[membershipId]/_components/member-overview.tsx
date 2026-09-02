import { AppAccessSummary } from '@876/access-ui/app-access-summary'
import type { AccessAppEntry } from '@876/access-ui/types'
import { AppError } from '@876/ui/app-error'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

import {
  formatMemberDate,
  memberName,
  memberRoleLabel,
} from '../../_lib/member-utils'
import type { OrgMember } from '../../_lib/types'

type EmployeeProfileView = {
  employee_number: string | null
  job_title: string | null
  department_id: string | null
  location_id: string | null
  manager_membership_id: string | null
  employment_type: string | null
  employment_status: string
  start_date: number | null
}

export function MemberOverview({
  member,
  profile,
  employeeError,
  accessError,
  members,
  accessEntries,
}: {
  member: OrgMember
  profile: EmployeeProfileView | null
  employeeError: { code: string; message: string } | null
  accessError: { code: string; message: string } | null
  members: OrgMember[]
  accessEntries: AccessAppEntry[]
}) {
  const manager = profile?.manager_membership_id
    ? members.find(
        (candidate) => candidate.id === profile.manager_membership_id
      )
    : null
  return (
    <div className="space-y-8">
      <DetailCardSection title="Profile">
        <DetailCardFacts>
          <DetailCardFact label="Name" value={memberName(member)} />
          <DetailCardFact label="Email" value={member.email ?? '—'} />
          <DetailCardFact
            label="Organization role"
            value={memberRoleLabel(member.role)}
          />
          <DetailCardFact
            label="Status"
            value={<span className="capitalize">{member.status}</span>}
          />
          <DetailCardFact
            label="Member since"
            value={formatMemberDate(member.created_at)}
          />
          <DetailCardFact label="Membership ID" value={member.id} mono />
        </DetailCardFacts>
      </DetailCardSection>
      {employeeError ? (
        <AppError
          title="Employment details could not be loaded"
          error={employeeError}
          variant="section"
        />
      ) : profile ? (
        <DetailCardSection title="Employment">
          <DetailCardFacts>
            {profile.employee_number ? (
              <DetailCardFact
                label="Employee number"
                value={profile.employee_number}
              />
            ) : null}
            {profile.job_title ? (
              <DetailCardFact label="Job title" value={profile.job_title} />
            ) : null}
            {profile.department_id ? (
              <DetailCardFact
                label="Department"
                value={profile.department_id}
                mono
              />
            ) : null}
            {profile.location_id ? (
              <DetailCardFact
                label="Location"
                value={profile.location_id}
                mono
              />
            ) : null}
            {manager ? (
              <DetailCardFact label="Manager" value={memberName(manager)} />
            ) : null}
            {profile.employment_type ? (
              <DetailCardFact
                label="Employment type"
                value={profile.employment_type}
              />
            ) : null}
            {profile.employment_status ? (
              <DetailCardFact
                label="Employment status"
                value={profile.employment_status}
              />
            ) : null}
            {profile.start_date ? (
              <DetailCardFact
                label="Start date"
                value={formatMemberDate(profile.start_date)}
              />
            ) : null}
          </DetailCardFacts>
        </DetailCardSection>
      ) : null}
      <DetailCardSection title="App access">
        {accessError ? (
          <AppError
            title="App access could not be loaded"
            error={accessError}
            variant="section"
          />
        ) : (
          <AppAccessSummary entries={accessEntries} />
        )}
      </DetailCardSection>
    </div>
  )
}
