'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { ContextualProductMobileNav } from '@876/ui/contextual-product-mobile-nav'

import { resolveBillingNavIcon } from './nav-icons'

const CONTEXT_OPTIONS = {
  rootKey: 'billing',
  rootBackLabel: 'Billing',
  sectionKeys: ['requests'],
} as const

export function MobileNav({
  tenantName,
  navigation,
}: {
  tenantName: string
  navigation: NavGroupDefinition[]
}) {
  return (
    <ContextualProductMobileNav
      title="Billing"
      subtitle={tenantName}
      navigation={navigation}
      resolveIcon={resolveBillingNavIcon}
      contextOptions={CONTEXT_OPTIONS}
    />
  )
}
