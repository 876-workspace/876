import Image from 'next/image'
import type { AdminAppAssignment } from '@876/admin'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { AppWindow } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import { cn } from '@876/core/utils'
import { appColor } from '@/lib/app-color'
import { formatDate, statusBadgeClass } from '@/lib/format'

type Props = {
  assignments: AdminAppAssignment[]
}

function AppRowItem({ assignment }: { assignment: AdminAppAssignment }) {
  const name =
    assignment.app_name ||
    assignment.app_slug ||
    assignment.app_id ||
    'Unknown app'

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white',
            appColor(assignment.app_slug || assignment.app_id)
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-medium">{name}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {`Assigned ${formatDate(assignment.created_at)}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
            statusBadgeClass(assignment.status)
          )}
        >
          {assignment.status}
        </span>
      </div>
    </li>
  )
}

export function MemberApps({ assignments }: Props) {
  if (assignments.length === 0) {
    return (
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AppWindow aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No assigned apps</EmptyTitle>
          <EmptyDescription>
            App access grants for this member will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="divide-876-surface-border divide-y">
      {assignments.map((assignment) => (
        <AppRowItem key={assignment.id} assignment={assignment} />
      ))}
    </ul>
  )
}

export function MemberAppsFallback() {
  return (
    <div className="space-y-3 py-1" aria-label="Loading assigned apps">
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="h-10 w-3/5" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  )
}
