import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { Pencil } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import type { DirectoryMember } from '@/features/directory/types'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'
import { getWorkspace } from '@/lib/services/workspace'

import { TeamActions } from './_components/team-actions'
import { TeamMembers, type TeamMemberRow } from './_components/team-members'

type Props = { params: Promise<{ teamId: string }> }

export default async function TeamPage({ params }: Props) {
  const { teamId } = await params
  const context = await requireCrmContext()
  const workspace = await getWorkspace()
  const [teamResult, teamMembersResult, directoryResult] = await Promise.all([
    crm.teams.retrieve(context.orgId, teamId),
    crm.teams.members.list(context.orgId, teamId),
    workspace.members.list(context.orgId),
  ])

  if (teamResult.error?.code === 'crm/team-not-found') notFound()
  if (teamResult.error)
    return (
      <Page>
        <h1 className="876-page-title mb-4">Team</h1>
        <AppError
          title="Team details are temporarily unavailable"
          error={teamResult.error}
          variant="banner"
        />
      </Page>
    )

  const directory: DirectoryMember[] = (directoryResult.data?.data ?? []).map(
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
  const directoryById = new Map(
    directory.map((member) => [member.userId, member])
  )
  const members: TeamMemberRow[] = (teamMembersResult.data?.data ?? []).map(
    (member) => ({
      ...(directoryById.get(member.userId) ?? {
        userId: member.userId,
        name: member.userId,
        email: null,
        avatar: null,
      }),
      role: member.role,
    })
  )

  return (
    <Page>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="876-page-title truncate">{teamResult.data.name}</h1>
          <Badge
            variant={
              teamResult.data.status === 'ACTIVE' ? 'success' : 'secondary'
            }
          >
            {teamResult.data.status === 'ACTIVE' ? 'Active' : 'Archived'}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/settings/teams/${teamId}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <TeamActions teamId={teamId} status={teamResult.data.status} />
        </div>
      </header>
      <div className="space-y-3">
        {teamMembersResult.error ? (
          <AppError
            title="Team members are temporarily unavailable"
            error={teamMembersResult.error}
            variant="banner"
          />
        ) : null}
        {directoryResult.error ? (
          <AppError
            title="Member profiles are temporarily unavailable"
            error={directoryResult.error}
            variant="inline"
          />
        ) : null}
        {teamMembersResult.error ? null : (
          <TeamMembers
            teamId={teamId}
            members={members}
            directory={directory}
          />
        )}
      </div>
    </Page>
  )
}
