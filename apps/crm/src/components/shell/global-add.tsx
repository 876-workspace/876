'use client'

import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { PlusIcon } from '@876/ui/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { cn } from '@876/ui/lib/utils'

const CREATE_ACTIONS = [
  { label: 'Request', href: '/requests/new' },
  { label: 'Customer', href: '/customers/new' },
]

export function GlobalAdd() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Create new"
        className={cn(
          buttonVariants({ variant: 'info', size: 'icon' }),
          // A filled button reads heavier than the ghost icons beside it, so it
          // is set a step smaller to sit level with them optically.
          'h-7 w-7 rounded-lg shadow-sm'
        )}
      >
        <PlusIcon className="size-3.5" strokeWidth={2.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {CREATE_ACTIONS.map((action) => (
          <DropdownMenuItem
            key={action.href}
            render={<Link href={action.href} />}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
