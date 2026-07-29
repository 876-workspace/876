'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import { consoleNav, SETTINGS_SECTIONS } from './console-nav-config'

export function TopbarSearch() {
  const router = useRouter()

  return (
    <SharedTopbarSearch
      items={CONSOLE_SEARCH_ITEMS}
      onNavigate={(href) => router.push(href)}
    />
  )
}

const CONSOLE_SEARCH_ITEMS: TopbarSearchItem[] = [
  ...consoleNav.flatMap((group) =>
    group.items.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: item.href,
    }))
  ),
  ...consoleNav.flatMap((group) =>
    group.items.flatMap((item) =>
      (item.children ?? []).map((child) => ({
        group: item.title,
        title: child.title,
        href: child.href,
      }))
    )
  ),
  ...SETTINGS_SECTIONS.map((section) => ({
    group: 'Settings',
    title: section.title,
    href: section.href,
  })),
]
