'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import { getVisibleNav } from './billing-nav-config'
import type { Permission } from '@/types/access'
import type { BillingProductFeatures } from '@/types/features'

export function TopbarSearch({
  permissions,
  productFeatures,
}: {
  permissions: Permission[]
  productFeatures: BillingProductFeatures
}) {
  const router = useRouter()
  const items = getSearchItems(permissions, productFeatures)

  return (
    <SharedTopbarSearch
      items={items}
      onNavigate={(href) => router.push(href)}
    />
  )
}

function getSearchItems(
  permissions: Permission[],
  productFeatures: BillingProductFeatures
): TopbarSearchItem[] {
  const visibleNav = getVisibleNav(permissions, productFeatures)
  const navigationItems = visibleNav.flatMap((group) =>
    group.items.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: item.href,
    }))
  )
  const childItems = visibleNav.flatMap((group) =>
    group.items.flatMap((item) =>
      (item.children ?? []).map((child) => ({
        group: item.title,
        title: child.title,
        href: child.href,
      }))
    )
  )

  return [...navigationItems, ...childItems]
}
