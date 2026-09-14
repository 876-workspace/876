'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'

import type { NavGroupDefinition } from '@876/core/access'
import type { IconComponent } from '../icons'
import {
  entryOpensContext,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
  type SidebarContextOptions,
} from '../sidebar-context'
import { ProductMobileNav } from './product-mobile-nav'

type DismissedContext = { key: string; pathname: string }

function mobileGroups(
  groups: readonly NavGroupDefinition[],
  contextKind: string,
  contexts: ReturnType<typeof sidebarContexts>
): readonly NavGroupDefinition[] {
  if (contextKind !== 'root') return groups

  return groups.map((group) => ({
    ...group,
    entries: group.entries.map((entry) =>
      entryOpensContext(entry, contexts)
        ? { ...entry, children: undefined }
        : entry
    ),
  }))
}

export function ContextualProductMobileNav({
  title,
  subtitle,
  navigation,
  resolveIcon,
  contextOptions,
}: {
  title: string
  subtitle?: string
  navigation: readonly NavGroupDefinition[]
  resolveIcon: (key: string) => IconComponent
  contextOptions: SidebarContextOptions
}) {
  const pathname = usePathname()
  const stack = resolveSidebarContextStack(
    pathname,
    navigation,
    [],
    contextOptions
  )
  const contexts = sidebarContexts(navigation, [], contextOptions)
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)
  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)
  const visibleNavigation = mobileGroups(context.groups, context.kind, contexts)

  return (
    <ProductMobileNav
      title={context.kind === 'root' ? title : context.title}
      accessibleTitle={title}
      subtitle={subtitle}
      navigation={visibleNavigation}
      resolveIcon={resolveIcon}
      expandChildren={context.kind === 'root'}
      backAction={
        parent
          ? {
              label: `Back to ${parent.backLabel}`,
              onClick: () =>
                setDismissed({ key: context.key, pathname }),
            }
          : undefined
      }
      onNavigate={(item) => {
        if (entryOpensContext(item, contexts)) setDismissed(null)
      }}
    />
  )
}
