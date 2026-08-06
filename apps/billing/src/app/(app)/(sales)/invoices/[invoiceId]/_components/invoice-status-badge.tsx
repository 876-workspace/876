import { Badge } from '@876/ui/badge'
import type { InvoiceStatus } from '@/types/invoice'

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === 'PAID'
      ? 'success'
      : status === 'OVERDUE' || status === 'UNCOLLECTIBLE'
        ? 'destructive'
        : status === 'OPEN' || status === 'SENT' || status === 'PARTIALLY_PAID'
          ? 'info'
          : 'secondary'

  return (
    <Badge variant={variant} className="capitalize">
      {status.toLowerCase().replaceAll('_', ' ')}
    </Badge>
  )
}
