'use client'

import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  SunMoon,
} from '../icons'
import { useState, type ReactNode } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { SidebarFlagStripe } from './sidebar-flag-stripe'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from './sidebar'
import { ThemeModeToggler } from './theme-mode-toggler'
import { cn } from '../lib/utils'

export type SidebarUserMenuUser = {
  name: string
  email: string
  avatar: string | null
  /** ISO country code for the identity flag stripe; defaults to Jamaica. */
  countryCode?: string | null
}

/**
 * Shared presentational account menu pinned to the sidebar footer. Renders a
 * full-width trigger (avatar + name/email + chevron) with a panel that opens
 * upward (`side="top"`) holding the light/dark theme toggle and a destructive
 * sign-out action.
 *
 * A Popover (not a `role="menu"` dropdown) is used deliberately: the Appearance
 * sub-view holds a `role="radiogroup"` theme toggle, which is invalid as a
 * direct menu child and would not be reachable by a menu's roving focus. A
 * popover is a generic group, so every control stays valid ARIA and
 * Tab-navigable.
 *
 * The panel has two views: the main account list and an "Appearance" sub-screen
 * reached by the Appearance row (with a back button). The view resets to `main`
 * whenever the popover closes.
 *
 * Presentation only: each app passes its own `onSignOut` (the store-clear /
 * client construction stay in the app wiring). The pending state for the
 * sign-out button is owned here.
 */
export function SidebarUserMenu({
  user,
  onSignOut,
  showSystemTheme = true,
  showThemeSwitcher = true,
}: {
  user: SidebarUserMenuUser
  onSignOut: () => Promise<void>
  showSystemTheme?: boolean
  showThemeSwitcher?: boolean
}) {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <UserMenuPopover
            user={user}
            onSignOut={onSignOut}
            showSystemTheme={showSystemTheme}
            showThemeSwitcher={showThemeSwitcher}
            side="top"
            align="start"
            sideOffset={8}
            contentClassName="w-(--anchor-width) min-w-60 gap-2 rounded-xl p-2"
            renderTrigger={({ initials, displayName, displayEmail }) => (
              <PopoverTrigger
                aria-label="Open account menu"
                className="focus-visible:ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-[background-color,color,padding] duration-200 group-data-[collapsible=icon]:px-0 focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <span className="flex items-stretch gap-3 group-data-[collapsible=icon]:gap-2">
                  <SidebarFlagStripe
                    countryCode={user.countryCode}
                    className="h-6 self-center"
                  />
                  <Avatar className="size-8 transition-[width,height] duration-200 group-data-[collapsible=icon]:size-6.5">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-[color-mix(in_oklab,var(--palette-primary)_14%,var(--muted))] text-[0.8125rem] font-semibold text-[color:color-mix(in_oklab,var(--palette-primary)_76%,var(--foreground))]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="text-foreground truncate text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {displayEmail}
                  </span>
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="text-muted-foreground size-4 shrink-0"
                />
              </PopoverTrigger>
            )}
          />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

SidebarUserMenu.displayName = 'SidebarUserMenu'

export function CompactUserMenu({
  user,
  onSignOut,
  className,
  showSystemTheme = true,
  showThemeSwitcher = true,
}: {
  user: SidebarUserMenuUser
  onSignOut: () => Promise<void>
  className?: string
  showSystemTheme?: boolean
  showThemeSwitcher?: boolean
}) {
  return (
    <UserMenuPopover
      user={user}
      onSignOut={onSignOut}
      showSystemTheme={showSystemTheme}
      showThemeSwitcher={showThemeSwitcher}
      side="bottom"
      align="end"
      sideOffset={8}
      contentClassName="w-72 max-w-[calc(100vw-1rem)] gap-2 rounded-xl p-2"
      renderTrigger={({ initials }) => (
        <PopoverTrigger
          aria-label="Open account menu"
          className={cn(
            'focus-visible:ring-sidebar-ring flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:outline-hidden data-popup-open:bg-[#f1f3f4] dark:hover:bg-white/8 dark:data-popup-open:bg-white/8',
            className
          )}
        >
          <Avatar className="size-8">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
            <AvatarFallback className="bg-[color-mix(in_oklab,var(--palette-primary)_14%,var(--muted))] text-[0.8125rem] font-semibold text-[color:color-mix(in_oklab,var(--palette-primary)_76%,var(--foreground))]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </PopoverTrigger>
      )}
    />
  )
}

CompactUserMenu.displayName = 'CompactUserMenu'

type UserMenuPopoverProps = {
  user: SidebarUserMenuUser
  onSignOut: () => Promise<void>
  side: 'top' | 'bottom'
  align: 'start' | 'end'
  sideOffset: number
  contentClassName: string
  showSystemTheme?: boolean
  showThemeSwitcher?: boolean
  renderTrigger: (state: {
    initials: string
    displayName: string
    displayEmail: string
  }) => ReactNode
}

function UserMenuPopover({
  user,
  onSignOut,
  side,
  align,
  sideOffset,
  contentClassName,
  showSystemTheme = true,
  showThemeSwitcher = true,
  renderTrigger,
}: UserMenuPopoverProps) {
  const [pending, setPending] = useState(false)
  const [view, setView] = useState<'main' | 'appearance'>('main')
  const initials = getInitials(user.name, user.email)
  const displayName = shorten(user.name)
  const displayEmail = shorten(user.email)

  async function handleSignOut() {
    if (pending) return
    setPending(true)
    try {
      await onSignOut()
    } finally {
      setPending(false)
    }
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setView('main')
      }}
    >
      {renderTrigger({ initials, displayName, displayEmail })}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={contentClassName}
      >
        {view === 'main' ? (
          <>
            <div className="px-2 py-1.5">
              <span className="text-foreground block truncate text-[0.8125rem] font-semibold">
                {user.name}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {user.email}
              </span>
            </div>

            {showThemeSwitcher && (
              <button
                type="button"
                onClick={() => setView('appearance')}
                className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <SunMoon aria-hidden="true" />
                <span className="flex-1 text-left">Appearance</span>
                <ChevronRight
                  aria-hidden="true"
                  className="text-muted-foreground"
                />
              </button>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={() => void handleSignOut()}
              className="text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0"
            >
              <LogOut aria-hidden="true" />
              {pending ? 'Signing out...' : 'Sign out'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView('main')}
              aria-label="Back to account menu"
              className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-hidden [&_svg]:size-4 [&_svg]:shrink-0"
            >
              <ChevronLeft aria-hidden="true" />
              Appearance
            </button>
            <div className="px-1 pb-1">
              <ThemeModeToggler showSystem={showSystemTheme} />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Hard-cap the trigger's name/email at 15 characters with an ellipsis so the
 * footer label stays compact regardless of available width. The popover panel
 * keeps the full values.
 */
function shorten(value: string, max = 15): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim()
  const words = source.split(/\s+/).filter(Boolean)

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()

  return source.slice(0, 2).toUpperCase()
}
