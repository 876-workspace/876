import { Badge } from '@876/ui/badge'

import { formatSubscriptionStatus } from '@/lib/format'
import type { SubscriptionStatus } from '@/types/subscription'

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus
}) {
  return (
    <Badge variant={statusVariant(status)}>
      {formatSubscriptionStatus(status)}
    </Badge>
  )
}

function statusVariant(status: SubscriptionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'success' as const
    case 'TRIALING':
      return 'info' as const
    case 'PAUSED':
      return 'warning' as const
    case 'CANCELED':
    case 'ENDED':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}
