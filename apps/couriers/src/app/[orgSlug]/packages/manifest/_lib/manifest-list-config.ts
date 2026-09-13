export const MANIFEST_STATUS_OPTIONS = [
  { value: 'all', label: 'All Manifests', headingLabel: 'All Manifests' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Manifests' },
  { value: 'sealed', label: 'Sealed', headingLabel: 'Sealed Manifests' },
  {
    value: 'in_transit',
    label: 'In transit',
    headingLabel: 'In-transit Manifests',
  },
  { value: 'arrived', label: 'Arrived', headingLabel: 'Arrived Manifests' },
  {
    value: 'customs_hold',
    label: 'Customs hold',
    headingLabel: 'Customs-hold Manifests',
  },
  { value: 'cleared', label: 'Cleared', headingLabel: 'Cleared Manifests' },
]

export const MANIFESTS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]

const MANIFEST_STATUS_VALUES = new Set(
  MANIFEST_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

/** An absent or unknown `?status=` value means no filter. */
export function resolveManifestStatusFilter(
  status: string | null | undefined
): string {
  return status && MANIFEST_STATUS_VALUES.has(status) ? status : 'all'
}
