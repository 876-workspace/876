import { notFound } from 'next/navigation'

import { UserDetailCard } from '../../_components/user-detail'
import { listTeamData } from '../../_lib/team-members'

type Props = {
  params: Promise<{ orgSlug: string; memberId: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { orgSlug, memberId } = await params
  const data = await listTeamData(orgSlug)
  const row = data?.rows.find((member) => member.id === memberId)

  return { title: `${row?.name ?? 'User'} — Settings` }
}

export default async function MemberPage({ params, searchParams }: Props) {
  const [{ orgSlug, memberId }, query] = await Promise.all([
    params,
    searchParams,
  ])
  const data = await listTeamData(orgSlug)
  const row = data?.rows.find((member) => member.id === memberId)
  if (!row || !data) notFound()

  const status =
    query.status === 'active' || query.status === 'inactive'
      ? query.status
      : null
  const closeHref = status
    ? `/${orgSlug}/settings/users?status=${status}`
    : `/${orgSlug}/settings/users`

  return (
    <UserDetailCard
      row={row}
      roles={data.roles}
      orgSlug={orgSlug}
      closeHref={closeHref}
    />
  )
}
