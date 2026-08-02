'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'

export type ViewOption<T extends string> = {
  value: T
  label: string
  icon: IconComponent
}

type Props<T extends string> = {
  /** Currently active view (resolved server-side from the URL). */
  value: T
  options: ViewOption<T>[]
  /** Search-param key the switch writes to. Defaults to `view`. */
  paramKey?: string
}

/**
 * Segmented control that persists the active layout in the URL (`?view=…`).
 * SSR-friendly and shareable — the server reads the same param to render the
 * matching view. Generic so it can drive any list page (contacts, tickets, …).
 */
export function ViewSwitcher<T extends string>({
  value,
  options,
  paramKey = 'view',
}: Props<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const select = useCallback(
    (next: T) => {
      if (next === value) return
      const params = new URLSearchParams(searchParams)
      params.set(paramKey, next)
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, pathname, searchParams, paramKey, value]
  )

  return (
    <div
      role="tablist"
      aria-label="Change layout"
      data-pending={isPending ? '' : undefined}
      className="bg-muted/60 inline-flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.label}
            aria-label={option.label}
            onClick={() => select(option.value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
              active
                ? 'bg-background text-foreground shadow-876-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
