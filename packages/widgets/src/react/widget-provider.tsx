'use client'

import { type ReactNode } from 'react'

/**
 * Legacy Convex auth boundary. Hosts now authorize via session on
 * same-origin routes; this provider is a no-op passthrough for compatibility.
 */
export function WidgetBackendProvider({
  children,
}: {
  children: ReactNode
  convexUrl?: string
  tokenEndpoint?: string
  withAuthBoundary?: boolean
}) {
  return children
}

export function WidgetAuthBoundary({
  children,
}: {
  children: ReactNode
  loadingFallback?: ReactNode
}) {
  return children
}
