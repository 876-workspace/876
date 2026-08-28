import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { $876 } from '@/lib/876'
import { resolveUser } from '@/app/(app)/users/[username]/_data'
import {
  resolveOrg,
  resolveOrgMembers,
  resolveOrgResult,
  resolveOrgRoles,
} from '../_data'
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

  const orgResult = await resolveOrgResult(slug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const rolesResult = await resolveOrgRoles(orgResult.data.id)

  return (
    <div className="mb-5 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Suspense fallback={<h2 className="876-page-title">Members</h2>}>
          <MembersHeading />
        </Suspense>
        {rolesResult.error ? (
          <AddMemberButton />
        ) : (
          <Suspense fallback={<AddMemberButton />}>
            <AddMemberDialog
              orgId={orgResult.data.id}
              orgName={orgResult.data.name ?? orgResult.data.slug}
              roles={rolesResult.data}
            />
          </Suspense>
        )}
      </div>
      {rolesResult.error ? (
        <AppError
          title="Role options are temporarily unavailable"
          error={rolesResult.error}
          variant="inline"
          showCode
        />
      ) : null}
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
  if (result.error)
    return (
      <AppError
        title="App assignments are temporarily unavailable"
        error={result.error}
        variant="inline"
        showCode
      />
    )

  return <MemberApps assignments={result.data?.data ?? []} />
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
  const orgResult = await resolveOrgResult(slug)
  if (orgResult.error?.code === 'organization/not-found') notFound()
  if (orgResult.error)
    return (
      <AppError
        title="Organization details are temporarily unavailable"
        error={orgResult.error}
        variant="banner"
        showCode
      />
    )
  if (!orgResult.data) notFound()

  const membersResult = await resolveOrgMembers(orgResult.data.id)
  if (membersResult.error)
    return (
      <AppError
        title="Members are temporarily unavailable"
        error={membersResult.error}
        variant="banner"
        showCode
      />
    )

  const members = membersResult.data
  const selectedId = query?.member
  const selected = members.find(
    (item) => item.id === selectedId || item.user_id === selectedId
  )

  const user = selected ? await resolveUser(selected.user_id) : null
  const apps = selected ? (
    <Suspense fallback={<MemberAppsFallback />}>
      <MemberAppsData
        organizationId={orgResult.data.id}
        userId={selected.user_id}
      />
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

  const orgResult = await resolveOrgResult(slug)
  if (!orgResult.data) return null

  const invitesResult = await $876.invites.admin.list(orgResult.data.id)
  if (invitesResult.error)
    return (
      <AppError
        title="Pending invitations are temporarily unavailable"
        error={invitesResult.error}
        variant="inline"
        showCode
      />
    )

  return <PendingInvitesTable invites={invitesResult.data?.data ?? []} />
}

function AddMemberButton() {
  return (
    <Button variant="info" size="sm" disabled>
      Add member
    </Button>
  )
}
