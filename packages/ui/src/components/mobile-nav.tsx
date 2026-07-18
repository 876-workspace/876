'use client'

import { createElement, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { PanelLeftIcon } from '../icons'
import { cn } from '../lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type MobileNavChild = {
  title: string
  href: string
}

export type MobileNavItem = {
  title: string
  href: string
  /** Lucide-style component or any ReactNode factory. */
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
  color?: string
  children?: MobileNavChild[]
}

export type MobileNavGroup = {
  label?: string
  items: MobileNavItem[]
}

type MobileNavDropdownProps = {
  groups: MobileNavGroup[]
  /** Determines whether a given href is the active route. Defaults to prefix matching. */
  isActive?: (pathname: string, href: string) => boolean
  className?: string
}

function defaultIsActive(pathname: string, href: string): boolean {
  if (href === '#') return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Shared mobile navigation dropdown — renders a hamburger trigger that opens
 * a grouped dropdown menu driven by a `MobileNavGroup[]` config. Designed for
 * the top-left header slot on small screens.
 */
export function MobileNavDropdown({
  groups,
  isActive = defaultIsActive,
  className,
}: MobileNavDropdownProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'focus-visible:ring-sidebar-ring flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:hover:bg-white/8',
          className
        )}
        aria-label="Open navigation"
      >
        <PanelLeftIcon className="size-5 text-[#3c4043] dark:text-white/75" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        {groups.map((group, groupIndex) => (
          <DropdownMenuGroup key={group.label ?? groupIndex}>
            {group.label ? (
              <DropdownMenuLabel className="text-[0.6875rem] font-medium tracking-[0.04em] text-[#80868b] uppercase dark:text-white/40">
                {group.label}
              </DropdownMenuLabel>
            ) : null}

            {group.items.map((item) =>
              item.children?.length ? (
                <DropdownMenuSub key={item.title}>
                  <DropdownMenuSubTrigger
                    className={cn(
                      'gap-2.5',
                      isActive(pathname, item.href) &&
                        'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)]'
                    )}
                  >
                    {item.icon &&
                      createElement(item.icon, {
                        className: 'size-[1.0625rem] shrink-0',
                        style: item.color ? { color: item.color } : undefined,
                      })}
                    {item.title}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {item.children.map((child) => (
                      <DropdownMenuItem
                        key={child.href}
                        onClick={() => router.push(child.href)}
                        aria-current={
                          isActive(pathname, child.href) ? 'page' : undefined
                        }
                        className={cn(
                          isActive(pathname, child.href) &&
                            'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
                        )}
                      >
                        {child.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : (
                <DropdownMenuItem
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  aria-current={
                    isActive(pathname, item.href) ? 'page' : undefined
                  }
                  className={cn(
                    'gap-2.5',
                    isActive(pathname, item.href) &&
                      'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
                  )}
                >
                  {item.icon &&
                    createElement(item.icon, {
                      className: 'size-[1.0625rem] shrink-0',
                      style: item.color ? { color: item.color } : undefined,
                    })}
                  {item.title}
                </DropdownMenuItem>
              )
            )}

            {groupIndex < groups.length - 1 && <DropdownMenuSeparator />}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
