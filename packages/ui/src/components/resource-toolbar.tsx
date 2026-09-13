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

const STANDARD_TRANSFER_ACTIONS: DropdownAction[] = [
  { label: 'Import', icon: 'import', disabled: true },
  { label: 'Export', icon: 'export', disabled: true },
]

export type DropdownActionIcon = keyof typeof ACTION_ICONS

export type DropdownAction = {
  label: string
  icon?: DropdownActionIcon
  onClick?: () => void
  /** Navigate to this URL when clicked (serializable — usable from server components). */
  href?: string
  /** Render a separator above this item. */
  separator?: boolean
  /** Render in destructive/red style. */
  destructive?: boolean
  /** Keep the action visible when its capability is not available yet. */
  disabled?: boolean
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
  /** Render the primary action as an icon-only button. */
  primaryIconOnly?: boolean
  primaryDisabled?: boolean
  primaryVariant?:
    'default' | 'brand' | 'outline' | 'info' | 'success' | 'warning'
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
  primaryIconOnly = false,
  primaryDisabled = false,
  primaryVariant = 'default',
  primaryHref,
  onPrimaryAction,
  dropdownActions = [],
  refresh = false,
}: Props) {
  const router = useRouter()

  const transferActions = refresh
    ? STANDARD_TRANSFER_ACTIONS.filter(
        (standardAction) =>
          !dropdownActions.some((action) => action.icon === standardAction.icon)
      )
    : []
  const actions = [...transferActions, ...dropdownActions]

  const primaryButton = primaryLabel ? (
    primaryHref ? (
      <Link
        href={primaryDisabled ? '#' : primaryHref}
        aria-disabled={primaryDisabled}
        aria-label={primaryIconOnly ? primaryLabel : undefined}
        tabIndex={primaryDisabled ? -1 : undefined}
        className={cn(
          buttonVariants({
            variant: primaryVariant,
            size: primaryIconOnly ? 'icon-sm' : 'sm',
          }),
          primaryDisabled && 'pointer-events-none opacity-60'
        )}
      >
        <Plus className="size-4" strokeWidth={2.25} />
        {primaryIconOnly ? null : primaryLabel}
      </Link>
    ) : (
      <Button
        variant={primaryVariant}
        disabled={primaryDisabled}
        className="disabled:opacity-60"
        onClick={onPrimaryAction}
        aria-label={primaryIconOnly ? primaryLabel : undefined}
        size={primaryIconOnly ? 'icon-sm' : 'sm'}
      >
        <Plus className="size-4" strokeWidth={2.25} />
        {primaryIconOnly ? null : primaryLabel}
      </Button>
    )
  ) : null

  const hasDropdown = refresh || actions.length > 0

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
              {refresh && actions.length > 0 && <DropdownMenuSeparator />}
              {actions.map((action) => {
                const Icon = action.icon ? ACTION_ICONS[action.icon] : null
                return (
                  <React.Fragment key={action.label}>
                    {action.separator && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      variant={action.destructive ? 'destructive' : 'default'}
                      disabled={action.disabled}
                      onClick={action.onClick}
                      render={
                        action.href && !action.disabled ? (
                          <Link href={action.href} />
                        ) : undefined
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
