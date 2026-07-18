'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowDownFromLine, MoreHorizontalIcon, Plus } from '@876/ui/icons'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

/**
 * Renders the Add/more-actions buttons inline with the Users/Roles tabs, so
 * the list pages don't need their own title row underneath. Gated to the
 * exact list routes so it doesn't leak onto /new or /[id] detail pages that
 * also inherit this layout.
 */
export function TeamSectionActions() {
  const pathname = usePathname()

  if (pathname === '/settings/users') {
    return (
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <Link
          href="/settings/users/new"
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            <DropdownMenuItem>
              <ArrowDownFromLine className="size-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (pathname === '/settings/users/roles') {
    return (
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <Link
          href="/settings/users/roles/new"
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            <DropdownMenuItem>
              <ArrowDownFromLine className="size-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return null
}
