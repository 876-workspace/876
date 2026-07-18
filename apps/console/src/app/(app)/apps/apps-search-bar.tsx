'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { SearchInput } from '@/components/search-input'

export function AppsSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    const params = new URLSearchParams(searchParams)
    params.delete('after')
    params.delete('before')

    if (query.trim()) {
      params.set('q', query.trim())
    } else {
      params.delete('q')
    }

    const next = params.toString()
    startTransition(() => router.push(next ? `/apps?${next}` : '/apps'))
  }

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      onSearch={handleSearch}
      placeholder="Search apps by name or slug..."
      isPending={isPending}
    />
  )
}
