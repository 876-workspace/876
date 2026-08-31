import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

/**
 * Column definitions for provisioning collection data table skeletons.
 * Labels and shapes match the loaded collection tables exactly.
 */
export const PROVISIONING_COLLECTION_COLUMNS: Record<
  string,
  DataTableSkeletonColumn[]
> = {
  currency: [
    { label: 'ISO code', cellWidth: '60px' },
    { label: 'Name', cellWidth: '160px' },
    { label: 'Numeric code', cellWidth: '60px' },
    { label: 'Minor unit', cellWidth: '40px' },
    { label: 'Symbol', cellWidth: '40px' },
    { label: 'Actions', srOnly: true, width: '7rem' },
  ],
  payment_mode: [
    { label: 'Name', cellWidth: '200px' },
    { label: 'Actions', srOnly: true, width: '7rem' },
  ],
  payment_term: [
    { label: 'Name', cellWidth: '160px' },
    { label: 'Rule', cellWidth: '140px' },
    { label: 'Due days', cellWidth: '60px' },
    { label: 'Actions', srOnly: true, width: '7rem' },
  ],
  tax_authority: [
    { label: 'Name', cellWidth: '180px' },
    { label: 'Description', cellWidth: '240px' },
    { label: 'Country', cellWidth: '60px' },
    { label: 'Actions', srOnly: true, width: '7rem' },
  ],
  tax_rate: [
    { label: 'Name', cellWidth: '160px' },
    { label: 'Description', cellWidth: '200px' },
    { label: 'Tax type', cellWidth: '100px' },
    { label: 'Rate', cellWidth: '60px' },
    { label: 'Inclusive', cell: 'badge', cellWidth: '3.5rem' },
    { label: 'Tax authority', cellWidth: '140px' },
    { label: 'Actions', srOnly: true, width: '7rem' },
  ],
}
