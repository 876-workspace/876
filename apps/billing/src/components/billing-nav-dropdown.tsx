'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@876/core/utils'
import { ChevronRight } from '@876/ui/icons'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@876/ui/collapsible'
import { useSidebar } from '@876/ui/sidebar'

import type { NavItem } from './billing-nav-config'
import {
  NavLink,
  NavSubLink,
  NavLinkActive,
  NavLinkBase,
  NavLinkRest,
  isActivePath,
} from './billing-nav-link'

export function NavDropdown({ item }: { item: NavItem }) {
  const { title, href, icon: Icon, color, children = [] } = item
  const pathname = usePathname()
  const { state } = useSidebar()
  const hasActiveChild = children.some((child) =>
    isActivePath(pathname, child.href)
  )
  const [open, setOpen] = useState(hasActiveChild)

  if (state === 'collapsed') {
    return (
      <NavLink
        href={href !== '#' ? href : (children[0]?.href ?? href)}
        title={title}
        icon={Icon}
        color={color}
      />
    )
  }

  const isActive = href !== '#' && isActivePath(pathname, href)
  const isHighlighted = hasActiveChild || isActive

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex w-full items-center gap-1.5">
        <Link
          href={href}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            NavLinkBase,
            'min-h-[2.25rem] flex-1 px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
            isHighlighted ? NavLinkActive : NavLinkRest
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
            className={cn('size-3.5 transition-transform', open && 'rotate-90')}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="876-nav-dropdown-panel">
        <div className="876-nav-dropdown-items mt-1 ml-[1.4375rem] flex flex-col gap-0.5 pb-1">
          {children.map((child) => (
            <NavSubLink
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
