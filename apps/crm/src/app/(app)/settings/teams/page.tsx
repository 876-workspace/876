import { Suspense } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import type { CrmTeamStatus } from '@/types/crm'
import type { DirectoryMember } from '@/features/directory/types'

import { TEAMS_SKELETON_COLUMNS } from './_components/teams-skeleton-columns'
import { TeamsTable, type TeamRow } from './_components/teams-table'

export const metadata = { title: 'Teams - Settings' }

const TEAM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All teams' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function isTeamStatus(value: string | undefined): value is CrmTeamStatus {
  return value === 'ACTIVE' || value === 'ARCHIVED'
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function TeamsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = isTeamStatus(status) ? status : 'all'

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Teams"
        titleFilter={
          <StatusFilterHeading
            label="Teams"
            value={selectedStatus}
            options={TEAM_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/settings/teams/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={<DataTableSkeleton columns={TEAMS_SKELETON_COLUMNS} />}
      >
        <TeamsTableData
          status={selectedStatus === 'all' ? undefined : selectedStatus}
        />
      </Suspense>
    </Page>
  )
}

async function TeamsTableData({ status }: { status?: CrmTeamStatus }) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const [teamsResult, membersResult] = await Promise.all([
    $876.teams.list(context.orgId, { status, includeMembers: true }),
    $876.organizationMembers.list(context.orgId),
  ])
  if (teamsResult.error) throw new Error(teamsResult.error.message)

  const directory = new Map<string, DirectoryMember>(
    (membersResult.data?.data ?? []).map((member) => {
      const name =
        [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.email ||
        member.user_id
      return [
        member.user_id,
        {
          userId: member.user_id,
          name,
          email: member.email,
          avatar: member.avatar,
        },
      ]
    })
  )

  const teams: TeamRow[] = teamsResult.data.data.map((team) => ({
    id: team.id,
    name: team.name,
    members: (team.members ?? []).map(
      (member) =>
        directory.get(member.userId) ?? {
          userId: member.userId,
          name: member.userId,
          email: null,
          avatar: null,
        }
    ),
    isDefault: team.isDefault,
    autoAssign: team.autoAssign,
    status: team.status,
    createdAt: team.createdAt,
  }))

  return <TeamsTable teams={teams} />
}
