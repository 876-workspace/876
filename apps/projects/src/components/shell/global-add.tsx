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
  { label: 'Issue', href: '/issues/new' },
  { label: 'Project', href: '/projects/new' },
]

function CreateMenuTrigger({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Create new" className={className}>
        {children}
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

export function GlobalAdd() {
  return (
    <CreateMenuTrigger
      className={cn(
        buttonVariants({ variant: 'info', size: 'icon' }),
        // A filled button reads heavier than the ghost icons beside it, so it
        // is set a step smaller to sit level with them optically.
        'h-7 w-7 rounded-lg shadow-sm'
      )}
    >
      <PlusIcon className="size-3.5" strokeWidth={2.5} />
    </CreateMenuTrigger>
  )
}

export function FloatingGlobalAdd() {
  return (
    <CreateMenuTrigger
      className={cn(
        buttonVariants({ variant: 'info', size: 'icon' }),
        'fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90 sm:hidden'
      )}
    >
      <PlusIcon className="size-7" strokeWidth={2.5} />
    </CreateMenuTrigger>
  )
}
