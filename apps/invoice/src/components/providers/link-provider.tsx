'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { BillingUiLinkProvider } from '@876/billing-ui/link'

/**
 * Supplies the host's router-aware link to `@876/billing-ui`. Without it the
 * package falls back to a plain anchor, which still renders but loses
 * client-side navigation and prefetching.
 */
export function LinkProvider({ children }: { children: ReactNode }) {
  return (
    <BillingUiLinkProvider component={Link}>{children}</BillingUiLinkProvider>
  )
}
