'use client'

import { useState } from 'react'
import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { ProductMobileNav } from '@876/ui/product-mobile-nav'
import { usePathname } from 'next/navigation'

import {
  resolveNavIcon,
  resolveNavIconColor,
} from '@/components/shell/nav-icons'
import { isActiveConsolePath } from '@/components/shell/nav-link'
import { navContexts } from '@/components/shell/nav-contexts'
import {
  entryOpensContext,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
  type SidebarContextDefinition,
} from '@/components/shell/sidebar-context'

type DismissedContext = {
  key: string
  pathname: string
}

/**
 * Mirrors the desktop rail's context stack while delegating mobile sheet
 * presentation to the shared product navigation component.
 */
export function MobileNav({
  navigation,
  contexts = navContexts,
}: {
  navigation: readonly NavGroupDefinition[]
  contexts?: readonly SidebarContextDefinition[]
}) {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const allContexts = sidebarContexts(navigation, contexts)

  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)
  const activeKey = resolveActiveEntryKey(pathname, context)

  const isActive = (item: NavEntry, currentPathname: string) =>
    activeKey === null
      ? isActiveConsolePath(currentPathname, item.href)
      : item.key === activeKey

  const handleNavigate = (item: NavEntry) => {
    if (entryOpensContext(item, allContexts)) setDismissed(null)
  }

  return (
    <ProductMobileNav
      title={context.title || 'Console'}
      subtitle={context.subtitle}
      navigation={context.groups}
      resolveIcon={resolveNavIcon}
      resolveIconColor={resolveNavIconColor}
      isActive={isActive}
      onNavigate={handleNavigate}
      expandChildren={false}
      ariaLabel="Console navigation"
      triggerLabel="Open navigation"
      backAction={
        parent
          ? {
              label: `Back to ${parent.backLabel}`,
              onClick: () => setDismissed({ key: context.key, pathname }),
            }
          : undefined
      }
    />
  )
}
