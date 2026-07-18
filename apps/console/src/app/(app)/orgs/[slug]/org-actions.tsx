'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownFromLine,
  MoreHorizontalIcon,
  Pencil,
  Trash,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

import type { AdminOrganization } from '@876/admin'
import { DeleteOrgDialog } from './delete-org-dialog'
import { PurgeOrgDialog } from './purge-org-dialog'

type Props = { org: AdminOrganization }

export function OrgActions({ org }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const isDeleted = org.deleted_at !== null

  const destructiveItems = isDeleted ? (
    <DropdownMenuItem variant="destructive" onClick={() => setPurgeOpen(true)}>
      <Trash className="size-4" />
      Purge
    </DropdownMenuItem>
  ) : (
    <>
      <DropdownMenuItem
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash className="size-4" />
        Delete
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onClick={() => setPurgeOpen(true)}
      >
        <Trash className="size-4" />
        Purge
      </DropdownMenuItem>
    </>
  )

  return (
    <>
      <div className="flex w-full items-center justify-center gap-4 pt-1 sm:hidden">
        <Link
          href={`/orgs/${org.slug}/edit`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' })
          )}
          aria-label="Edit"
        >
          <Pencil className="size-4" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon-sm' })
            )}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem>
              <ArrowDownFromLine className="size-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {destructiveItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Link
          href={`/orgs/${org.slug}/edit`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'gap-1.5'
          )}
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon-sm' })
            )}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem>
              <ArrowDownFromLine className="size-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {destructiveItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteOrgDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        orgId={org.id}
        orgName={org.name ?? ''}
      />
      <PurgeOrgDialog
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        orgId={org.id}
        orgName={org.name ?? ''}
      />
    </>
  )
}
