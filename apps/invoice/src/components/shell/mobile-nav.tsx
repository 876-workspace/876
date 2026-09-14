'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { ContextualProductMobileNav } from '@876/ui/contextual-product-mobile-nav'

import { resolveInvoiceNavIcon } from './nav-icons'

const CONTEXT_OPTIONS = {
  rootKey: 'invoice',
  rootBackLabel: 'Invoice',
  sectionKeys: ['requests'],
} as const

export function MobileNav({
  orgName,
  navigation,
}: {
  orgName: string
  navigation: NavGroupDefinition[]
}) {
  return (
    <ContextualProductMobileNav
      title="Invoice"
      subtitle={orgName}
      navigation={navigation}
      resolveIcon={resolveInvoiceNavIcon}
      contextOptions={CONTEXT_OPTIONS}
    />
  )
}
