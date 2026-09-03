'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@876/core/utils'
import type { IconComponent } from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

export const navLinkBase =
  'group relative flex size-8.5 items-center justify-center rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:outline-hidden'
export const navLinkRest =
  'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
export const navLinkActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium shadow-xs ring-1 ring-[var(--876-nav-active-fg)]/15'

export function NavLink({
  href,
  title,
  icon: Icon,
  color,
  colorClassName,
  side = 'right',
}: {
  href: string
  title: string
  icon: IconComponent
  color?: string
  colorClassName?: string
  side?: 'right' | 'bottom' | 'top' | 'left'
}) {
  const pathname = usePathname()
  const isActive = isActiveCrmPath(pathname, href)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={title}
            aria-current={isActive ? 'page' : undefined}
            className={cn(navLinkBase, isActive ? navLinkActive : navLinkRest)}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                colorClassName
              )}
              style={color ? { color } : undefined}
            />
          </Link>
        }
      />
      <TooltipContent side={side} sideOffset={8}>
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

export function isActiveCrmPath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'

  return pathname === href || pathname.startsWith(`${href}/`)
}
