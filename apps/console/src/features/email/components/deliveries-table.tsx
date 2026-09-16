import type { EmailDelivery } from '@876/communications/contracts'
import { AppError } from '@876/ui/app-error'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'

import { formatDate } from '@/lib/format'

import { DeliveryStatusBadge } from './delivery-status-badge'

export type DeliveriesTableState =
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'ready'; data: EmailDelivery[] }

function recipientSummary(delivery: EmailDelivery): string {
  const primary = delivery.to[0]?.email
  if (!primary) return '—'
  const extra =
    delivery.to.length + delivery.cc.length + delivery.bcc.length - 1
  return extra > 0 ? `${primary} +${extra} more` : primary
}

/** Recent deliveries for operator support. Status is always a badge. */
export function DeliveriesTable({ state }: { state: DeliveriesTableState }) {
  return (
    <section aria-label="Deliveries">
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {state.status === 'empty' ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No deliveries yet.
            </p>
          ) : state.status === 'error' ? (
            <AppError
              title="Deliveries could not be loaded"
              error={state.error}
              variant="inline"
              showCode
            />
          ) : state.data.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No deliveries yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Recipient
                    </th>
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Sent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((delivery) => (
                    <tr key={delivery.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-medium">
                          {recipientSummary(delivery)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {delivery.subject}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <DeliveryStatusBadge status={delivery.status} />
                      </td>
                      <td className="text-muted-foreground py-3 tabular-nums">
                        {formatDate(delivery.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function DeliveriesTableSkeleton() {
  return (
    <section aria-label="Deliveries">
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-label="Loading deliveries" className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="bg-muted h-10 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
