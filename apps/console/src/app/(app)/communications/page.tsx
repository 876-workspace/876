import type {
  AdminCommunicationCall,
  AdminCommunicationMessage,
} from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Page } from '@876/ui/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { maskPhoneNumber } from '@876/core/phone'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { formatDateTime } from '@/lib/format'
import { $876 } from '@/lib/876'

export const metadata = { title: 'Communications' }

const STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Communications' },
  ...[
    'queued',
    'accepted',
    'initiated',
    'ringing',
    'in-progress',
    'completed',
    'sent',
    'delivered',
    'read',
    'busy',
    'no-answer',
    'canceled',
    'failed',
    'undelivered',
  ].map((status) => ({
    value: status,
    label: status,
    headingLabel: `${status} Communications`,
  })),
]

type CommunicationRow = {
  id: string
  recipient: string
  channel: 'sms' | 'whatsapp' | 'voice'
  status: string
  templateKey: string | null
  appOrOrganization: string | null
  createdAt: number
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function CommunicationsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = STATUS_OPTIONS.some(
    (option) => option.value === status
  )
    ? status!
    : 'all'
  const statusFilter = selectedStatus === 'all' ? undefined : selectedStatus
  const [messagesResult, callsResult] = await Promise.all([
    $876.messages.list({ limit: 50, status: statusFilter }),
    $876.calls.list({ limit: 50, status: statusFilter }),
  ])
  if (messagesResult.error) throw new Error(messagesResult.error.message)
  if (callsResult.error) throw new Error(callsResult.error.message)

  const rows = [
    ...messagesResult.data.data.map(messageRow),
    ...callsResult.data.data.map(callRow),
  ].sort((left, right) => right.createdAt - left.createdAt)

  return (
    <Page>
      <ResourceToolbar
        title="Communications"
        titleFilter={
          <StatusFilterHeading
            label="Communications"
            value={selectedStatus}
            options={STATUS_OPTIONS}
          />
        }
        refresh
      />

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No communications</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="876-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Template key</TableHead>
                <TableHead>App / org</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.channel}-${row.id}`}>
                  <TableCell className="font-medium tabular-nums">
                    {maskPhoneNumber(row.recipient)}
                  </TableCell>
                  <TableCell className="capitalize">{row.channel}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.templateKey ?? '—'}</TableCell>
                  <TableCell>{row.appOrOrganization ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}

function messageRow(message: AdminCommunicationMessage): CommunicationRow {
  return {
    id: message.id,
    recipient: message.to_number,
    channel: message.channel,
    status: message.status,
    templateKey: message.template_key,
    appOrOrganization: message.app_id ?? message.organization_id,
    createdAt: message.created_at,
  }
}

function callRow(call: AdminCommunicationCall): CommunicationRow {
  return {
    id: call.id,
    recipient: call.to_number,
    channel: 'voice',
    status: call.status,
    templateKey: call.template_key,
    appOrOrganization: call.app_id ?? call.organization_id,
    createdAt: call.created_at,
  }
}
