import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

export const CONTACTS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Contact', cell: 'avatar' },
  { label: 'Nickname' },
  { label: 'Notes' },
  { label: 'Added' },
  { label: 'Actions', srOnly: true, width: '96px' },
]
