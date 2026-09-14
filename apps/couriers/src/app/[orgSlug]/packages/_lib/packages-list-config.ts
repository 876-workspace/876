import type { PackageStatus } from '@876/couriers/admin'

export const PACKAGE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Packages', headingLabel: 'All Packages' },
  {
    value: 'PRE_ALERT',
    label: 'Pre-alert',
    headingLabel: 'Pre-alert Packages',
  },
  { value: 'RECEIVED', label: 'Received', headingLabel: 'Received Packages' },
  {
    value: 'IN_TRANSIT',
    label: 'In transit',
    headingLabel: 'In-transit Packages',
  },
  { value: 'ARRIVED', label: 'Arrived', headingLabel: 'Arrived Packages' },
  {
    value: 'READY_FOR_PICKUP',
    label: 'Ready for pickup',
    headingLabel: 'Ready for Pickup Packages',
  },
  {
    value: 'COLLECTED',
    label: 'Collected',
    headingLabel: 'Collected Packages',
  },
  {
    value: 'UNCLAIMED',
    label: 'Unclaimed',
    headingLabel: 'Unclaimed Packages',
  },
] as const

export type PackageStatusFilter = 'all' | PackageStatus

const PACKAGE_STATUS_VALUES = new Set<PackageStatusFilter>(
  PACKAGE_STATUS_OPTIONS.map((option) => option.value)
)

export function resolvePackageStatusFilter(
  value: string | null | undefined
): PackageStatusFilter {
  return value && PACKAGE_STATUS_VALUES.has(value as PackageStatusFilter)
    ? (value as PackageStatusFilter)
    : 'all'
}

export function packageStatusLabel(status: PackageStatus) {
  return (
    PACKAGE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  )
}

export const PACKAGES_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]
