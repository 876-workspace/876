import type { EmailDeliveryStatus } from '@876/communications/contracts'
import { Badge } from '@876/ui/badge'

const STATUS_LABEL: Record<EmailDeliveryStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  bounced: 'Bounced',
  complained: 'Complained',
  failed: 'Failed',
}

const STATUS_VARIANT: Record<
  EmailDeliveryStatus,
  | 'secondary'
  | 'outline'
  | 'info'
  | 'success'
  | 'default'
  | 'warning'
  | 'destructive'
> = {
  queued: 'secondary',
  sent: 'outline',
  delivered: 'info',
  opened: 'success',
  clicked: 'default',
  bounced: 'warning',
  complained: 'destructive',
  failed: 'destructive',
}

/** Delivery lifecycle status. Every status keeps its own label and badge. */
export function DeliveryStatusBadge({
  status,
}: {
  status: EmailDeliveryStatus
}) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
