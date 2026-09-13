import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import type { Permission } from '@/types/access'

type CatalogListConfig = {
  columns: DataTableSkeletonColumn[]
  options: StatusFilterOption[]
  primary: {
    href: string
    permission: Permission
  }
  title: string
}

function activeOptions(title: string): StatusFilterOption[] {
  return [
    { value: 'all', label: `All ${title}` },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]
}

export const CATALOG_LISTS = {
  addons: {
    title: 'Add-ons',
    options: activeOptions('Add-ons'),
    primary: { href: '/addons/new', permission: 'catalog:write' },
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
    options: activeOptions('Coupons'),
    primary: {
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
    options: activeOptions('Plans'),
    primary: { href: '/plans/new', permission: 'catalog:write' },
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
    options: activeOptions('Price Lists'),
    primary: {
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
    options: activeOptions('Prices'),
    primary: { href: '/prices/new', permission: 'catalog:write' },
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
    options: activeOptions('Products'),
    primary: {
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
