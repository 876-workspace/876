'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
} from '@876/ui/detail-card'
import type { RoleView } from '@/types/role'

export function RoleCardFrame({
  role,
  children,
}: {
  role: RoleView
  children: ReactNode
}) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const closeHref = query
    ? `/settings/users/roles?${query}`
    : '/settings/users/roles'

  return (
    <DetailCard aria-label={`Role details: ${role.displayName}`}>
      <DetailCardHeader
        title={role.displayName}
        subtitle={role.name}
        meta={
          <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
            {role.isSystem ? 'System' : 'Custom'}
          </Badge>
        }
        closeHref={closeHref}
        closeLabel="Close role details"
      />
      <DetailCardBody>{children}</DetailCardBody>
      <DetailCardIdBar>{role.name}</DetailCardIdBar>
    </DetailCard>
  )
}
