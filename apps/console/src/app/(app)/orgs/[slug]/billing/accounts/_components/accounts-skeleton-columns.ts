import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const ACCOUNTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Account' },
  { label: 'Invoice email' },
  { label: 'Currency' },
  { label: 'Balance' },
  { label: 'Actions', srOnly: true, width: '48px' },
]
