export const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All Items', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

export const ITEMS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]

export type ItemStatusFilter = 'all' | 'active' | 'inactive'

/** An absent or unknown `?status=` value means no filter. */
export function resolveItemStatusFilter(
  status: string | null | undefined
): ItemStatusFilter {
  return status === 'active' || status === 'inactive' ? status : 'all'
}
