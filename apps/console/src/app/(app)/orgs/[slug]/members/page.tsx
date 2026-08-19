import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { $876 } from '@/lib/876'
import { resolveOrg, resolveOrgMembers } from '../_data'
import { MembersTable, PendingInvitesTable } from './_components/members-table'
import { InviteMemberDialog } from './_components/invite-member-dialog'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'
import { MembersHeading } from './_components/members-heading'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Members' }
  return { title: `${org.name ?? org.slug} • Members - Organizations` }
}

/**
 * Keep the Members chrome synchronous, matching the fast /users and /orgs
 * list-page streaming shape. Route data resolves only inside the Suspense
 * children below.
 */
export default function OrganizationMembersPage({ params }: Props) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Suspense fallback={<h2 className="876-page-title">Members</h2>}>
          <MembersHeading />
        </Suspense>
        <Suspense fallback={<InviteMemberButton />}>
          <InviteMemberData params={params} />
        </Suspense>
      </div>

      <Suspense
        fallback={<DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />}
      >
        <MembersTableData params={params} />
      </Suspense>

      <Suspense fallback={null}>
        <PendingInvitesData params={params} />
      </Suspense>
    </div>
  )
}

async function InviteMemberData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <InviteMemberDialog orgId={org.id} />
}

async function MembersTableData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const membersResult = await resolveOrgMembers(org.id)
  const members = membersResult?.data ?? []

  return <MembersTable members={members} />
}

/**
 * Invites are independent of the member roster and must never extend the
 * member table's critical path. A slow invite lookup simply streams this
 * optional section later.
 */
async function PendingInvitesData({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return null

  const invitesResult = await $876.invites.admin.list(org.id)
  const invites = invitesResult.data?.data ?? []

  return <PendingInvitesTable invites={invites} />
}

function InviteMemberButton() {
  return (
    <Button variant="info" size="sm" disabled>
      Invite member
    </Button>
  )
}
