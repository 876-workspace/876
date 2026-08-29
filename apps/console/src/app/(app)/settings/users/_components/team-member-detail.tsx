'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  Shield,
  User,
  XIcon,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { formatDateTime } from '@/lib/format'
import { client } from '@/lib/client'
import { AccessPanel } from './access-panel'
import type { TeamRow } from './member-row'

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  owner: 'Owner',
  super_admin: 'Super Admin',
}

const AFFILIATION_LABELS: Record<string, string> = {
  staff: 'Staff',
  contractor: 'Contractor',
  external: 'External',
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  super_admin:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  owner:
    'border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-400',
  admin: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  staff:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  active:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
  suspended:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  expired: 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400',
}

const DETAIL_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'access', label: 'App Access' },
  { value: 'activity', label: 'Activity' },
] as const

type TabValue = (typeof DETAIL_TABS)[number]['value']

type Props = {
  member: TeamRow
  onClose: () => void
  className?: string
}

function initialsOf(user: TeamRow): string {
  return (
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    '?'
  )
}

function formatExpiry(value: number | null, affiliation: string): string {
  if (affiliation === 'staff' || value === null) return 'No expiration'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value * 1000))
}

type ActivityEvent = {
  at: number
  label: string
  detail?: string
  tone: 'neutral' | 'info' | 'warn' | 'danger'
}

const toneDotClass: Record<ActivityEvent['tone'], string> = {
  neutral: 'bg-muted-foreground/40',
  info: 'bg-emerald-500',
  warn: 'bg-amber-500',
  danger: 'bg-red-500',
}

function memberActivityEvents(member: TeamRow): ActivityEvent[] {
  const events: ActivityEvent[] = []

  if (member.createdAt) {
    events.push({
      at: member.createdAt,
      label: 'Console access granted',
      detail: `Role assigned: ${ROLE_LABELS[member.role] ?? member.role} (${AFFILIATION_LABELS[member.affiliation] ?? member.affiliation})`,
      tone: 'info',
    })
  }

  if (member.expiresAt && member.affiliation !== 'staff') {
    events.push({
      at: member.expiresAt,
      label: 'Access grant expiration',
      detail: `Expires on ${formatExpiry(member.expiresAt, member.affiliation)}`,
      tone: 'warn',
    })
  }

  return events.sort((a, b) => b.at - a.at)
}

export function TeamMemberDetail({ member, onClose, className }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('profile')
  const [revoking, setRevoking] = useState(false)

  const displayName = member.resolved
    ? [member.firstName, member.lastName].filter(Boolean).join(' ') ||
      member.email
    : 'Unresolved account'

  async function handleRevoke() {
    setRevoking(true)
    const result = await client.team.revoke(member.id)
    setRevoking(false)
    if (!result.error) {
      onClose()
      router.refresh()
    }
  }

  const events = memberActivityEvents(member)

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-start gap-3.5 border-b px-6 py-5">
        <Avatar className="size-12 shrink-0 rounded-xl after:rounded-xl">
          {member.avatar && (
            <AvatarImage
              src={member.avatar}
              alt=""
              className="rounded-xl object-cover"
            />
          )}
          <AvatarFallback className="rounded-xl text-sm font-semibold">
            {initialsOf(member)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
              {displayName}
            </h2>
            <Badge
              variant="outline"
              className={ROLE_BADGE_CLASS[member.role] ?? ''}
            >
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
            {member.affiliation === 'external' ? (
              <Badge
                variant="outline"
                className="border-indigo-400/40 bg-indigo-400/10 text-indigo-700 dark:text-indigo-400"
              >
                External
              </Badge>
            ) : null}
            {member.status && member.status !== 'active' ? (
              <Badge
                variant="outline"
                className={STATUS_BADGE_CLASS[member.status] ?? ''}
              >
                {member.status}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {member.email || 'No email'}
            {member.position ? ` · ${member.position}` : ''}
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

      {/* Tabs Bar */}
      <div
        role="tablist"
        aria-label="Team member details"
        className="border-876-surface-border shrink-0 border-b px-6 pt-3.5 pb-3"
      >
        <div className="bg-muted/60 inline-flex w-fit items-center gap-1 rounded-lg p-1">
          {DETAIL_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                tab === entry.value
                  ? 'text-foreground bg-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div
        key={tab}
        role="tabpanel"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 p-6 motion-safe:duration-150 motion-safe:ease-out"
      >
        {tab === 'profile' && (
          <div className="space-y-5">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="border-876-surface-border bg-muted/20 flex items-center justify-between gap-3.5 rounded-xl border p-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Shield className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-xs font-medium">
                      Console Role
                    </span>
                    <p className="text-foreground mt-0.5 text-sm font-semibold capitalize">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={ROLE_BADGE_CLASS[member.role] ?? ''}
                >
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>
              </div>

              <div className="border-876-surface-border bg-muted/20 flex items-center justify-between gap-3.5 rounded-xl border p-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-muted-foreground block text-xs font-medium">
                      Access Status
                    </span>
                    <p className="text-foreground mt-0.5 text-sm font-semibold capitalize">
                      {member.status ?? 'active'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    STATUS_BADGE_CLASS[member.status ?? 'active'] ?? ''
                  }
                >
                  {member.status ?? 'active'}
                </Badge>
              </div>
            </div>

            {/* Platform Identity Card */}
            <div className="border-876-surface-border bg-muted/20 space-y-4 rounded-xl border p-5">
              <div className="border-876-surface-border flex items-center justify-between border-b pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <User className="size-4" />
                  </span>
                  <h3 className="text-foreground text-xs font-semibold">
                    Platform Identity
                  </h3>
                </div>
                {member.resolved && (
                  <Link
                    href={`/users/${member.id}`}
                    className="border-876-surface-border bg-background hover:bg-muted/50 text-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                  >
                    <span>View profile</span>
                    <ExternalLink className="text-muted-foreground size-3" />
                  </Link>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Full Name</dt>
                  <dd className="text-foreground mt-0.5 text-sm font-medium">
                    {displayName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="text-foreground mt-0.5 font-mono text-sm font-medium">
                    {member.username ? `@${member.username}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Primary Email</dt>
                  <dd className="text-foreground mt-0.5 text-sm font-medium">
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="hover:underline"
                      >
                        {member.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Position</dt>
                  <dd className="text-foreground mt-0.5 text-sm font-medium">
                    {member.position || '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Grant Lifecycle Card */}
            <div className="border-876-surface-border bg-muted/20 space-y-3.5 rounded-xl border p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Fingerprint className="size-4" />
                </span>
                <h3 className="text-foreground text-xs font-semibold">
                  Access Details
                </h3>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Affiliation Type</dt>
                  <dd className="text-foreground mt-0.5 font-medium">
                    {AFFILIATION_LABELS[member.affiliation] ??
                      member.affiliation}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Grant Expiration</dt>
                  <dd className="text-foreground mt-0.5 font-medium">
                    {formatExpiry(member.expiresAt, member.affiliation)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <AccessPanel
            role={member.role}
            roleLabel={ROLE_LABELS[member.role] ?? member.role}
            permissions={member.permissions ?? []}
            revoking={revoking}
            onRevoke={handleRevoke}
            roleBadgeClass={ROLE_BADGE_CLASS[member.role] ?? ''}
          />
        )}

        {tab === 'activity' && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No recent activity.
              </p>
            ) : (
              <ol className="relative space-y-5 ps-1">
                {events.map((event, index) => (
                  <li
                    key={`${event.label}-${event.at}`}
                    className="flex gap-3.5"
                  >
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          toneDotClass[event.tone]
                        )}
                      />
                      {index < events.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="bg-876-surface-border w-px grow"
                        />
                      )}
                    </div>
                    <div className="-mt-0.5 min-w-0 pb-1">
                      <p className="text-foreground text-sm leading-5 font-medium">
                        {event.label}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {`${formatDateTime(event.at)}${event.detail ? ` · ${event.detail}` : ''}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/70 border-876-surface-border shrink-0 truncate border-t px-6 py-3 font-mono text-[0.6875rem]">
        {member.id}
      </p>
    </section>
  )
}
