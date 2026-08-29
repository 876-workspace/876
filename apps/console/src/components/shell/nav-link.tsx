'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { useSidebar } from '@876/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

export const navLinkBase =
  'group focus-visible:ring-sidebar-ring relative flex size-8.5 items-center justify-center rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:outline-hidden'
export const navLinkRest =
  'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
export const navLinkActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] shadow-xs ring-1 ring-[var(--876-nav-active-fg)]/20'

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
  side?: 'right' | 'top' | 'bottom' | 'left'
}) {
  const pathname = usePathname()
  const isActive = isActiveConsolePath(pathname, href)

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

export function isActiveConsolePath(pathname: string, href: string): boolean {
  if (href === '#') return false
  if (href === '/') return pathname === '/' || pathname.startsWith('/dashboard')

  return pathname === href || pathname.startsWith(`${href}/`)
}
