'use client'

import { useState } from 'react'
import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ArrowLeft, PanelLeftIcon } from '@876/ui/icons'
import { Logo } from '@876/ui/logo'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@876/ui/sheet'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NavIcon } from '@/components/shell/nav-icons'
import { isActiveConsolePath } from '@/components/shell/nav-link'
import {
  resolveActiveChildKey,
  resolveSidebarContextStack,
  type SidebarContext,
} from '@/components/shell/sidebar-sections'

const mobileNavItemBase =
  'focus-visible:ring-sidebar-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
const mobileNavItemRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
const mobileNavItemActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium shadow-sm ring-1 ring-[var(--876-nav-active-fg)]/15'
const mobileNavIconBase =
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f4] transition-colors dark:bg-white/8'

type DismissedContext = {
  key: string
  pathname: string
}

export function MobileNav({
  navigation,
  contexts = [],
}: {
  navigation: readonly NavGroupDefinition[]
  contexts?: readonly SidebarContext[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [dismissedContext, setDismissedContext] = useState<DismissedContext | null>(
    null
  )
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const derivedIndex = stack.length - 1
  const dismissedIndex =
    dismissedContext?.pathname === pathname
      ? stack.findIndex((item) => item.key === dismissedContext.key)
      : -1
  const visibleIndex =
    dismissedIndex > 0 ? dismissedIndex - 1 : derivedIndex
  const visibleContext = stack[visibleIndex] ?? stack[0]!

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
        className="focus-visible:ring-sidebar-ring flex size-11 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#3c4043] transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden dark:text-white/75 dark:hover:bg-white/8"
      >
        <PanelLeftIcon aria-hidden="true" className="size-5" />
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
            <SheetTitle className="text-sidebar-foreground text-base leading-6">
              {visibleContext.kind === 'platform' ? 'Console' : visibleContext.title}
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Console navigation
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Console navigation"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          {visibleContext.kind === 'platform' ? (
            <PlatformMobileContext
              context={visibleContext}
              pathname={pathname}
              onOpenContext={() => setDismissedContext(null)}
              onNavigate={() => setOpen(false)}
            />
          ) : (
            <NestedMobileContext
              context={visibleContext}
              pathname={pathname}
              onBack={() => setDismissedContext({ key: visibleContext.key, pathname })}
              onNavigate={() => setOpen(false)}
            />
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function PlatformMobileContext({
  context,
  pathname,
  onOpenContext,
  onNavigate,
}: {
  context: SidebarContext
  pathname: string
  onOpenContext: () => void
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {context.entries.map((item) => (
        <MobileNavLink
          key={item.key}
          item={item}
          pathname={pathname}
          onOpenContext={item.children?.length ? onOpenContext : undefined}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

function NestedMobileContext({
  context,
  pathname,
  onBack,
  onNavigate,
}: {
  context: SidebarContext
  pathname: string
  onBack: () => void
  onNavigate: () => void
}) {
  const activeChildKey = resolveActiveChildKey(pathname, context)

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onBack}
        className="text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring mb-2 flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Console
      </button>
      {context.entries.map((child) => (
        <MobileNavLink
          key={child.key}
          item={child}
          pathname={pathname}
          isActive={child.key === activeChildKey}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

function MobileNavLink({
  item,
  pathname,
  onOpenContext,
  onNavigate,
  isActive = isActiveConsolePath(pathname, item.href),
}: {
  item: NavEntry
  pathname: string
  onOpenContext?: () => void
  onNavigate: () => void
  isActive?: boolean
}) {
  return (
    <Link
      href={item.href}
      onClick={() => {
        onOpenContext?.()
        onNavigate()
      }}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        mobileNavItemBase,
        isActive ? mobileNavItemActive : mobileNavItemRest
      )}
    >
      <span
        className={cn(
          mobileNavIconBase,
          isActive &&
            cn(
              'ring-1 ring-inset',
              item.activeClassName ?? 'bg-white/70 dark:bg-white/10'
            )
        )}
      >
        <NavIcon
          icon={item.icon}
          className={cn('size-[1.125rem]', item.colorClassName)}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </Link>
  )
}
