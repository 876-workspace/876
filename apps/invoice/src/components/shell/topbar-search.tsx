'use client'

import { useRouter } from 'next/navigation'

import {
  TopbarSearch as SharedTopbarSearch,
  type TopbarSearchItem,
} from '@876/ui/topbar-search'

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
    />
  )
}

function getSearchItems(
  navigation: Array<{ title: string; href: string }>
): TopbarSearchItem[] {
  return navigation.map((item) => ({
    group: 'Navigation',
    title: item.title,
    href: item.href,
  }))
}
