import { Suspense } from 'react'
import { Badge } from '@876/ui/badge'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { $876 } from '@/lib/876'
import { SESSIONS_SKELETON_COLUMNS } from './_components/sessions-skeleton-columns'

export const metadata = { title: 'Sessions' }

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
]

type Props = {
  searchParams: Promise<{ status?: string; after?: string; before?: string }>
}

export default async function SessionsPage({ searchParams }: Props) {
  const params = await searchParams
  const status = STATUS_OPTIONS.some((item) => item.value === params.status)
    ? params.status!
    : 'all'
  return (
    <Page>
      <ResourceToolbar
        title="Sessions"
        titleFilter={
          <StatusFilterHeading
            label="Sessions"
            value={status}
            options={STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={<DataTableSkeleton columns={SESSIONS_SKELETON_COLUMNS} />}
      >
        <SessionsTable params={params} status={status} />
      </Suspense>
    </Page>
  )
}

async function SessionsTable({
  params,
  status,
}: {
  params: Awaited<Props['searchParams']>
  status: string
}) {
  const result = await $876.sessions.list({
    limit: 25,
    startingAfter: params.after,
    endingBefore: params.before,
    active:
      status === 'active'
        ? true
        : status === 'revoked' || status === 'expired'
          ? false
          : undefined,
  })
  if (result.error) throw new Error(result.error.message)
  const now = Math.floor(Date.now() / 1000)
  const rows =
    status === 'revoked'
      ? result.data.data.filter((row) => row.revoked_at)
      : status === 'expired'
        ? result.data.data.filter(
            (row) => !row.revoked_at && row.expires_at <= now
          )
        : result.data.data
  return (
    <div className="876-card">
      <Table>
        <TableHeader>
          <TableRow>
            {SESSIONS_SKELETON_COLUMNS.map((column) => (
              <TableHead key={column.label}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.user_id}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {row.device_id ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {[row.ip_city, row.ip_country_code]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.ip_address ?? '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.revoked_at || row.expires_at <= now
                      ? 'secondary'
                      : 'default'
                  }
                >
                  {row.revoked_at
                    ? 'Revoked'
                    : row.expires_at <= now
                      ? 'Expired'
                      : 'Active'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {new Date(row.created_at * 1000).toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {row.last_seen_at
                  ? new Date(row.last_seen_at * 1000).toLocaleString()
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
