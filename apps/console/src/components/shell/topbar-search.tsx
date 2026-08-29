'use client'

import type { TopbarSearchItem } from '@876/ui/topbar-search'
import { TopbarSearch as SharedTopbarSearch } from '@876/ui/topbar-search'
import { useRouter } from 'next/navigation'

export function TopbarSearch({ items }: { items: readonly TopbarSearchItem[] }) {
  const router = useRouter()

  return (
    <SharedTopbarSearch
      items={[...items]}
      onNavigate={(href) => router.push(href)}
    />
  )
}
