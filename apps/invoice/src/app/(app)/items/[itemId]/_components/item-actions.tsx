'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2Icon, MoreHorizontalIcon, Pencil, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'

import { client } from '@/lib/client'

type Props = {
  itemId: string
  itemName: string
  isActive: boolean
  canManage: boolean
}

export function ItemActions({ itemId, itemName, isActive, canManage }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange() {
    setError(null)
    startTransition(async () => {
      const result = await client.items.update(itemId, { isActive: !isActive })
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await client.items.delete(itemId)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setDeleteOpen(false)
      router.push('/items')
      router.refresh()
    })
  }

  if (!canManage) return null

  return (
    <>
      <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
        {error ? (
          <p className="text-destructive max-w-72 text-right text-xs">
            {error}
          </p>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon-sm' })
            )}
            aria-label="More actions"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <MoreHorizontalIcon className="size-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem render={<Link href={`/items/${itemId}/edit`} />}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStatusChange}>
              {isActive ? 'Archive' : 'Reactivate'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground font-medium">
                {itemName || 'This item'}
              </strong>{' '}
              can only be deleted when it has no billing or transaction history.
              Archive it instead when it has already been used.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
