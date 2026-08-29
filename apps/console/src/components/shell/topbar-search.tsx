'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

import { navConfig } from '@/components/shell/nav-config'
import { SETTINGS_OPTIONS } from '@/components/shell/settings-options'

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
  ...navConfig.flatMap((group) =>
    group.items.map((item) => ({
      group: 'Navigation',
      title: item.title,
      href: item.href,
    }))
  ),
  ...SETTINGS_OPTIONS.map((section) => ({
    group: 'Settings',
    title: section.title,
    href: section.href,
  })),
]
