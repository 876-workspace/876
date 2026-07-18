'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchInput } from '@/components/search-input'

export function UserSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    if (!query.trim()) {
      startTransition(() => router.push('/users'))
      return
    }
    startTransition(() =>
      router.push(`/users?q=${encodeURIComponent(query.trim())}`)
    )
  }

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      onSearch={handleSearch}
      placeholder="Search users by name, email, or username…"
      isPending={isPending}
    />
  )
}
