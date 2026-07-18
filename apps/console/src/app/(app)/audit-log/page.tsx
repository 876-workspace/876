import Link from 'next/link'

import { Activity } from '@876/ui/icons'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Input } from '@876/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { CursorPagination } from '@/components/cursor-pagination'
import { ResourceToolbar } from '@/components/resource-toolbar'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { $876 } from '@/lib/876'
import { formatDateTime } from '@/lib/format'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Audit Log' }

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    app_name?: string
    event?: string
    user_id?: string
    path?: string
  }>
}

const APP_LABELS: Record<string, string> = {
  '876-consumer': '876',
  '876-enterprise': 'Enterprise',
  console: 'Console',
  '876-couriers': 'Couriers',
}

export default async function AuditLogPage({ searchParams }: Props) {
  const params = await searchParams
  const filters = cleanFilters(params)
  const { data } = await $876.auditEvents.list({
    limit: 50,
    starting_after: params.after,
    ending_before: params.before,
    ...filters,
  })

  const events = data?.data ?? []
  const hasMore = data?.has_more ?? false
  const isFiltered = Object.values(filters).some(Boolean)

  return (
    <Page>
      <TrackMCEventOnMount
        event={AnalyticsEvent.AuditLogViewed}
        properties={{ filter_applied: isFiltered }}
      />
      <ResourceToolbar title="Audit Log" refresh />

      <form className="mb-4 grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto_auto]">
        <Input
          name="q"
          placeholder="Search events, paths, users, request IDs"
          defaultValue={filters.q ?? ''}
        />
        <Input
          name="app_name"
          placeholder="App"
          defaultValue={filters.app_name ?? ''}
        />
        <Input
          name="event"
          placeholder="Event"
          defaultValue={filters.event ?? ''}
        />
        <Input
          name="path"
          placeholder="Path"
          defaultValue={filters.path ?? ''}
        />
        <button className={buttonVariants({ variant: 'brand' })} type="submit">
          Query
        </button>
        <Link
          href="/audit-log"
          className={buttonVariants({ variant: 'outline' })}
        >
          Clear
        </Link>
      </form>

      {events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Activity />
            </EmptyMedia>
            <EmptyTitle>No audit events</EmptyTitle>
            <EmptyDescription>
              {isFiltered
                ? 'No events matched the current query.'
                : 'No analytics events have been recorded yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="876-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[11rem]">Time</TableHead>
                <TableHead className="w-[11rem]">App</TableHead>
                <TableHead className="w-[14rem]">Event</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="w-[12rem]">User</TableHead>
                <TableHead className="w-[12rem]">Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(event.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {APP_LABELS[event.app_name] ?? event.app_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{event.event}</TableCell>
                  <TableCell className="max-w-[28rem] whitespace-normal">
                    <div className="font-mono text-xs break-all">
                      {event.path ?? '-'}
                      {event.search ?? ''}
                    </div>
                    {event.title && (
                      <div className="text-muted-foreground mt-1 truncate text-xs">
                        {event.title}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.user_id ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.request_id ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CursorPagination
            firstId={events[0]?.id ?? null}
            lastId={events[events.length - 1]?.id ?? null}
            hasMore={hasMore}
            count={events.length}
          />
        </div>
      )}
    </Page>
  )
}

function cleanFilters(params: Awaited<Props['searchParams']>) {
  return {
    q: clean(params.q),
    app_name: clean(params.app_name),
    event: clean(params.event),
    user_id: clean(params.user_id),
    path: clean(params.path),
  }
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}
