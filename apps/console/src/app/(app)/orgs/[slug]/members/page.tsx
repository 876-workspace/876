import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { $876 } from '@/lib/876'
import { resolveUser } from '@/app/(app)/users/[username]/_data'
import { resolveOrg, resolveOrgMembers, resolveOrgRoles } from '../_data'
import { PendingInvitesTable } from './_components/members-table'
import { MembersSplit } from './_components/members-split'
import { MemberApps, MemberAppsFallback } from './_components/member-apps'
import { MemberActivity } from './_components/member-activity'
import { AddMemberDialog } from './_components/add-member-dialog'
import { MEMBERS_SKELETON_COLUMNS } from './_components/members-skeleton-columns'
import { MembersHeading } from './_components/members-heading'

type Props = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ member?: string }>
}

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
export default function OrganizationMembersPage({
  params,
  searchParams,
}: Props) {
  return (
    <div>
      <Suspense fallback={null}>
        <MembersToolbarData params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense
        fallback={<DataTableSkeleton columns={MEMBERS_SKELETON_COLUMNS} />}
      >
        <MembersTableData params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={null}>
        <PendingInvitesData params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function MembersToolbarData({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ member?: string }>
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { member?: string }),
  ])
  if (query.member) return null

  const org = await resolveOrg(slug)
  if (!org) notFound()

  const roles = await resolveOrgRoles(org.id)

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <Suspense fallback={<h2 className="876-page-title">Members</h2>}>
        <MembersHeading />
      </Suspense>
      <Suspense fallback={<AddMemberButton />}>
        <AddMemberDialog
          orgId={org.id}
          orgName={org.name ?? org.slug}
          roles={roles}
        />
      </Suspense>
    </div>
  )
}

async function MemberAppsData({
  organizationId,
  userId,
}: {
  organizationId: string
  userId: string
}) {
  const result = await $876.appAssignments.list(organizationId, { userId })
  const assignments = result.data?.data ?? []
  return <MemberApps assignments={assignments} />
}

async function MembersTableData({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ member?: string }>
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { member?: string }),
  ])
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const membersResult = await resolveOrgMembers(org.id)
  const members = membersResult?.data ?? []

  const selectedId = query?.member
  const selected = members.find(
    (item) => item.id === selectedId || item.user_id === selectedId
  )

  const user = selected ? await resolveUser(selected.user_id) : null
  const apps = selected ? (
    <Suspense fallback={<MemberAppsFallback />}>
      <MemberAppsData organizationId={org.id} userId={selected.user_id} />
    </Suspense>
  ) : null
  const activity = selected ? (
    <MemberActivity member={selected} user={user} />
  ) : null

  return (
    <MembersSplit
      members={members}
      user={user}
      apps={apps}
      activity={activity}
      selectedId={selectedId}
      basePath={`/orgs/${slug}/members`}
    />
  )
}

/**
 * Invites are independent of the member roster and must never extend the
 * member table's critical path. A slow invite lookup simply streams this
 * optional section later.
 */
async function PendingInvitesData({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ member?: string }>
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { member?: string }),
  ])
  if (query.member) return null

  const org = await resolveOrg(slug)
  if (!org) return null

  const invitesResult = await $876.invites.admin.list(org.id)
  const invites = invitesResult.data?.data ?? []

  return <PendingInvitesTable invites={invites} />
}

function AddMemberButton() {
  return (
    <Button variant="info" size="sm" disabled>
      Add member
    </Button>
  )
}
