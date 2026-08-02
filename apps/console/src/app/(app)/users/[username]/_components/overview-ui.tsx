import type { ReactNode } from 'react'
import { cn } from '@876/core/utils'

import { KeyRound } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import { PROVIDER_ICONS } from '@876/ui/auth/provider-icons'
import type { AdminAccount } from '@876/admin'
import { statusBadgeClass } from '@/lib/format'

/**
 * Presentational primitives shared by the user overview page (server-rendered
 * shells + counts) and its lazy-loaded accordion bodies (client components that
 * fetch on open). These are pure - no hooks, no browser APIs - so both server
 * and client components can import them.
 */

/** Soft per-section icon tints - distinct colors without leaning on brand green. */
export const TONES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const
export type Tone = keyof typeof TONES

export function IconChip({
  icon: Icon,
  tone = 'blue',
  className,
}: {
  icon: IconComponent
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md',
        TONES[tone],
        className
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

/** Subtle muted count pill, rendered only when there is something to count. */
export function CountPill({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
      {count}
    </span>
  )
}

/** Responsive label-over-value grid for the detail cards. */
export function FactGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</dl>
}

export function Fact({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('mt-1 truncate text-sm', mono && 'font-mono')}>
        {value}
      </dd>
    </div>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-lg px-3 py-5 text-center text-sm">
      {children}
    </p>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
        statusBadgeClass(status)
      )}
    >
      {status}
    </span>
  )
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
  github: 'GitHub',
  gitlab: 'GitLab',
  linkedin: 'LinkedIn',
  slack: 'Slack',
}

/** A linked sign-in account, shown with its provider brand logo. */
export function ProviderRow({ account }: { account: AdminAccount }) {
  const Logo =
    PROVIDER_ICONS[account.provider_id as keyof typeof PROVIDER_ICONS]
  const label =
    PROVIDER_LABELS[account.provider_id] ??
    (account.provider_type === 'credential'
      ? 'Email & password'
      : account.provider_id)
  return (
    <li className="border-876-surface-border bg-background/60 flex items-center gap-2.5 rounded-md border px-2.5 py-2">
      <span className="border-876-surface-border bg-background flex size-7 shrink-0 items-center justify-center rounded-md border">
        {Logo ? (
          <Logo className="size-4" />
        ) : (
          <KeyRound className="text-muted-foreground size-3.5" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {label}
      </span>
    </li>
  )
}
