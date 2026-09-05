'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { cn } from '@876/core/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'

import { useTeamMemberLinks } from '../../_lib/use-team-member-links'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

const TABS = [
  { label: 'Overview', segment: null },
  { label: 'Tickets', segment: 'tickets' },
  { label: 'Permissions', segment: 'permissions' },
  { label: 'Notes', segment: 'notes' },
  { label: 'Audit', segment: 'audit' },
]

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
  const router = useRouter()
  const activeSegment = useSelectedLayoutSegment()
  const linkTo = useTeamMemberLinks()
  const initials =
    member.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (member.email?.[0] ?? '?').toUpperCase()

  return (
    <section
      aria-label={`Member details: ${member.name}`}
      className={cn(
        '876-card flex min-w-0 flex-col',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start gap-4 border-b px-6 py-5 sticky top-0 z-10 bg-[var(--876-surface)] rounded-t-[calc(var(--radius-xl)-1px)]">
        <Avatar className="size-14 shrink-0 rounded-xl after:rounded-xl sm:size-16">
          {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
          <AvatarFallback className="rounded-xl text-lg font-semibold sm:text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
              {member.name}
            </h2>
            <Badge variant="outline">
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
            {member.status !== 'active' ? (
              <Badge variant="secondary">{member.status}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {member.email ?? 'No email'}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(linkTo('/settings/users'))}
          aria-label="Close member details"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="border-876-surface-border shrink-0 border-b px-6 pt-3">
        <div className="876-scroll flex items-center gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const active = activeSegment === tab.segment
            const path = tab.segment
              ? `/settings/users/${encodeURIComponent(member.id)}/${tab.segment}`
              : `/settings/users/${encodeURIComponent(member.id)}`

            return (
              <Link
                key={tab.label}
                href={linkTo(path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border-b-2 pb-3 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1 p-6">
        {children}
      </div>

      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
        {member.id}
      </footer>
    </section>
  )
}
