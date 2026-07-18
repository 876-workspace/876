export type FeatureGroupItem = {
  slug: string
  label: string
}

export type FeatureGroup = {
  id: string
  title: string
  masterSlug: string
  childSlugPrefix: string
  items: FeatureGroupItem[]
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'notifications',
    title: 'Notifications',
    masterSlug: 'console_notifications',
    childSlugPrefix: 'console_notifications_',
    items: [
      { slug: 'console_notifications_email_alerts', label: 'Email alerts' },
      { slug: 'console_notifications_slack', label: 'Slack' },
      { slug: 'console_notifications_webhooks', label: 'Webhooks' },
    ],
  },
  {
    id: 'billing_sales',
    title: 'Sales',
    masterSlug: 'billing_sales',
    childSlugPrefix: 'billing_sales_',
    items: [
      { slug: 'billing_sales_quotes', label: 'Quotes' },
      { slug: 'billing_sales_estimates', label: 'Estimates' },
      { slug: 'billing_sales_invoices', label: 'Invoices' },
    ],
  },
  {
    id: 'billing_purchases',
    title: 'Purchases',
    masterSlug: 'billing_purchases',
    childSlugPrefix: 'billing_purchases_',
    items: [
      { slug: 'billing_purchases_vendors', label: 'Vendors' },
      { slug: 'billing_purchases_expenses', label: 'Expenses' },
    ],
  },
  {
    id: 'couriers_operations',
    title: 'Operations',
    masterSlug: 'couriers_operations',
    childSlugPrefix: 'couriers_operations_',
    items: [
      { slug: 'couriers_operations_packages', label: 'Packages' },
      { slug: 'couriers_operations_customers', label: 'Customers' },
      { slug: 'couriers_operations_items', label: 'Items' },
    ],
  },
  {
    id: 'couriers_widgets',
    title: 'Widgets',
    masterSlug: 'couriers_widgets',
    childSlugPrefix: 'couriers_widgets_',
    items: [{ slug: 'couriers_widgets_notepad', label: 'Notepad' }],
  },
]

export const PINNED_ROOT_FEATURE_SLUGS = [
  'console_notifications',
  'billing_sales',
  'billing_purchases',
  'couriers_operations',
  'couriers_widgets',
] as const

export function findFeatureGroupByMasterSlug(
  slug: string
): FeatureGroup | null {
  return FEATURE_GROUPS.find((group) => group.masterSlug === slug) ?? null
}

export function isFeatureGroupChild(
  group: FeatureGroup,
  featureSlug: string
): boolean {
  return (
    featureSlug !== group.masterSlug &&
    (featureSlug.startsWith(group.childSlugPrefix) ||
      group.items.some((item) => item.slug === featureSlug))
  )
}
