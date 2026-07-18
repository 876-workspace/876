'use client'

import { Monitor, Moon, Sun } from '../icons'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { cn } from '../lib/utils'

export function ThemeModeToggler({
  showSystem = true,
}: {
  showSystem?: boolean
}) {
  // `theme` is the user's explicit choice ('light' | 'dark' | 'system'); the
  // selection state keys off it directly so "System" is its own distinct,
  // re-selectable option that follows the OS preference.
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  const cols = showSystem ? 'grid-cols-3' : 'grid-cols-2'

  if (!mounted) {
    return (
      <div className={`grid ${cols} gap-2`}>
        <div className="bg-muted/50 h-24 animate-pulse rounded-md border" />
        <div className="bg-muted/50 h-24 animate-pulse rounded-md border" />
        {showSystem && (
          <div className="bg-muted/50 h-24 animate-pulse rounded-md border" />
        )}
      </div>
    )
  }

  const optionClassName = (selected: boolean) =>
    cn(
      'hover:bg-accent focus-visible:ring-ring rounded-md border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      selected && 'ring-primary ring-2'
    )

  return (
    <div
      className={`grid ${cols} gap-2`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={optionClassName(theme === 'light')}
        aria-label="Light theme"
      >
        <div className="bg-background space-y-2 rounded border p-2">
          <div className="bg-foreground/20 h-2 w-3/4 rounded" />
          <div className="bg-foreground/20 h-2 w-1/2 rounded" />
        </div>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium">
          <Sun className="size-3" aria-hidden="true" />
          Light
        </p>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={optionClassName(theme === 'dark')}
        aria-label="Dark theme"
      >
        <div className="space-y-2 rounded border border-zinc-700 bg-zinc-900 p-2">
          <div className="h-2 w-3/4 rounded bg-zinc-700" />
          <div className="h-2 w-1/2 rounded bg-zinc-700" />
        </div>
        <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium">
          <Moon className="size-3" aria-hidden="true" />
          Dark
        </p>
      </button>

      {showSystem && (
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'system'}
          onClick={() => setTheme('system')}
          className={optionClassName(theme === 'system')}
          aria-label="System theme"
        >
          <div className="flex overflow-hidden rounded border">
            <div className="bg-background w-1/2 space-y-2 p-2">
              <div className="bg-foreground/20 h-2 w-3/4 rounded" />
              <div className="bg-foreground/20 h-2 w-1/2 rounded" />
            </div>
            <div className="w-1/2 space-y-2 bg-zinc-900 p-2">
              <div className="h-2 w-3/4 rounded bg-zinc-700" />
              <div className="h-2 w-1/2 rounded bg-zinc-700" />
            </div>
          </div>
          <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium">
            <Monitor className="size-3" aria-hidden="true" />
            System
          </p>
        </button>
      )}
    </div>
  )
}

ThemeModeToggler.displayName = 'ThemeModeToggler'

function subscribe() {
  return () => {}
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}
