import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import type { Permission } from '@/types/access'

type CatalogListConfig = {
  columns: DataTableSkeletonColumn[]
  options: StatusFilterOption[]
  primary: {
    href: string
    label: string
    permission: Permission
  }
  title: string
}

const ACTIVE_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export const CATALOG_LISTS = {
  addons: {
    title: 'Add-ons',
    options: ACTIVE_OPTIONS,
    primary: { label: 'Add', href: '/addons/new', permission: 'catalog:write' },
    columns: [
      { label: 'Add-on', cell: 'avatar' },
      { label: 'Product' },
      { label: 'Charge' },
      { label: 'Plans' },
      { label: 'Prices' },
      { label: 'Status', cell: 'badge' },
    ],
  },
  coupons: {
    title: 'Coupons',
    options: ACTIVE_OPTIONS,
    primary: {
      label: 'New Coupon',
      href: '/coupons/new',
      permission: 'subscriptions:write',
    },
    columns: [
      { label: 'Coupon', cell: 'avatar' },
      { label: 'Product' },
      { label: 'Discount' },
      { label: 'Duration' },
      { label: 'Redemptions' },
      { label: 'Status', cell: 'badge' },
    ],
  },
  plans: {
    title: 'Plans',
    options: ACTIVE_OPTIONS,
    primary: { label: 'Add', href: '/plans/new', permission: 'catalog:write' },
    columns: [
      { label: 'Plan', cell: 'avatar' },
      { label: 'Product' },
      { label: 'Cadence' },
      { label: 'Trial' },
      { label: 'Prices' },
      { label: 'Status', cell: 'badge' },
    ],
  },
  priceLists: {
    title: 'Price Lists',
    options: ACTIVE_OPTIONS,
    primary: {
      label: 'Add',
      href: '/price-lists/new',
      permission: 'catalog:write',
    },
    columns: [
      { label: 'Price list', cell: 'avatar' },
      { label: 'Method' },
      { label: 'Prices' },
      { label: 'Customers' },
      { label: 'Status', cell: 'badge' },
    ],
  },
  prices: {
    title: 'Prices',
    options: ACTIVE_OPTIONS,
    primary: { label: 'Add', href: '/prices/new', permission: 'catalog:write' },
    columns: [
      { label: 'Catalog target', cell: 'avatar' },
      { label: 'Amount' },
      { label: 'Cadence' },
      { label: 'Model' },
      { label: 'Status', cell: 'badge' },
    ],
  },
  products: {
    title: 'Products',
    options: ACTIVE_OPTIONS,
    primary: {
      label: 'Add',
      href: '/products/new',
      permission: 'catalog:write',
    },
    columns: [
      { label: 'Product', cell: 'avatar' },
      { label: 'Plans' },
      { label: 'Source' },
      { label: 'Status', cell: 'badge' },
    ],
  },
} satisfies Record<string, CatalogListConfig>

export function parseCatalogStatus(status: string | undefined) {
  return status === 'active' || status === 'inactive' ? status : 'all'
}
