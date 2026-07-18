import { Settings } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@876/ui/empty'

import { service } from '@/lib/service'
import { $876 } from '@/lib/876'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { TeamTableRow } from './member-row'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Team - Settings' }

type TeamMember = {
  id: string
  first_name: string
  last_name: string
  email: string
  username: string | null
  avatar: string | null
  role: string
}

/**
 * The Console team is the set of access grants in MC's OWN database —
 * the identity API has no concept of "MC team". Each grant's display fields
 * (name, email, avatar) are hydrated from `$876` by opaque user ID; a failed
 * identity lookup degrades to placeholders rather than dropping the member.
 */
export default async function TeamSettingsPage() {
  const grants = await service.team.list()

  const teamMembers: TeamMember[] = await Promise.all(
    grants.map(async (grant) => {
      const identity = await $876.users
        .retrieve(grant.userId)
        .then((res) => res.data)
        .catch(() => null)
      return {
        id: grant.userId,
        first_name: identity?.first_name ?? '',
        last_name: identity?.last_name ?? '',
        email: identity?.email ?? '',
        username: identity?.username ?? null,
        avatar: identity?.avatar ?? null,
        role: grant.roleName,
      }
    })
  )

  return (
    <Page>
      <TrackMCEventOnMount event={AnalyticsEvent.TeamListViewed} />

      {teamMembers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings />
            </EmptyMedia>
            <EmptyTitle>No team members</EmptyTitle>
            <EmptyDescription>
              No users have Console access yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="876-card overflow-hidden">
          <Table>
            <TableHeader className="876-header-row">
              <TableRow>
                <TableHead className="w-12 px-5 py-3.5">
                  <span className="sr-only">Avatar</span>
                </TableHead>
                <TableHead className="px-5 py-3.5">Name</TableHead>
                <TableHead className="px-5 py-3.5">Email</TableHead>
                <TableHead className="px-5 py-3.5">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((user) => (
                <TeamTableRow key={user.id} user={user} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}
