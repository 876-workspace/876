import type { BillingPayment } from '@876/billing/integration'

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Payments', headingLabel: 'All Payments' },
  { value: 'pending', label: 'Pending', headingLabel: 'Pending Payments' },
  {
    value: 'completed',
    label: 'Completed',
    headingLabel: 'Completed Payments',
  },
  { value: 'failed', label: 'Failed', headingLabel: 'Failed Payments' },
  { value: 'refunded', label: 'Refunded', headingLabel: 'Refunded Payments' },
]

export const PAYMENTS_DROPDOWN_ACTIONS = [
  { label: 'Import', icon: 'import' as const, disabled: true },
  { label: 'Export', icon: 'export' as const, disabled: true },
]

/** URL status value → the Billing payment statuses it selects. */
const PAYMENT_STATUS_FILTERS: Record<string, BillingPayment['status'][]> = {
  pending: ['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'PROCESSING'],
  completed: ['SUCCEEDED'],
  failed: ['FAILED', 'CANCELED'],
  refunded: ['PARTIALLY_REFUNDED', 'REFUNDED'],
}

export function resolvePaymentStatus(status: string | undefined): {
  selected: string
  filter: BillingPayment['status'][] | undefined
} {
  const filter = status ? PAYMENT_STATUS_FILTERS[status] : undefined
  return filter && status
    ? { selected: status, filter }
    : { selected: 'all', filter: undefined }
}
