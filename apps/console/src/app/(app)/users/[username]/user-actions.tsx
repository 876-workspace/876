'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownFromLine,
  KeyRound,
  Lock,
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

import type { AdminUser } from '@876/admin'
import { BanUserDialog } from './ban-user-dialog'
import { DeleteUserDialog } from './delete-user-dialog'
import { PurgeUserDialog } from './purge-user-dialog'

type Props = { user: AdminUser }

export function UserActions({ user }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const isDeleted = user.deleted_at !== null

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const editHref = `/users/${user.username ?? user.id}/edit`

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
          href={editHref}
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
              <KeyRound className="size-4" />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBanOpen(true)}>
              <Lock className="size-4" />
              {user.banned ? 'Unban' : 'Ban'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
          href={editHref}
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
              <KeyRound className="size-4" />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBanOpen(true)}>
              <Lock className="size-4" />
              {user.banned ? 'Unban' : 'Ban'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ArrowDownFromLine className="size-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {destructiveItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BanUserDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        userId={user.id}
        displayName={displayName}
        banned={user.banned}
      />
      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userId={user.id}
        displayName={displayName}
      />
      <PurgeUserDialog
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        userId={user.id}
        displayName={displayName}
      />
    </>
  )
}
