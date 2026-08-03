import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminMembership, AdminOrganization, AdminUser } from '@876/admin'

import { $876 } from '@/lib/876'
import { resolveOrg } from '../_data'
import { MembersTable } from './_components/members-table'
import { InviteMemberDialog } from './_components/invite-member-dialog'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Skeleton } from '@876/ui/skeleton'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Members' }
  return { title: `${org.name ?? org.slug} • Members - Organizations` }
}

export default function OrganizationMembersPage({ params }: Props) {
  return (
    <Suspense fallback={<MembersChromeSkeleton />}>
      <MembersShell params={params} />
    </Suspense>
  )
}

async function MembersShell({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
        </div>
        <InviteMemberDialog orgId={org.id} />
      </div>

      <Suspense
        fallback={<DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />}
      >
        <MembersTableData org={org} />
      </Suspense>
    </div>
  )
}

async function MembersTableData({ org }: { org: AdminOrganization }) {
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

function MembersChromeSkeleton() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Members</h2>
        <Skeleton className="h-9 w-28" />
      </div>
      <DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />
    </div>
  )
}
