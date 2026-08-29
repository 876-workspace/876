'use client'

import { AppWindow } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Skeleton } from '@876/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { appMemberships } from '@/lib/client/app-memberships'

export type MemberAppAccessEntry = {
  assignmentId: string
  assigned: boolean
  appId: string
  appSlug: string
  appName: string
  membershipId: string
  roleId: string | null
  roleName: string | null
  effectivePermissions: string[]
  catalog: string[]
  roles: Array<{
    id: string
    key: string
    name: string
    permissions: string[]
  }>
}

type Props = {
  organizationId: string
  entries: MemberAppAccessEntry[]
}

function AppAccessRow({
  organizationId,
  entry,
}: {
  organizationId: string
  entry: MemberAppAccessEntry
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function changeRole(appRoleId: string) {
    if (saving) return
    setSaving(true)
    const result = entry.assigned
      ? await appMemberships.update(
          organizationId,
          entry.assignmentId,
          appRoleId
        )
      : await appMemberships.create(organizationId, {
          membershipId: entry.membershipId,
          appId: entry.appId,
          appRoleId,
        })
    setSaving(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success(`${entry.appName} role updated`)
    router.refresh()
  }

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.8125rem] font-medium">{entry.appName}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {entry.assigned
              ? `${entry.effectivePermissions.length} effective permissions`
              : 'Not assigned'}
          </p>
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          Role
          <select
            aria-label={`${entry.appName} role`}
            className="border-input bg-background text-foreground h-8 rounded-md border px-2 text-xs"
            disabled={saving}
            value={entry.roleId ?? ''}
            onChange={(event) => void changeRole(event.target.value)}
          >
            <option value="" disabled>
              Select role
            </option>
            {entry.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer">
          Permission catalog ({entry.catalog.length})
        </summary>
        <p className="text-muted-foreground mt-2 font-mono leading-5 break-words">
          {entry.catalog.join(', ')}
        </p>
      </details>
    </li>
  )
}

export function MemberApps({ organizationId, entries }: Props) {
  if (entries.length === 0) {
    return (
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AppWindow aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No entitled apps</EmptyTitle>
          <EmptyDescription>
            Entitled product apps and their role catalogs will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="divide-876-surface-border divide-y">
      {entries.map((entry) => (
        <AppAccessRow
          key={entry.appId}
          organizationId={organizationId}
          entry={entry}
        />
      ))}
    </ul>
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
