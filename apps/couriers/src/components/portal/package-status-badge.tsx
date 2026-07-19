import { Badge } from '@876/ui/badge'

import { getPackageStatusLabel } from '@/lib/portal/package-status'
import type { PackageStatus } from '@/types/package'

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  if (status === 'READY_FOR_PICKUP' || status === 'COLLECTED')
    return <Badge variant="success">{getPackageStatusLabel(status)}</Badge>

  if (status === 'RECEIVED' || status === 'IN_TRANSIT' || status === 'ARRIVED')
    return <Badge variant="info">{getPackageStatusLabel(status)}</Badge>

  return (
    <Badge variant={status === 'PRE_ALERT' ? 'secondary' : 'outline'}>
      {getPackageStatusLabel(status)}
    </Badge>
  )
}
