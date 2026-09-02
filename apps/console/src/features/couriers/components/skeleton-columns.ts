import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * The fallback column sets for the Couriers workspace tables.
 *
 * Each list mirrors its table's real `<thead>`, so a column added to a table
 * without adding it here is visible as a shift when the data lands
 * (`CLAUDE.md` → Loading States & Suspense Placement).
 */
export const COURIERS_CUSTOMERS_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Customer' },
  { label: 'Branch' },
  { label: 'Kind' },
  { label: 'TRN' },
  { label: 'Status' },
  { label: 'Joined' },
]

export const COURIERS_PACKAGES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Tracking' },
  { label: 'Customer' },
  { label: 'Description' },
  { label: 'Type' },
  { label: 'Qty' },
  { label: 'Weight' },
  { label: 'Status' },
  { label: 'Received' },
]

export const COURIERS_BRANCHES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Branch' },
  { label: 'Address' },
  { label: 'City' },
  { label: 'Phone' },
  { label: 'Default' },
  { label: 'Status' },
]

export const COURIERS_WAREHOUSES_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Warehouse' },
  { label: 'Code' },
  { label: 'Operating model' },
  { label: 'Agent' },
  { label: 'City' },
  { label: 'Primary' },
  { label: 'Status' },
]

export const COURIERS_TEAM_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Member' },
  { label: 'Email' },
  { label: 'Role' },
  { label: 'Status' },
  { label: 'Added' },
]
