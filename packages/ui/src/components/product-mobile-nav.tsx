'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { NavEntry, NavGroupDefinition } from '@876/core/access'

import {
  ChevronDown,
  ChevronsLeft,
  MenuIcon,
  type IconComponent,
} from '../icons'
import { cn } from '../lib/utils'
import { Logo } from './logo'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

const mobileNavItemBase =
  'focus-visible:ring-sidebar-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
const mobileNavItemRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
const mobileNavItemActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium shadow-sm ring-1 ring-[var(--876-nav-active-fg)]/15'
const mobileNavIconBase =
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f4] transition-colors dark:bg-white/8'

type BackAction = {
  label: string
  onClick: () => void
}

type ProductMobileNavProps = {
  title: string
  accessibleTitle?: string
  subtitle?: string
  navigation: readonly NavGroupDefinition[]
  resolveIcon: (key: string) => IconComponent
  resolveIconColor?: (key: string) => string
  isActive?: (item: NavEntry, pathname: string) => boolean
  onNavigate?: (item: NavEntry) => void
  backAction?: BackAction
  expandChildren?: boolean
  ariaLabel?: string
  triggerLabel?: string
}

export function ProductMobileNav({
  title,
  accessibleTitle,
  subtitle,
  navigation,
  resolveIcon,
  resolveIconColor,
  isActive,
  onNavigate,
  backAction,
  expandChildren = true,
  ariaLabel = `${title} navigation`,
  triggerLabel = `Open ${title} navigation`,
}: ProductMobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const resolvedAccessibleTitle = accessibleTitle ?? title

  const handleNavigate = (item: NavEntry) => {
    onNavigate?.(item)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={triggerLabel}
        className="focus-visible:ring-sidebar-ring flex size-11 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#3c4043] transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:text-white/75 dark:hover:bg-white/8"
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="left"
        className="876-surface border-876-surface-border bg-876-surface w-[min(22rem,calc(100vw-1rem))] max-w-none gap-0 overflow-hidden p-0 shadow-[0_18px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
      >
        <SheetHeader className="border-876-surface-border border-b px-4 py-4 pr-14">
          <div className="flex items-center gap-3">
            <span className="border-876-surface-border bg-876-canvas flex size-9 shrink-0 items-center justify-center rounded-xl border">
              <Logo className="text-sidebar-foreground text-[0.8125rem] leading-none" />
            </span>
            <div className="min-w-0">
              <SheetTitle
                className={cn(
                  'text-sidebar-foreground truncate text-base leading-6',
                  !title && 'sr-only'
                )}
              >
                {title || resolvedAccessibleTitle}
              </SheetTitle>
              <SheetDescription
                className={cn(subtitle ? 'truncate text-xs' : 'sr-only')}
              >
                {subtitle ?? `Navigate ${resolvedAccessibleTitle}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav
          aria-label={ariaLabel}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          <div className="flex flex-col gap-1">
            {backAction ? (
              <button
                type="button"
                onClick={backAction.onClick}
                className="text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring mb-2 flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <ChevronsLeft aria-hidden="true" className="size-4" />
                {backAction.label}
              </button>
            ) : null}

            {navigation.map((group, groupIndex) => (
              <div key={group.key} className="flex flex-col gap-1">
                {groupIndex > 0 ? (
                  <div className="border-876-surface-border my-2 border-t" />
                ) : null}
                {group.label ? (
                  <div className="text-muted-foreground px-3 pt-1 pb-1.5 text-xs font-medium">
                    {group.label}
                  </div>
                ) : null}
                {group.entries.map((item) => (
                  <ProductMobileNavItem
                    key={`${item.key}:${pathname}`}
                    item={item}
                    pathname={pathname}
                    resolveIcon={resolveIcon}
                    resolveIconColor={resolveIconColor}
                    isActive={isActive}
                    onNavigate={handleNavigate}
                    expandChildren={expandChildren}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function ProductMobileNavItem({
  item,
  pathname,
  resolveIcon,
  resolveIconColor,
  isActive,
  onNavigate,
  expandChildren,
}: {
  item: NavEntry
  pathname: string
  resolveIcon: (key: string) => IconComponent
  resolveIconColor?: (key: string) => string
  isActive?: (item: NavEntry, pathname: string) => boolean
  onNavigate: (item: NavEntry) => void
  expandChildren: boolean
}) {
  const Icon = resolveIcon(item.icon)
  const hasChildren = expandChildren && Boolean(item.children?.length)
  const active = isNavEntryActive(pathname, item, isActive)
  const childrenId = useId()
  const [expanded, setExpanded] = useState(active)

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={() => onNavigate(item)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          mobileNavItemBase,
          active ? mobileNavItemActive : mobileNavItemRest
        )}
      >
        <MobileNavIcon
          icon={Icon}
          colorClassName={
            item.colorClassName ?? resolveIconColor?.(item.icon)
          }
          activeClassName={item.activeClassName}
          active={active}
        />
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={childrenId}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          mobileNavItemBase,
          active ? mobileNavItemActive : mobileNavItemRest
        )}
      >
        <MobileNavIcon
          icon={Icon}
          colorClassName={
            item.colorClassName ?? resolveIconColor?.(item.icon)
          }
          activeClassName={item.activeClassName}
          active={active}
        />
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded ? (
        <div id={childrenId} className="ml-11 flex flex-col gap-1">
          {item.children?.map((child) => {
            const childActive = isNavEntryActive(pathname, child, isActive)

            return (
              <Link
                key={child.key}
                href={child.href}
                onClick={() => onNavigate(child)}
                aria-current={childActive ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-sidebar-ring flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                  childActive
                    ? 'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
                    : mobileNavItemRest
                )}
              >
                <span className="min-w-0 flex-1 truncate">{child.title}</span>
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function MobileNavIcon({
  icon: Icon,
  colorClassName,
  activeClassName,
  active,
}: {
  icon: IconComponent
  colorClassName?: string
  activeClassName?: string
  active: boolean
}) {
  return (
    <span
      className={cn(
        mobileNavIconBase,
        active &&
          cn(
            'ring-1 ring-inset',
            activeClassName ?? 'bg-white/70 dark:bg-white/10'
          )
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-[1.125rem]', colorClassName)}
      />
    </span>
  )
}

function isNavEntryActive(
  pathname: string,
  item: NavEntry,
  isActive?: (item: NavEntry, pathname: string) => boolean
): boolean {
  if (isActive ? isActive(item, pathname) : isActivePath(pathname, item.href))
    return true

  return (
    item.children?.some((child) => isNavEntryActive(pathname, child, isActive)) ??
    false
  )
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '#') return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
