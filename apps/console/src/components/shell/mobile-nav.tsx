'use client'

import { useState } from 'react'
import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import { cn } from '@876/core/utils'
import { ChevronsLeft, MenuIcon } from '@876/ui/icons'
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

import { NavIcon, resolveNavIconColor } from '@/components/shell/nav-icons'
import { isActiveConsolePath } from '@/components/shell/nav-link'
import { navContexts } from '@/components/shell/nav-contexts'
import {
  entryOpensContext,
  resolveActiveEntryKey,
  resolveSidebarBackContext,
  resolveSidebarContextStack,
  sidebarContexts,
  type SidebarContext,
  type SidebarContextDefinition,
} from '@/components/shell/sidebar-context'

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

/**
 * The mobile sheet mirrors the desktop rail's context stack.
 *
 * It stays a sheet rather than becoming a rail — there is no gutter to float a
 * rail in on a phone — but the level it shows, the back target, and the
 * reopen-after-back behaviour are resolved by the same functions, so the two
 * cannot disagree about which context a path belongs to.
 */
export function MobileNav({
  navigation,
  contexts = navContexts,
}: {
  navigation: readonly NavGroupDefinition[]
  contexts?: readonly SidebarContextDefinition[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<DismissedContext | null>(null)
  const stack = resolveSidebarContextStack(pathname, navigation, contexts)
  const allContexts = sidebarContexts(navigation, contexts)

  const derived = stack[stack.length - 1] ?? stack[0]
  const dismissedBack =
    dismissed && dismissed.pathname === pathname
      ? resolveSidebarBackContext(stack, dismissed.key)
      : null
  const context = dismissedBack ?? derived
  if (!context) return null

  const parent = resolveSidebarBackContext(stack, context.key)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
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
            <SheetTitle className="text-sidebar-foreground text-base leading-6">
              {context.title}
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
          <MobileContextBody
            context={context}
            contexts={allContexts}
            parent={parent}
            pathname={pathname}
            onBack={() => setDismissed({ key: context.key, pathname })}
            onOpenContext={() => setDismissed(null)}
            onNavigate={() => setOpen(false)}
          />
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileContextBody({
  context,
  contexts,
  parent,
  pathname,
  onBack,
  onOpenContext,
  onNavigate,
}: {
  context: SidebarContext
  contexts: readonly SidebarContext[]
  parent: SidebarContext | null
  pathname: string
  onBack: () => void
  onOpenContext: () => void
  onNavigate: () => void
}) {
  const activeKey = resolveActiveEntryKey(pathname, context)

  return (
    <div className="flex flex-col gap-1">
      {parent ? (
        <button
          type="button"
          onClick={onBack}
          className="text-foreground hover:bg-muted/70 focus-visible:ring-sidebar-ring mb-2 flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <ChevronsLeft aria-hidden="true" className="size-4" />
          {`Back to ${parent.backLabel}`}
        </button>
      ) : null}

      {context.groups.map((group, index) => (
        <div key={group.key} className="flex flex-col gap-1">
          {index > 0 ? (
            <div className="border-876-surface-border my-2 border-t" />
          ) : null}
          {group.entries.map((item) => (
            <MobileNavLink
              key={item.key}
              item={item}
              isActive={
                activeKey === null
                  ? isActiveConsolePath(pathname, item.href)
                  : item.key === activeKey
              }
              onOpenContext={
                entryOpensContext(item, contexts) ? onOpenContext : undefined
              }
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MobileNavLink({
  item,
  onOpenContext,
  onNavigate,
  isActive,
}: {
  item: NavEntry
  onOpenContext?: () => void
  onNavigate: () => void
  isActive: boolean
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
          className={cn(
            'size-[1.125rem]',
            item.colorClassName ?? resolveNavIconColor(item.icon)
          )}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </Link>
  )
}
