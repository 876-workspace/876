'use client'

import { useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Builds `/customers` links that carry the current query string forward.
 *
 * The list's own state — status filter today, sort and pagination later —
 * lives in the query string, while the path carries which customer and which
 * tab. Dragging the query along means opening a customer and closing it again
 * returns to the exact list the user left, rather than resetting it to the
 * default view. This is the same split Zoho Books uses.
 */
export function useCustomerLinks() {
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return useCallback(
    (path: string) => (query ? `${path}?${query}` : path),
    [query]
  )
}
