'use client'

import { useRouter } from 'next/navigation'
import { AppAccessPanel } from '@876/access-ui/app-access-panel'
import type { AccessAppEntry } from '@876/access-ui/types'

import { appMemberships } from '@/lib/client/app-memberships'

export function MemberAccessPanel({
  entries,
  membershipId,
  readOnly,
}: {
  entries: AccessAppEntry[]
  membershipId: string
  readOnly: boolean
}) {
  const router = useRouter()
  return (
    <AppAccessPanel
      entries={entries}
      readOnly={readOnly}
      onRoleChange={async (entry, roleId) => {
        const result = entry.assignmentId
          ? await appMemberships.update(entry.assignmentId, {
              app_role_id: roleId,
            })
          : await appMemberships.create({
              membership_id: membershipId,
              app_id: entry.appId,
              app_role_id: roleId,
            })
        if (result.error) return result.error.message
        router.refresh()
        return null
      }}
      onOverrideChange={async (entry, next) => {
        if (!entry.assignmentId)
          return 'Assign a role before changing permissions.'
        const result = await appMemberships.update(entry.assignmentId, {
          permission_grants: next.grants,
          permission_denies: next.denies,
        })
        if (result.error) return result.error.message
        router.refresh()
        return null
      }}
    />
  )
}
