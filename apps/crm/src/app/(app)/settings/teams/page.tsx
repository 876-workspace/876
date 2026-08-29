import { Suspense } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
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
import type { TeamRow } from './_components/team-row'
import { TeamSplit } from './_components/team-split'
import { TeamSplitSkeleton } from './_components/team-split-skeleton'

export const metadata = { title: 'Teams - Settings' }

const TEAM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All teams' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
]

function isTeamStatus(value: string | undefined): value is CrmTeamStatus {
  return value === 'ACTIVE' || value === 'ARCHIVED'
}

type Props = { searchParams: Promise<{ status?: string; team?: string }> }

export default async function TeamsPage({ searchParams }: Props) {
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

const FAKE_MEMBERS: DirectoryMember[] = [
  {
    userId: 'usr_sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_marcus',
    name: 'Marcus Sterling',
    email: 'marcus.s@example.com',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_elena',
    name: 'Elena Rostova',
    email: 'elena.r@example.com',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_david',
    name: 'David Kim',
    email: 'david.kim@example.com',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_olivia',
    name: 'Olivia Taylor',
    email: 'olivia.t@example.com',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_james',
    name: 'James Wilson',
    email: 'james.w@example.com',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_priya',
    name: 'Priya Patel',
    email: 'priya.p@example.com',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  },
  {
    userId: 'usr_lucas',
    name: 'Lucas Scott',
    email: 'lucas.s@example.com',
    avatar:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  },
]

const FAKE_TEAMS: TeamRow[] = [
  {
    id: 'team_triage',
    name: 'Triage & Intake',
    slug: 'triage',
    description:
      'Initial intake, classification, and routing for incoming customer tickets',
    color: 'slate',
    members: [],
    isDefault: false,
    autoAssign: 'NONE',
    status: 'ACTIVE',
    createdAt: 1724000000,
    updatedAt: 1724100000,
  },
  {
    id: 'team_escalations',
    name: 'Executive Escalations',
    slug: 'escalations',
    description:
      'High-priority VIP account management and executive escalation handling',
    color: 'violet',
    members: [{ ...FAKE_MEMBERS[0]!, role: 'LEAD' }],
    isDefault: false,
    autoAssign: 'LEAST_BUSY',
    status: 'ACTIVE',
    createdAt: 1723500000,
    updatedAt: 1724200000,
  },
  {
    id: 'team_billing',
    name: 'Billing & Invoicing',
    slug: 'billing',
    description:
      'Resolving payment disputes, tax exemption certificates, and contract queries',
    color: 'amber',
    members: [
      { ...FAKE_MEMBERS[1]!, role: 'LEAD' },
      { ...FAKE_MEMBERS[2]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[3]!, role: 'MEMBER' },
    ],
    isDefault: false,
    autoAssign: 'ROUND_ROBIN',
    status: 'ACTIVE',
    createdAt: 1722000000,
    updatedAt: 1724300000,
  },
  {
    id: 'team_support',
    name: 'Technical Support',
    slug: 'tech-support',
    description:
      'L2 and L3 technical investigation, API debugging, and platform diagnostics',
    color: 'blue',
    members: [
      { ...FAKE_MEMBERS[0]!, role: 'LEAD' },
      { ...FAKE_MEMBERS[1]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[2]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[3]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[4]!, role: 'MEMBER' },
    ],
    isDefault: true,
    autoAssign: 'ROUND_ROBIN',
    status: 'ACTIVE',
    createdAt: 1720000000,
    updatedAt: 1724400000,
  },
  {
    id: 'team_cs',
    name: 'Customer Success',
    slug: 'customer-success',
    description:
      'Proactive client onboarding, product enablement, and health score reviews',
    color: 'emerald',
    members: [
      { ...FAKE_MEMBERS[0]!, role: 'LEAD' },
      { ...FAKE_MEMBERS[1]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[2]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[3]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[4]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[5]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[6]!, role: 'MEMBER' },
      { ...FAKE_MEMBERS[7]!, role: 'MEMBER' },
    ],
    isDefault: false,
    autoAssign: 'ROUND_ROBIN',
    status: 'ACTIVE',
    createdAt: 1718000000,
    updatedAt: 1724500000,
  },
]

async function TeamsTableData({
  status,
  selectedTeamId,
}: {
  status?: CrmTeamStatus
  selectedTeamId?: string
}) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const [teamsResult, membersResult] = await Promise.all([
    $876.teams.list(context.orgId, { status, includeMembers: true }),
    $876.organizationMembers.list(context.orgId),
  ])
  if (teamsResult.error) throw new Error(teamsResult.error.message)

  const directoryList: DirectoryMember[] = [
    ...(membersResult.data?.data ?? []).map((member) => ({
      userId: member.user_id,
      name:
        [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.email ||
        member.user_id,
      email: member.email,
      avatar: member.avatar,
    })),
    ...FAKE_MEMBERS,
  ]

  const directory = new Map<string, DirectoryMember>(
    directoryList.map((member) => [member.userId, member])
  )

  const loadedTeams: TeamRow[] = teamsResult.data.data.map((team) => ({
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

  const allTeams = [
    ...loadedTeams,
    ...FAKE_TEAMS.filter(
      (fake) => !loadedTeams.some((real) => real.id === fake.id)
    ),
  ]

  const teams = status
    ? allTeams.filter((team) => team.status === status)
    : allTeams

  return (
    <TeamSplit
      teams={teams}
      directory={directoryList}
      selectedId={selectedTeamId}
    />
  )
}
