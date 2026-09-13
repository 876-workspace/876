export const DELIVERY_STATUS_OPTIONS = [
  { value: 'all', label: 'All Deliveries', headingLabel: 'All Deliveries' },
  {
    value: 'scheduled',
    label: 'Scheduled',
    headingLabel: 'Scheduled Deliveries',
  },
  {
    value: 'out_for_delivery',
    label: 'Out for delivery',
    headingLabel: 'Out-for-delivery Deliveries',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    headingLabel: 'Delivered Deliveries',
  },
  { value: 'failed', label: 'Failed', headingLabel: 'Failed Deliveries' },
  {
    value: 'returned',
    label: 'Returned',
    headingLabel: 'Returned Deliveries',
  },
]

export const DELIVERIES_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]

const DELIVERY_STATUS_VALUES = new Set(
  DELIVERY_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

/** An absent or unknown `?status=` value means no filter. */
export function resolveDeliveryStatusFilter(
  status: string | null | undefined
): string {
  return status && DELIVERY_STATUS_VALUES.has(status) ? status : 'all'
}
