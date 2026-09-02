'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import type { NavGroupDefinition } from '@876/core/access'

export function TopbarSearch({
  navigation,
}: {
  navigation: NavGroupDefinition[]
}) {
  const router = useRouter()
  const items = getSearchItems(navigation)

  return (
    <SharedTopbarSearch
      items={items}
      onNavigate={(href) => router.push(href)}
    />
  )
}

function getSearchItems(navigation: NavGroupDefinition[]): TopbarSearchItem[] {
  const navigationItems = navigation.flatMap((group) =>
    group.entries.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: item.href,
    }))
  )
  const childItems = navigation.flatMap((group) =>
    group.entries.flatMap((item) =>
      (item.children ?? []).map((child) => ({
        group: item.title,
        title: child.title,
        href: child.href,
      }))
    )
  )

  return [...navigationItems, ...childItems]
}
