import { Suspense } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import type { DirectoryMember } from '@/features/directory/types'
import {
  requireAppPermission,
  requireCrmContext,
} from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/clients/crm'
import { getWorkspace } from '@/lib/clients/workspace'
import type { CrmTeamStatus } from '@/types/crm'

import { TEAMS_SKELETON_COLUMNS } from './_components/teams-skeleton-columns'
import type { TeamRow } from './_components/team-row'
import { TeamSplit } from './_components/team-split'
import { TeamSplitSkeleton } from './_components/team-split-skeleton'

export const metadata = { title: 'Teams - Settings' }
const TEAM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Teams' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]
function isTeamStatus(value: string | undefined): value is CrmTeamStatus {
  return value === 'ACTIVE' || value === 'ARCHIVED'
}
type Props = { searchParams: Promise<{ status?: string; team?: string }> }

export default async function TeamsPage({ searchParams }: Props) {
  await requireAppPermission('teams.view')

  const { status, team } = await searchParams
  const selectedStatus = isTeamStatus(status) ? status : 'all'
  const selectedTeamId = team
  return (
    <Page>
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
        primaryHref={
          selectedStatus !== 'all'
            ? `/settings/teams?status=${selectedStatus}&team=new`
            : '/settings/teams?team=new'
        }
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          selectedTeamId ? (
            <TeamSplitSkeleton />
          ) : (
            <DataTableSkeleton columns={TEAMS_SKELETON_COLUMNS} />
          )
        }
      >
        <TeamsTableData
          status={selectedStatus === 'all' ? undefined : selectedStatus}
          selectedTeamId={selectedTeamId}
        />
      </Suspense>
    </Page>
  )
}

async function TeamsTableData({
  status,
  selectedTeamId,
}: {
  status?: CrmTeamStatus
  selectedTeamId?: string
}) {
  const context = await requireCrmContext()
  const workspace = await getWorkspace()
  const [teamsResult, membersResult] = await Promise.all([
    crm.teams.list(context.orgId, { status, includeMembers: true }),
    workspace.members.list(context.orgId),
  ])
  if (teamsResult.error) throw new Error(teamsResult.error.message)

  const directoryList: DirectoryMember[] = (membersResult.data?.data ?? []).map(
    (member) => ({
      userId: member.user_id,
      name:
        [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.email ||
        member.user_id,
      email: member.email,
      avatar: member.avatar,
    })
  )
  const directory = new Map<string, DirectoryMember>(
    directoryList.map((member) => [member.userId, member])
  )
  const teams: TeamRow[] = teamsResult.data.data.map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    color: team.color,
    members: (team.members ?? []).map((member) => ({
      ...(directory.get(member.userId) ?? {
        userId: member.userId,
        name: member.userId,
        email: null,
        avatar: null,
      }),
      role: member.role,
    })),
    isDefault: team.isDefault,
    autoAssign: team.autoAssign,
    status: team.status,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }))
  return (
    <TeamSplit
      teams={teams}
      directory={directoryList}
      selectedId={selectedTeamId}
    />
  )
}
