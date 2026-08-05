'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@876/core/utils'

import {
  resolveUserViewVariant,
  USER_VIEW_VARIANT_OPTIONS,
  type UserViewVariant,
} from '../_lib/variant'

/**
 * Segmented control that swaps the user detail layout via `?variant=`.
 *
 * Writes to the URL the same way `ViewSwitcher` and the list status filters do,
 * so the choice survives a refresh and a shared link opens on the same layout —
 * which is the whole point of a side-by-side evaluation.
 *
 * It reads the active variant itself rather than taking it as a prop, because it
 * renders from the segment layout and a layout never receives `searchParams`.
 * It also renders nothing off the overview route: the variant only changes that
 * page, and a control that visibly does nothing on the Audit tab is worse than
 * no control at all.
 */
export function VariantSwitcher({ base }: { base: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const value = resolveUserViewVariant(searchParams.get('variant'))

  const select = useCallback(
    (next: UserViewVariant) => {
      if (next === value) return

      const params = new URLSearchParams(searchParams)
      params.set('variant', next)

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, pathname, searchParams, value]
  )

  if (pathname !== base) return null

  return (
    <div
      role="tablist"
      aria-label="Change layout"
      data-pending={isPending ? '' : undefined}
      className="bg-muted/60 inline-flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {USER_VIEW_VARIANT_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.hint}
            onClick={() => select(option.value)}
            className={cn(
              'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
              active
                ? 'bg-background text-foreground shadow-876-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
