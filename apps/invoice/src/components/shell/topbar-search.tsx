'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import { navConfig } from './nav-config'

export function TopbarSearch() {
  const router = useRouter()
  const items = getSearchItems()

  return (
    <SharedTopbarSearch
      items={items}
      onNavigate={(href) => router.push(href)}
    />
  )
}

function getSearchItems(): TopbarSearchItem[] {
  const navigationItems = navConfig.flatMap((group) =>
    group.items.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: item.href,
    }))
  )
  const childItems = navConfig.flatMap((group) =>
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
