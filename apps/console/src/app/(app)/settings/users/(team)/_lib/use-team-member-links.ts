'use client'

import { useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

/** Carries list state across member routes and back to the Team table. */
export function useTeamMemberLinks() {
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return useCallback(
    (path: string) => (query ? `${path}?${query}` : path),
    [query]
  )
}
