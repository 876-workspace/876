import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClockIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDay } from '../finance/format-money'
import type { WebhookDelivery } from './types'

export type WebhookDeliveryTableProps = {
  deliveries: readonly WebhookDelivery[]
}

export const WEBHOOK_DELIVERY_STATUS_LABELS: Record<
  WebhookDelivery['status'],
  string
> = {
  pending: 'Pending',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

function statusVariant(
  status: WebhookDelivery['status']
): 'success' | 'destructive' | 'secondary' {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${formatDay(timestamp)} ${hours}:${minutes} UTC`
}

export function WebhookDeliveryTable({ deliveries }: WebhookDeliveryTableProps) {
  return (
    <div className="876-card w-full overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Event type
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Response
            </TableHead>
            <TableHead className="px-5 py-3.5 text-right text-[0.8125rem] font-semibold">
              Attempt
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Next attempt
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClockIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No webhook deliveries yet</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            deliveries.map((delivery) => (
              <TableRow key={delivery.id} className="transition-colors">
                <TableCell className="px-5 py-4 font-mono text-xs">
                  {delivery.eventType}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Badge variant={statusVariant(delivery.status)}>
                    {WEBHOOK_DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-4 text-right tabular-nums">
                  {delivery.responseCode === null ? (
                    <span>—</span>
                  ) : (
                    <span>{delivery.responseCode}</span>
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-right tabular-nums">
                  {delivery.attempt}
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                  {delivery.nextAttemptAt === null ? (
                    <span>—</span>
                  ) : (
                    formatTime(delivery.nextAttemptAt)
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
