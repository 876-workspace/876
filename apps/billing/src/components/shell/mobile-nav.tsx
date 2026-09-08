'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { ProductMobileNav } from '@876/ui/product-mobile-nav'

import { resolveBillingNavIcon } from './nav-icons'

export function MobileNav({
  tenantName,
  navigation,
}: {
  tenantName: string
  navigation: NavGroupDefinition[]
}) {
  return (
    <ProductMobileNav
      title="Billing"
      subtitle={tenantName}
      navigation={navigation}
      resolveIcon={resolveBillingNavIcon}
    />
  )
}
