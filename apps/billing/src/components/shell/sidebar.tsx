'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import type { NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ChevronsLeft } from '@876/ui/icons'
import {
  entryOpensContext,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
} from '@876/ui/sidebar-context'
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@876/ui/sidebar'

import { NavDropdown } from './nav-dropdown'
import { resolveBillingNavIcon } from './nav-icons'
import { NavLink } from './nav-link'

const CONTEXT_OPTIONS = {
  rootKey: 'billing',
  rootBackLabel: 'Billing',
  sectionKeys: ['requests'],
} as const

type DismissedContext = { key: string; pathname: string }

export function WorkspaceSidebar({
  tenantName,
  navigation,
}: {
  tenantName: string
  navigation: NavGroupDefinition[]
}) {
  const pathname = usePathname()
  const stack = resolveSidebarContextStack(
    pathname,
    navigation,
    [],
    CONTEXT_OPTIONS
  )
  const contexts = sidebarContexts(navigation, [], CONTEXT_OPTIONS)
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)
  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)
  const activeKey = resolveActiveEntryKey(pathname, context)

  return (
    <BaseSidebar
      variant="sidebar"
      collapsible="icon"
      renderMobile={false}
      className="bg-sidebar"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && parent)
          setDismissed({ key: context.key, pathname })
      }}
    >
      <SidebarHeader className="px-5 pt-5 pb-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <span className="border-sidebar-border text-sidebar-foreground flex size-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold">
            B
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sidebar-foreground block truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em]">
              {tenantName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-3 pt-4 pb-4">
        <nav
          aria-label="Billing sections"
          className="flex flex-1 flex-col gap-4"
        >
          {parent ? (
            <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                {context.title}
              </span>
              <button
                type="button"
                aria-label={`Back to ${parent.backLabel}`}
                onClick={() =>
                  setDismissed({ key: context.key, pathname })
                }
                className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
              >
                <ChevronsLeft aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}

          {context.groups.map((group) => (
            <SidebarGroup
              key={group.key}
              className={cn(
                'gap-1.5 p-0',
                context.kind === 'root' &&
                  group.key === 'secondary' &&
                  'mt-auto'
              )}
            >
              <div className="flex flex-col gap-1">
                {group.entries.map((item) => {
                  const Icon = resolveBillingNavIcon(item.icon)
                  const opensContext = entryOpensContext(item, contexts)

                  if (opensContext) {
                    return (
                      <NavLink
                        key={item.key}
                        href={item.href}
                        title={item.title}
                        icon={Icon}
                        colorClassName={item.colorClassName}
                        onClick={() => setDismissed(null)}
                      />
                    )
                  }

                  if (context.kind === 'root' && item.children?.length) {
                    return (
                      <NavDropdown key={item.key} item={item} icon={Icon} />
                    )
                  }

                  return (
                    <NavLink
                      key={item.key}
                      href={item.href}
                      title={item.title}
                      icon={Icon}
                      colorClassName={item.colorClassName}
                      active={
                        context.kind === 'section'
                          ? activeKey === item.key
                          : undefined
                      }
                    />
                  )
                })}
              </div>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </BaseSidebar>
  )
}
