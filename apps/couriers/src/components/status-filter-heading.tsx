'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CheckIcon, ChevronDown } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

export type StatusFilterOption = {
  value: string
  label: string
  headingLabel?: string
}

type Props = {
  /** Fallback label shown when the current value has no matching option (e.g. page title). */
  label: string
  /** The current filter value, resolved server-side from the URL. */
  value: string
  /** Plain serializable option list — no icons or functions (RSC → client boundary). */
  options: StatusFilterOption[]
  /** URL query param name. Defaults to `status`. */
  paramKey?: string
}

/**
 * Zoho-Books-style filterable page heading: the title itself is the filter
 * control. Renders the active option's label with a chevron; clicking opens
 * a dropdown of status options that navigate to `?<paramKey>=<value>`,
 * preserving other query params and resetting pagination cursors.
 *
 * Pass as `ResourceToolbar`'s `titleFilter` prop in place of a plain string
 * `title` on list pages filtered by a lifecycle status. See
 * `.claude/rules/list-filter-header.md`.
 */
export function StatusFilterHeading({
  label,
  value,
  options,
  paramKey = 'status',
}: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(optionValue: string) {
    const params = new URLSearchParams(searchParams)

    params.delete('after')
    params.delete('before')
    if (optionValue === 'all') {
      params.delete(paramKey)
    } else {
      params.set(paramKey, optionValue)
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const activeOption = options.find((option) => option.value === value)

  return (
    <h1 className="text-foreground text-xl font-semibold tracking-tight">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="group hover:text-foreground/80 inline-flex items-center gap-1 outline-none"
          aria-label={`Filter ${label.toLowerCase()} by status`}
        >
          {activeOption?.headingLabel ?? activeOption?.label ?? label}
          <ChevronDown className="text-muted-foreground size-5 shrink-0 transition-transform group-data-[popup-open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-40">
          {options.map((option) => {
            const isActive = option.value === value
            return (
              <DropdownMenuItem
                key={option.value}
                render={
                  <Link
                    href={hrefFor(option.value)}
                    aria-current={isActive ? 'true' : undefined}
                  />
                }
              >
                <span className={cn(isActive && 'font-medium')}>
                  {option.label}
                </span>
                {isActive && <CheckIcon className="ml-auto size-4" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </h1>
  )
}
