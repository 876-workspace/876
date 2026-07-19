'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  MoreHorizontalIcon,
  Plus,
  RefreshCw,
  Trash,
} from '../icons'
import { cn } from '../lib/utils'
import { Button, buttonVariants } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

const ACTION_ICONS = {
  import: ArrowUpFromLine,
  export: ArrowDownFromLine,
  delete: Trash,
} as const

export type DropdownActionIcon = keyof typeof ACTION_ICONS

export type DropdownAction = {
  label: string
  icon?: DropdownActionIcon
  /** Navigate to this URL when the item is selected. */
  href?: string
  onClick?: () => void
  /** Render a separator above this item. */
  separator?: boolean
  /** Render in destructive/red style. */
  destructive?: boolean
}

type Props = {
  title: string
  /**
   * Renders in place of the plain `title` heading — e.g. a filterable
   * heading control. Keeps the same layout slot; the right-side actions are
   * unaffected. `title` is still required (used as the fallback label).
   */
  titleFilter?: React.ReactNode
  description?: string
  primaryLabel?: string
  primaryDisabled?: boolean
  primaryVariant?:
    | 'default'
    | 'brand'
    | 'outline'
    | 'info'
    | 'success'
    | 'warning'
  /** Navigate to this URL when the primary button is clicked. */
  primaryHref?: string
  /** Called when the primary button is clicked (ignored if primaryHref is set). */
  onPrimaryAction?: () => void
  dropdownActions?: DropdownAction[]
  /** Add a Refresh item to the dropdown that calls router.refresh(). */
  refresh?: boolean
}

export function ResourceToolbar({
  title,
  titleFilter,
  description,
  primaryLabel,
  primaryDisabled = false,
  primaryVariant = 'default',
  primaryHref,
  onPrimaryAction,
  dropdownActions = [],
  refresh = false,
}: Props) {
  const router = useRouter()

  const primaryButton = primaryLabel ? (
    primaryHref ? (
      <Link
        href={primaryDisabled ? '#' : primaryHref}
        aria-disabled={primaryDisabled}
        tabIndex={primaryDisabled ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: primaryVariant, size: 'sm' }),
          primaryDisabled && 'pointer-events-none opacity-60'
        )}
      >
        <Plus className="size-4" strokeWidth={2.25} />
        {primaryLabel}
      </Link>
    ) : (
      <Button
        variant={primaryVariant}
        size="sm"
        disabled={primaryDisabled}
        className="disabled:opacity-60"
        onClick={onPrimaryAction}
      >
        <Plus className="size-4" strokeWidth={2.25} />
        {primaryLabel}
      </Button>
    )
  ) : null

  const hasDropdown = refresh || dropdownActions.length > 0

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        {titleFilter ?? <h1 className="876-page-title">{title}</h1>}
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {primaryButton}

        {hasDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' })
              )}
              aria-label="More actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              {refresh && (
                <DropdownMenuItem onClick={() => router.refresh()}>
                  <RefreshCw className="size-4" />
                  Refresh
                </DropdownMenuItem>
              )}
              {refresh && dropdownActions.length > 0 && (
                <DropdownMenuSeparator />
              )}
              {dropdownActions.map((action) => {
                const Icon = action.icon ? ACTION_ICONS[action.icon] : null
                return (
                  <React.Fragment key={action.label}>
                    {action.separator && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      variant={action.destructive ? 'destructive' : 'default'}
                      onClick={action.onClick}
                      render={
                        action.href ? <Link href={action.href} /> : undefined
                      }
                    >
                      {Icon && <Icon className="size-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
