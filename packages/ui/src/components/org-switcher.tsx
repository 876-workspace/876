'use client'

import { CheckIcon, ChevronDown } from '../icons'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { buttonVariants } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { OrgAvatar } from './org-avatar'

export type OrgSwitcherOrg = {
  id: string
  name: string | null
  slug: string
  role?: string | null
}

/**
 * Shared presentational organization switcher for app topbars. It shows the
 * current organization's details and the full organization list while leaving
 * navigation, session changes, and data ownership to the consuming app through
 * `onSelect`.
 */
export function OrgSwitcher({
  current,
  orgs,
  onSelect,
  className,
}: {
  current: OrgSwitcherOrg
  orgs: OrgSwitcherOrg[]
  onSelect: (org: OrgSwitcherOrg) => void | Promise<void>
  className?: string
}) {
  const currentName = current.name ?? current.slug

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Switch organization. Current organization: ${currentName}`}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'text-muted-foreground hover:text-foreground h-8 max-w-56 gap-2 rounded-lg px-2',
          className
        )}
      >
        <OrgAvatar name={currentName} size="sm" />
        <span className="text-foreground max-w-36 truncate">{currentName}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 transition-transform group-data-[popup-open]/button:rotate-180"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        <div className="flex items-start gap-3 px-2 py-2">
          <OrgAvatar name={currentName} size="md" />
          <div className="min-w-0 flex-1">
            <span className="text-foreground block text-sm font-semibold break-words">
              {currentName}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              @{current.slug}
            </span>
            {current.role ? (
              <Badge
                variant="secondary"
                className="mt-1 h-4 px-1.5 text-[0.625rem]"
              >
                {current.role}
              </Badge>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>

        {orgs.map((org) => {
          const isCurrent = org.id === current.id
          const displayName = org.name ?? org.slug

          return (
            <DropdownMenuItem
              key={org.id}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(isCurrent && 'font-medium')}
              onClick={() => {
                if (!isCurrent) void onSelect(org)
              }}
            >
              <OrgAvatar name={displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
              {isCurrent ? (
                <CheckIcon aria-hidden="true" className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
