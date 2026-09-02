import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { getWorkspace } from '@/lib/services/workspace'

import { buildAccessEntries } from '@876/access-ui/entries'
import { loadMember, loadMemberAppMemberships, loadUsers } from '../_data'
import { MemberOverview } from './_components/member-overview'

export default async function MemberOverviewPage({
  params,
}: {
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  const context = await requireCrmContext()
  const [memberResult, roster, appMemberships, employeesResult] =
    await Promise.all([
      loadMember(context.orgId, membershipId),
      loadUsers(context.orgId),
      loadMemberAppMemberships(context.orgId, membershipId),
      loadEmployees(context.orgId),
    ])
  if (memberResult.error)
    return (
      <AppError
        title="User could not be loaded"
        error={memberResult.error}
        variant="section"
      />
    )
  if (!memberResult.member) notFound()

  const profile =
    employeesResult.data?.data.find(
      (employee) => employee.membership_id === membershipId
    ) ?? null
  return (
    <MemberOverview
      member={memberResult.member}
      members={roster.members}
      profile={profile}
      employeeError={employeesResult.error}
      accessError={appMemberships.error}
      accessEntries={buildAccessEntries(appMemberships.memberships, new Map())}
    />
  )
}

async function loadEmployees(orgId: string) {
  const workspace = await getWorkspace()
  return workspace.employees.list(orgId)
}
