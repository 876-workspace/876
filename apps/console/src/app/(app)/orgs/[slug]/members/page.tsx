import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminMembership, AdminUser } from '@876/admin'

import { $876 } from '@/lib/876'
import { resolveOrg } from '../_data'
import { MembersTable } from './members-table'
import { InviteMemberDialog } from './invite-member-dialog'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Members' }
  return { title: `${org.name ?? org.slug} • Members - Organizations` }
}

export default async function OrganizationMembersPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const membershipsResult = await $876.orgs.listMemberships(org.id, {
    limit: 50,
  })
  const memberships: AdminMembership[] = membershipsResult.data?.data ?? []

  // Fetch user details for each member in parallel.
  const userResults = await Promise.all(
    memberships.map((m) => $876.users.retrieve(m.user_id))
  )
  const usersById: Record<string, AdminUser> = {}
  for (const r of userResults) {
    if (r.data) usersById[r.data.id] = r.data
  }

  const invitesResult = await $876.orgs.listInvites(org.id)
  const invites = invitesResult.data?.data ?? []

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
        </div>
        <InviteMemberDialog orgId={org.id} />
      </div>

      <MembersTable
        memberships={memberships}
        usersById={usersById}
        invites={invites}
      />
    </div>
  )
}
