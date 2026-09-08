'use client'

import type { NavGroupDefinition } from '@876/core/access'
import { ProductMobileNav } from '@876/ui/product-mobile-nav'

import { resolveInvoiceNavIcon } from './nav-icons'

export function MobileNav({
  orgName,
  navigation,
}: {
  orgName: string
  navigation: NavGroupDefinition[]
}) {
  return (
    <ProductMobileNav
      title="Invoice"
      subtitle={orgName}
      navigation={navigation}
      resolveIcon={resolveInvoiceNavIcon}
    />
  )
}
