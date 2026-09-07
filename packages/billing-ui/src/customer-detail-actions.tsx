'use client'

import { Fragment, type ReactNode } from 'react'
import { ChevronDownIcon, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

/** One create route the customer's toolbar can start a document from. */
export type CustomerTransactionAction = {
  label: string
  href: string
}

/** A titled cluster of create routes, rendered as one menu section. */
export type CustomerTransactionGroup = {
  /** Section heading. Omit for an unlabelled section. */
  label?: string
  actions: CustomerTransactionAction[]
}

export type CustomerDetailActionsProps = {
  /** Where the pencil goes. Omit to hide the Edit button. */
  editHref?: string
  /**
   * Menu sections for "New Transaction". Hosts pass only the document kinds
   * they actually route to, so Billing may offer more than Invoice does.
   */
  transactionGroups?: CustomerTransactionGroup[]
  /**
   * Host-owned overflow (the `···` menu). Rendered last so each app keeps
   * ownership of its own destructive and app-specific actions.
   */
  overflow?: ReactNode
  /** The link element type, so a host can pass its router-aware link. */
  linkComponent?: React.ElementType
}

export function CustomerDetailActions({
  editHref,
  transactionGroups = [],
  overflow,
  linkComponent: Link = 'a',
}: CustomerDetailActionsProps) {
  const groups = transactionGroups.filter((group) => group.actions.length > 0)

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
      {editHref ? (
        <Link
          href={editHref}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
      ) : null}

      {groups.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: 'info', size: 'sm' }))}
          >
            New Transaction
            <ChevronDownIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-52">
            {groups.map((group, index) => (
              <Fragment key={group.label ?? index}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                {group.label ? (
                  <DropdownMenuLabel className="uppercase">
                    {group.label}
                  </DropdownMenuLabel>
                ) : null}
                {group.actions.map((action) => (
                  <DropdownMenuItem
                    key={action.href}
                    render={<Link href={action.href} />}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {overflow}
    </div>
  )
}
