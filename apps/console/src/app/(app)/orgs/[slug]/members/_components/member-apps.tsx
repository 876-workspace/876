'use client'

import { useRouter } from 'next/navigation'
import { AppAccessPanel } from '@876/access-ui/app-access-panel'
import type { AccessAppEntry } from '@876/access-ui/types'
import { Skeleton } from '@876/ui/skeleton'

import { appMemberships } from '@/lib/client/app-memberships'

/**
 * Console's adapter over the shared app-access panel.
 *
 * The panel is presentation only, so the operator authority stays here: every
 * callback goes through Console's own route handler, which checks
 * `console:organizations` and audits before touching the operator client.
 */
export function MemberApps({
  organizationId,
  membershipId,
  entries,
}: {
  organizationId: string
  membershipId: string
  entries: AccessAppEntry[]
}) {
  const router = useRouter()

  return (
    <AppAccessPanel
      entries={entries}
      onRoleChange={async (entry, roleId) => {
        const result = entry.assignmentId
          ? await appMemberships.update(organizationId, entry.assignmentId, {
              appRoleId: roleId,
            })
          : await appMemberships.create(organizationId, {
              membershipId,
              appId: entry.appId,
              appRoleId: roleId,
            })
        if (result.error) return result.error.message
        router.refresh()
        return null
      }}
      onOverrideChange={async (entry, next) => {
        if (!entry.assignmentId)
          return 'Assign a role before changing permissions.'

        const result = await appMemberships.update(
          organizationId,
          entry.assignmentId,
          { permissionGrants: next.grants, permissionDenies: next.denies }
        )
        if (result.error) return result.error.message
        router.refresh()
        return null
      }}
    />
  )
}

export function MemberAppsFallback() {
  return (
    <div className="space-y-3 py-1" aria-label="Loading app access">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
