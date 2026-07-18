'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { useSidebar } from '@876/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

export const navLinkBase =
  'group focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden text-left'
export const navLinkRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
export const navLinkActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] hover:bg-[var(--876-nav-active-bg-hover)] font-medium'

export function EnterpriseNavLink({
  href,
  title,
  icon: Icon,
  color,
  logoUrl,
}: {
  href: string
  title: string
  icon: IconComponent
  color?: string
  logoUrl?: string | null
}) {
  const pathname = usePathname()
  const { isMobile, state } = useSidebar()
  const isActive = isActiveEnterprisePath(pathname, href)

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
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          unoptimized
          className="size-[1.125rem] shrink-0 rounded-sm object-contain"
        />
      ) : (
        <Icon
          aria-hidden="true"
          className="size-[1.125rem] shrink-0 transition-colors"
          style={color ? { color } : undefined}
        />
      )}
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

export function isActiveEnterprisePath(
  pathname: string,
  href: string
): boolean {
  // External/absolute URLs (e.g. consumer-app links) never match a local path.
  if (!href.startsWith('/')) return pathname === href
  // The org root (`/[slug]`, two segments => ['', slug]) is active only on an
  // exact match; a prefix match would light it up for every nested route.
  if (href.split('/').length === 2) return pathname === href

  return pathname === href || pathname.startsWith(`${href}/`)
}
