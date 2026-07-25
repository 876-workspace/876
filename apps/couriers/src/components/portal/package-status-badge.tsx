import { SoftBadge, type SoftBadgeTone } from '@/components/soft-badge'
import { getPackageStatusLabel } from '@/lib/portal/package-status'
import type { PackageStatus } from '@/types/package'

const PACKAGE_STATUS_TONE: Record<PackageStatus, SoftBadgeTone> = {
  PRE_ALERT: 'slate',
  RECEIVED: 'sky',
  IN_TRANSIT: 'sky',
  ARRIVED: 'sky',
  READY_FOR_PICKUP: 'emerald',
  COLLECTED: 'emerald',
  UNCLAIMED: 'amber',
}

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return (
    <SoftBadge tone={PACKAGE_STATUS_TONE[status]}>
      {getPackageStatusLabel(status)}
    </SoftBadge>
  )
}
