import type { PackageStatus } from '@/types/package'
import type { PortalTimelineStep } from '@/types/portal'

const PACKAGE_STATUS_ORDER: readonly PackageStatus[] = [
  'PRE_ALERT',
  'RECEIVED',
  'IN_TRANSIT',
  'ARRIVED',
  'READY_FOR_PICKUP',
  'COLLECTED',
]

const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  PRE_ALERT: 'Pre-alert',
  RECEIVED: 'Received',
  IN_TRANSIT: 'In transit',
  ARRIVED: 'Arrived',
  READY_FOR_PICKUP: 'Ready for pickup',
  COLLECTED: 'Collected',
  UNCLAIMED: 'Unclaimed',
}

export function getPackageStatusLabel(status: PackageStatus): string {
  return PACKAGE_STATUS_LABELS[status]
}

export function getPackageTimeline(
  currentStatus: PackageStatus
): PortalTimelineStep[] {
  const statuses =
    currentStatus === 'UNCLAIMED'
      ? [...PACKAGE_STATUS_ORDER.slice(0, -1), 'UNCLAIMED' as const]
      : PACKAGE_STATUS_ORDER
  const currentIndex = statuses.indexOf(currentStatus)

  return statuses.map((status, index) => ({
    status,
    label: PACKAGE_STATUS_LABELS[status],
    state:
      index < currentIndex
        ? 'reached'
        : index === currentIndex
          ? 'current'
          : 'pending',
  }))
}
