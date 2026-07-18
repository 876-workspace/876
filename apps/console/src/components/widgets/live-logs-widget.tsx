'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import type { AdminAuditEvent } from '@876/admin'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { ArrowRight, SearchIcon, Terminal, XIcon } from '@876/ui/icons'

import { formatDateTime } from '@/lib/format'
import type { WidgetPanelProps } from './widgets-config'

const APP_LABELS: Record<string, string> = {
  '876-consumer': '876',
  '876-enterprise': 'Enterprise',
  console: 'Console',
  '876-couriers': 'Couriers',
  '876-billing': 'Billing',
}

function appLabel(appName: string) {
  return APP_LABELS[appName] ?? appName
}

function eventTone(eventName: string): string {
  const key = eventName.toLowerCase()
  if (key.includes('error') || key.includes('fail') || key.includes('denied'))
    return 'bg-destructive/12 text-destructive ring-destructive/20'
  if (
    key.includes('create') ||
    key.includes('success') ||
    key.includes('login')
  )
    return 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300'
  if (key.includes('delete') || key.includes('revoke') || key.includes('ban'))
    return 'bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-200'
  return 'bg-muted text-muted-foreground ring-border/60'
}

function matchesQuery(event: AdminAuditEvent, query: string) {
  if (!query) return true
  const haystack = [
    event.event,
    event.source,
    event.app_name,
    event.path,
    event.search,
    event.title,
    event.request_id,
    event.user_id,
  ]
    .filter(Boolean)
    .join('\n')
    .toLocaleLowerCase()
  return haystack.includes(query)
}

export function LiveLogsWidget({ auditEvents }: WidgetPanelProps) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase()
    return auditEvents.filter((event) => matchesQuery(event, query))
  }, [auditEvents, deferredSearch])

  return (
    <section
      aria-label="Live logs"
      className="bg-background flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden"
    >
      <header className="bg-background/95 border-border/70 dark:bg-background/90 shrink-0 space-y-2.5 border-b p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Filter live logs"
              placeholder="Filter events, paths, apps…"
              className="bg-muted/50 dark:bg-muted/30 pr-8 pl-8 shadow-none"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSearch('')}
                aria-label="Clear log filter"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
              >
                <XIcon aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <Link
            href="/audit-log"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'shrink-0 gap-1.5'
            )}
          >
            Full log
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        <div className="text-muted-foreground flex items-center justify-between gap-2 px-0.5 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-emerald-500)_22%,transparent)]"
            />
            <span className="truncate">
              {search.trim()
                ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
                : `${auditEvents.length} recent event${auditEvents.length === 1 ? '' : 's'}`}
            </span>
          </span>
          <span className="shrink-0 tabular-nums">
            {search.trim() ? 'Filtered' : 'Live snapshot'}
          </span>
        </div>
      </header>

      <div className="bg-muted/20 dark:bg-muted/10 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
        {auditEvents.length === 0 ? (
          <LiveLogsEmptyState />
        ) : filtered.length === 0 ? (
          <LiveLogsNoResults onClear={() => setSearch('')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((event) => (
              <li key={event.id}>
                <LiveLogCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function LiveLogCard({ event }: { event: AdminAuditEvent }) {
  const pathLine = [event.path, event.search].filter(Boolean).join('')

  return (
    <article
      className={cn(
        'border-border/80 bg-card/90 dark:bg-card/50 group rounded-xl border p-3 shadow-xs',
        'hover:bg-card dark:hover:bg-card/70 transition-colors hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-tight ring-1 ring-inset',
              eventTone(event.event)
            )}
          >
            {event.event}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 rounded-md px-1.5 text-[11px] font-normal"
          >
            {appLabel(event.app_name)}
          </Badge>
          {event.source ? (
            <span className="text-muted-foreground truncate text-[11px]">
              {event.source}
            </span>
          ) : null}
        </div>
        <time
          className="text-muted-foreground shrink-0 text-[11px] tabular-nums"
          dateTime={new Date(event.created_at * 1000).toISOString()}
          title={formatDateTime(event.created_at)}
        >
          {formatDateTime(event.created_at)}
        </time>
      </div>

      {event.title ? (
        <p className="text-foreground mt-2 truncate text-sm font-medium tracking-tight">
          {event.title}
        </p>
      ) : null}

      {pathLine ? (
        <p className="text-muted-foreground mt-1.5 truncate font-mono text-[11px] leading-4">
          {pathLine}
        </p>
      ) : null}

      {(event.user_id || event.request_id) && (
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums">
          {event.user_id ? (
            <span className="truncate" title={event.user_id}>
              user {event.user_id}
            </span>
          ) : null}
          {event.request_id ? (
            <span className="truncate" title={event.request_id}>
              req {event.request_id}
            </span>
          ) : null}
        </div>
      )}
    </article>
  )
}

function LiveLogsEmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="bg-muted text-muted-foreground dark:bg-muted/60 flex size-12 items-center justify-center rounded-xl">
        <Terminal aria-hidden="true" className="size-6" />
      </div>
      <h2 className="text-foreground mt-4 text-base font-medium text-balance">
        No recent activity
      </h2>
      <p className="text-muted-foreground mt-1 max-w-64 text-xs leading-5 text-pretty">
        Platform audit events will show up here as staff and apps use Console.
      </p>
      <Link
        href="/audit-log"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-4'
        )}
      >
        Open audit log
      </Link>
    </div>
  )
}

function LiveLogsNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="bg-muted text-muted-foreground dark:bg-muted/60 flex size-11 items-center justify-center rounded-xl">
        <SearchIcon aria-hidden="true" className="size-5" />
      </div>
      <h2 className="text-foreground mt-4 text-sm font-medium text-balance">
        No matching events
      </h2>
      <p className="text-muted-foreground mt-1 text-xs text-pretty">
        Try another filter or clear to see the full live snapshot.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClear}
        className="mt-4"
      >
        Clear filter
      </Button>
    </div>
  )
}
