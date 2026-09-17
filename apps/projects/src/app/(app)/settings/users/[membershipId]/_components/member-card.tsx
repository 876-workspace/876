import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'

import { memberInitials, memberName } from '../../_lib/member-utils'
import type { OrgMember } from '@/types/users'

export function MemberCard({
  membershipId,
  header,
  children,
}: {
  membershipId: string
  header: ReactNode
  children: ReactNode
}) {
  const base = `/settings/users/${encodeURIComponent(membershipId)}`
  const tabs = [
    { label: 'Overview', href: base },
    { label: 'App access', href: `${base}/access` },
    { label: 'Permissions', href: `${base}/permissions` },
  ]
  return (
    <DetailCard aria-label="User details">
      {header}
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

export function MemberCardHeader({ member }: { member: OrgMember }) {
  return (
    <DetailCardHeader
      closeHref="/settings/users"
      closeLabel="Close user details"
      icon={
        <Avatar className="size-11">
          <AvatarImage src={member.avatar ?? undefined} alt="" />
          <AvatarFallback>{memberInitials(member)}</AvatarFallback>
        </Avatar>
      }
      title={memberName(member)}
      meta={
        <Badge
          variant={member.status === 'active' ? 'secondary' : 'warning'}
          className="capitalize"
        >
          {member.status}
        </Badge>
      }
      subtitle={member.email ?? `@${member.user_id}`}
    />
  )
}
