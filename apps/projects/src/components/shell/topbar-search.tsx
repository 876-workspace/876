'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

const QUICK_ACTIONS: TopbarSearchItem[] = [
  {
    group: 'Actions',
    title: 'New request / ticket',
    href: '/requests/new',
    keywords: ['create', 'add', 'ticket', 'request', 'new'],
  },
  {
    group: 'Actions',
    title: 'New customer',
    href: '/customers/new',
    keywords: ['create', 'add', 'customer', 'new'],
  },
]

export function TopbarSearch({
  navigation,
}: {
  navigation: Array<{ title: string; href: string }>
}) {
  const router = useRouter()
  const items = getSearchItems(navigation)

  return (
    <SharedTopbarSearch
      items={items}
      onNavigate={(href) => router.push(href)}
      className="flex w-36 sm:w-56 md:w-72"
    />
  )
}

function getSearchItems(
  navigation: Array<{ title: string; href: string }>
): TopbarSearchItem[] {
  const navigationItems = navigation.map((item) => ({
    group: 'Navigation',
    title: item.title,
    href: item.href,
    keywords: [item.title.toLowerCase()],
  }))

  return [...navigationItems, ...QUICK_ACTIONS]
}
