'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { useSidebar } from '@876/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

import { isActiveCouriersPath } from './couriers-nav-path'

export const navLinkBase =
  'group focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden text-left'
export const navLinkRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
export const navLinkActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] hover:bg-[var(--876-nav-active-bg-hover)] font-medium'

export function CouriersNavLink({
  href,
  title,
  icon: Icon,
  color,
}: {
  href: string
  title: string
  icon: IconComponent
  color?: string
}) {
  const pathname = usePathname()
  const { isMobile, state } = useSidebar()
  const isActive = isActiveCouriersPath(pathname, href)

  const linkEl = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        navLinkBase,
        'min-h-[2.25rem] px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
        'group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
        isActive ? navLinkActive : navLinkRest
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-[1.125rem] shrink-0 transition-colors"
        style={color ? { color } : undefined}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden">
        {title}
      </span>
    </Link>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={linkEl} />
      <TooltipContent side="right" hidden={state !== 'collapsed' || isMobile}>
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

export function CouriersNavSubLink({
  href,
  title,
}: {
  href: string
  title: string
}) {
  const pathname = usePathname()
  const isActive = isActiveCouriersPath(pathname, href)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        navLinkBase,
        'min-h-[2.125rem] rounded-l-none border-l-2 py-1.5 pr-3 pl-3 text-[0.8125rem] leading-5 font-normal',
        isActive
          ? 'border-[var(--876-nav-active-fg)] font-medium text-[var(--876-nav-active-fg)]'
          : cn(navLinkRest, 'border-[#e8eaed] dark:border-white/10')
      )}
    >
      <span className="truncate">{title}</span>
    </Link>
  )
}

export { isActiveCouriersPath } from './couriers-nav-path'
