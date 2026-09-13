'use client'

import type { ReactNode } from 'react'
import type { RouteTabItem } from '@876/ui/route-tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'

import { useTeamMemberLinks } from '../../_lib/use-team-member-links'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

type Props = {
  member: {
    id: string
    name: string
    email: string | null
    avatar: string | null
    role: string
    status: string
  }
  children: ReactNode
}

/** Persistent detail chrome for every member route. */
export function TeamMemberCardFrame({ member, children }: Props) {
  const linkTo = useTeamMemberLinks()
  const initials =
    member.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (member.email?.[0] ?? '?').toUpperCase()

  const base = `/settings/users/${encodeURIComponent(member.id)}`
  const tabs: RouteTabItem[] = [
    { label: 'Overview', href: linkTo(base), exact: true },
    { label: 'Tickets', href: linkTo(`${base}/tickets`) },
    { label: 'Permissions', href: linkTo(`${base}/permissions`) },
    { label: 'Notes', href: linkTo(`${base}/notes`) },
    { label: 'Activity', href: linkTo(`${base}/activity`) },
  ]

  return (
    <DetailCard aria-label={`Member details: ${member.name}`}>
      <DetailCardHeader
        icon={
          <Avatar className="size-14 shrink-0 rounded-xl after:rounded-xl sm:size-16">
            {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
            <AvatarFallback className="rounded-xl text-lg font-semibold sm:text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        }
        title={member.name}
        subtitle={member.email ?? 'No email'}
        meta={
          <>
            <Badge variant="outline">
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
            {member.status !== 'active' ? (
              <Badge variant="secondary">{member.status}</Badge>
            ) : null}
          </>
        }
        closeHref={linkTo('/settings/users')}
        closeLabel="Close member details"
      />
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
      <DetailCardIdBar>{member.id}</DetailCardIdBar>
    </DetailCard>
  )
}
