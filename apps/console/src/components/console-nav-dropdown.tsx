'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { useSidebar } from '@876/ui/sidebar'

import {
  isActiveConsolePath,
  ConsoleNavLink,
  ConsoleNavSubLink,
  navLinkActive,
  navLinkBase,
  navLinkRest,
} from './console-nav-link'
import type { ConsoleNavItem } from './console-nav-config'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@876/ui/collapsible'

export function ConsoleNavDropdown({ item }: { item: ConsoleNavItem }) {
  const { title, href, icon, color, children = [] } = item
  const pathname = usePathname()
  const { state } = useSidebar()
  const hasActiveChild = children.some((child) =>
    isActiveConsolePath(pathname, child.href)
  )
  const [open, setOpen] = useState(hasActiveChild)

  // In icon-only mode, degrade to a simple nav link pointing at the parent href (if navigable)
  // or falling back to the first child.
  if (state === 'collapsed') {
    const targetHref = href !== '#' ? href : (children[0]?.href ?? href)
    return (
      <ConsoleNavLink
        href={targetHref}
        title={title}
        icon={icon}
        color={color}
      />
    )
  }

  const hasRealHref = href !== '#'
  const isActive = hasRealHref && isActiveConsolePath(pathname, href)
  const isHighlighted = hasActiveChild || isActive

  const Icon = icon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {hasRealHref ? (
        /* Navigable row: link and chevron are visually separate */
        <div className="flex w-full items-center gap-1.5">
          <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              navLinkBase,
              'min-h-[2.25rem] flex-1 px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
              isHighlighted ? navLinkActive : navLinkRest
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[1.125rem] shrink-0"
              style={color ? { color } : undefined}
            />
            <span className="flex-1 truncate">{title}</span>
          </Link>

          <CollapsibleTrigger
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            className="focus-visible:ring-sidebar-ring bg-muted/50 text-muted-foreground hover:bg-muted flex size-[2.25rem] shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'size-3.5 transition-transform',
                open && 'rotate-90'
              )}
            />
          </CollapsibleTrigger>
        </div>
      ) : (
        /* Non-navigable placeholder: matches hasRealHref layout so icons/text align */
        <div className="flex w-full items-center gap-1.5">
          <CollapsibleTrigger
            className={cn(
              navLinkBase,
              'min-h-[2.25rem] flex-1 px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
              isHighlighted ? navLinkActive : navLinkRest
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[1.125rem] shrink-0"
              style={color ? { color } : undefined}
            />
            <span className="flex-1 truncate">{title}</span>
          </CollapsibleTrigger>

          {/* Visual-only chevron — mirrors the interactive chevron in the hasRealHref branch
              so both row types have identical layout. Non-interactive: clicks bubble to the
              CollapsibleTrigger above via the parent flex container being the trigger. */}
          <span
            aria-hidden="true"
            className="bg-muted/50 text-muted-foreground flex size-[2.25rem] shrink-0 items-center justify-center rounded-lg"
          >
            <ChevronRight
              className={cn(
                'size-3.5 transition-transform',
                open && 'rotate-90'
              )}
            />
          </span>
        </div>
      )}

      <CollapsibleContent className="876-nav-dropdown-panel">
        <div className="876-nav-dropdown-items mt-1 ml-[1.4375rem] flex flex-col gap-0.5 pb-1">
          {children.map((child) => (
            <ConsoleNavSubLink
              key={child.title}
              href={child.href}
              title={child.title}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
