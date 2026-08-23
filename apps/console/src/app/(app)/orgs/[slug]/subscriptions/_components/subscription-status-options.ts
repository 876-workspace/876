import type { StatusFilterOption } from '@876/ui/status-filter-heading'

export const SUBSCRIPTION_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Subscriptions' },
  { value: 'active', label: 'Active', headingLabel: 'Active Subscriptions' },
  {
    value: 'trialing',
    label: 'Trialing',
    headingLabel: 'Trialing Subscriptions',
  },
  {
    value: 'past_due',
    label: 'Past due',
    headingLabel: 'Past Due Subscriptions',
  },
  {
    value: 'canceled',
    label: 'Canceled',
    headingLabel: 'Canceled Subscriptions',
  },
  { value: 'unpaid', label: 'Unpaid', headingLabel: 'Unpaid Subscriptions' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Subscriptions' },
  {
    value: 'incomplete',
    label: 'Incomplete',
    headingLabel: 'Incomplete Subscriptions',
  },
]
