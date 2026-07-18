'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@876/core/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { ChevronRight, PanelLeftIcon } from '@876/ui/icons'
import { Logo } from '@876/ui/logo'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@876/ui/sheet'

import {
  consoleNav,
  consoleSettingsItem,
  type ConsoleNavChild,
  type ConsoleNavItem,
} from './console-nav-config'
import { isActiveConsolePath } from './console-nav-link'

const mobileNavItemBase =
  'focus-visible:ring-sidebar-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.9375rem] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'
const mobileNavItemRest =
  'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
const mobileNavItemActive =
  'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)] font-medium shadow-sm ring-1 ring-[var(--876-nav-active-fg)]/15'
const mobileNavIconBase =
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f4] transition-colors dark:bg-white/8'

function accordionValue(item: ConsoleNavItem): string {
  return `${item.title}:${item.href}`
}

function hasRealHref(href: string): boolean {
  return href !== '#'
}

function hasActiveChild(
  pathname: string,
  children: ConsoleNavChild[] = []
): boolean {
  return children.some((child) => isActiveConsolePath(pathname, child.href))
}

export function ConsoleMobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const activeAccordionValues = consoleNav.flatMap((group) =>
    group.items
      .filter((item) => {
        if (!item.children?.length) return false

        const itemActive =
          hasRealHref(item.href) && isActiveConsolePath(pathname, item.href)

        return itemActive || hasActiveChild(pathname, item.children)
      })
      .map(accordionValue)
  )

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
              <Logo className="text-sm leading-none text-[#202124] dark:text-white" />
            </span>
            <SheetTitle className="text-base leading-6 text-[#202124] dark:text-white">
              Console
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Console navigation
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Console sections"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          <Accordion
            key={pathname}
            defaultValue={activeAccordionValues}
            className="gap-5"
          >
            {consoleNav.map((group) => (
              <div
                key={group.label || group.items[0]?.title}
                className="flex flex-col gap-1.5"
              >
                {group.label ? (
                  <div className="px-3 text-[0.6875rem] leading-4 font-medium tracking-[0.04em] text-[#80868b] uppercase dark:text-white/40">
                    {group.label}
                  </div>
                ) : null}

                <div className="flex flex-col gap-1">
                  {group.items.map((item) =>
                    item.children?.length ? (
                      <ConsoleMobileNavSection
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        onNavigate={() => setOpen(false)}
                      />
                    ) : (
                      <ConsoleMobileNavLink
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        onNavigate={() => setOpen(false)}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </Accordion>
        </nav>

        {/* Settings pinned at the bottom, mirroring the desktop sidebar */}
        <div className="border-876-surface-border border-t px-3 py-3">
          <ConsoleMobileNavLink
            item={consoleSettingsItem}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ConsoleMobileNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: ConsoleNavItem
  pathname: string
  onNavigate: () => void
}) {
  const Icon = item.icon
  const isActive = isActiveConsolePath(pathname, item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        mobileNavItemBase,
        isActive ? mobileNavItemActive : mobileNavItemRest
      )}
    >
      <span
        className={cn(
          mobileNavIconBase,
          isActive && 'bg-white/70 dark:bg-white/10'
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-[1.125rem]"
          style={item.color ? { color: item.color } : undefined}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </Link>
  )
}

function ConsoleMobileNavSection({
  item,
  pathname,
  onNavigate,
}: {
  item: ConsoleNavItem
  pathname: string
  onNavigate: () => void
}) {
  const Icon = item.icon
  const itemActive =
    hasRealHref(item.href) && isActiveConsolePath(pathname, item.href)
  const childActive = hasActiveChild(pathname, item.children)
  const isHighlighted = itemActive || childActive

  return (
    <AccordionItem value={accordionValue(item)} className="border-none">
      <AccordionTrigger
        className={cn(
          mobileNavItemBase,
          'group/mission-mobile-trigger items-center border border-transparent font-medium hover:no-underline [&_[data-slot=accordion-trigger-icon]]:hidden',
          isHighlighted ? mobileNavItemActive : mobileNavItemRest
        )}
      >
        <span
          className={cn(
            mobileNavIconBase,
            isHighlighted && 'bg-white/70 dark:bg-white/10'
          )}
        >
          <Icon
            aria-hidden="true"
            className="size-[1.125rem]"
            style={item.color ? { color: item.color } : undefined}
          />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-current/55 transition-transform group-aria-expanded/mission-mobile-trigger:rotate-90"
        />
      </AccordionTrigger>

      <AccordionContent className="px-0 pt-1 pb-1 [&_a]:no-underline">
        <div className="border-876-surface-border ml-7 flex flex-col gap-1 border-l pl-3">
          {hasRealHref(item.href) ? (
            <ConsoleMobileNavSubLink
              href={item.href}
              title="Overview"
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ) : null}

          {item.children?.map((child) => (
            <ConsoleMobileNavSubLink
              key={child.title}
              href={child.href}
              title={child.title}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function ConsoleMobileNavSubLink({
  href,
  title,
  pathname,
  onNavigate,
}: {
  href: string
  title: string
  pathname: string
  onNavigate: () => void
}) {
  const isActive = isActiveConsolePath(pathname, href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-sidebar-ring flex min-h-11 items-center rounded-lg px-3 text-[0.875rem] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
        isActive
          ? 'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
          : 'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/70 dark:hover:bg-white/8'
      )}
    >
      <span className="truncate">{title}</span>
    </Link>
  )
}
