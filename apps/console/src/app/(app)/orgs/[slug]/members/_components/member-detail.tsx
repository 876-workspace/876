'use client'

import { useState } from 'react'
import type { AdminOrgMember, AdminUser } from '@876/platform/compat'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { formatDate } from '@/lib/format'
import {
  initialsOf,
  memberDisplayName,
  memberStatusBadgeClass,
  roleBadgeClass,
} from './member-format'
import { MemberOverview } from './member-overview'

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'apps', label: 'Apps' },
  { value: 'activity', label: 'Activity' },
] as const

type TabValue = (typeof DETAIL_TABS)[number]['value']

type Props = {
  member: AdminOrgMember
  user?: AdminUser | null
  /** Streamed assigned apps for this member. */
  apps?: React.ReactNode
  /** Lifecycle timeline for this member. */
  activity?: React.ReactNode
  /** Today at UTC midnight, in Unix seconds. */
  now: number
  onClose: () => void
  /** Entry/exit animation classes, owned by the split view. */
  className?: string
}

function RolePill({ role }: { role: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        roleBadgeClass(role)
      )}
    >
      {role}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        memberStatusBadgeClass(status)
      )}
    >
      {status}
    </span>
  )
}

export function MemberDetail({
  member,
  user,
  apps,
  activity,
  now: _now,
  onClose,
  className,
}: Props) {
  const [tab, setTab] = useState<TabValue>('overview')
  const name = memberDisplayName(member)

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start gap-3 border-b px-6 py-4">
        <Avatar className="size-10 shrink-0 rounded-md after:rounded-md">
          {member.avatar && (
            <AvatarImage
              src={member.avatar}
              alt=""
              className="rounded-md object-cover"
            />
          )}
          <AvatarFallback className="rounded-md text-xs font-semibold">
            {initialsOf(member)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {name}
            </h2>
            <RolePill role={member.role} />
            <StatusPill status={member.status} />
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[0.8125rem]">
            {`${member.email ?? 'No email'} · Joined ${formatDate(member.created_at)}`}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close member details"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Member details"
        className="border-876-surface-border shrink-0 border-b px-6 pt-4 pb-3"
      >
        <div className="bg-muted inline-flex w-fit items-center rounded-lg p-[3px]">
          {DETAIL_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={cn(
                'rounded-md px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors',
                tab === entry.value
                  ? 'text-foreground bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={tab}
        role="tabpanel"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 p-6 motion-safe:duration-200 motion-safe:ease-out"
      >
        {tab === 'overview' && <MemberOverview member={member} user={user} />}
        {tab === 'apps' && apps}
        {tab === 'activity' && activity}
      </div>

      <p className="text-muted-foreground/70 border-876-surface-border shrink-0 truncate border-t px-6 py-3 font-mono text-[0.6875rem]">
        {member.id}
      </p>
    </section>
  )
}
