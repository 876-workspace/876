'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@876/core/utils'
import type { IconComponent } from '@876/ui/icons'
import { useSidebar } from '@876/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

export const NavLinkBase =
  'group focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
export const NavLinkRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
export const NavLinkActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium hover:bg-[var(--876-nav-active-bg-hover)]'

export function NavLink({
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
  const active = isActivePath(pathname, href)

  const link = (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        NavLinkBase,
        'min-h-[2.25rem] px-3 py-1.5 text-[0.8125rem] leading-5 font-normal',
        'group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
        active ? NavLinkActive : NavLinkRest
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-[1.125rem] shrink-0"
        style={color ? { color } : undefined}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden">
        {title}
      </span>
    </Link>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" hidden={state !== 'collapsed' || isMobile}>
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

/** Indented child link rendered inside a Billing sidebar dropdown. */
export function NavSubLink({ href, title }: { href: string; title: string }) {
  const pathname = usePathname()
  const active = isActivePath(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        NavLinkBase,
        'min-h-[2.125rem] rounded-l-none border-l-2 py-1.5 pr-3 pl-3 text-[0.8125rem] leading-5 font-normal',
        active
          ? 'border-[var(--876-nav-active-fg)] font-medium text-[var(--876-nav-active-fg)]'
          : cn(NavLinkRest, 'border-[#e8eaed] dark:border-white/10')
      )}
    >
      <span className="truncate">{title}</span>
    </Link>
  )
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
