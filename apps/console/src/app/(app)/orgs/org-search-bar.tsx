'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchInput } from '@/components/search-input'

export function OrgSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    if (!query.trim()) {
      startTransition(() => router.push('/orgs'))
      return
    }
    startTransition(() =>
      router.push(`/orgs?q=${encodeURIComponent(query.trim())}`)
    )
  }

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      onSearch={handleSearch}
      placeholder="Search organizations by name or slug…"
      isPending={isPending}
    />
  )
}
