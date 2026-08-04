import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminMembership, AdminUser } from '@876/admin'

import { $876 } from '@/lib/876'
import { resolveOrg } from '../_data'
import { MembersTable } from './_components/members-table'
import { InviteMemberDialog } from './_components/invite-member-dialog'
import { Suspense } from 'react'
import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Members' }
  return { title: `${org.name ?? org.slug} • Members - Organizations` }
}

export default async function OrganizationMembersPage({ params }: Props) {
  const { slug } = await params

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="876-page-title">Members</h2>
        <Suspense fallback={<InviteMemberButton />}>
          <InviteMemberData slug={slug} />
        </Suspense>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />}
      >
        <MembersTableData slug={slug} />
      </Suspense>
    </div>
  )
}

async function InviteMemberData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <InviteMemberDialog orgId={org.id} />
}

async function MembersTableData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()
  const membershipsResult = await $876.memberships.list({
    organizationId: org.id,
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

  const invitesResult = await $876.invites.list(org.id)
  const invites = invitesResult.data?.data ?? []

  return (
    <MembersTable
      memberships={memberships}
      usersById={usersById}
      invites={invites}
    />
  )
}

function InviteMemberButton() {
  return (
    <Button variant="info" size="sm" disabled>
      Invite Member
    </Button>
  )
}
