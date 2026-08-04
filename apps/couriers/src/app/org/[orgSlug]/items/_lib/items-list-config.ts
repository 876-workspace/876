export const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

export const ITEMS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const },
  { label: 'Export', icon: 'export' as const },
  {
    label: 'Delete items',
    icon: 'delete' as const,
    destructive: true,
    separator: true,
  },
]
