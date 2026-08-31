'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/platform/compat'
import { cn } from '@876/core/utils'
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
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Loader2Icon, MoreHorizontalIcon, Trash } from '@876/ui/icons'
import { client } from '@/lib/client'

export function SetupDeleteAction({
  setup,
}: {
  setup: AdminProvisioningSetup
}) {
  const router = useRouter()
  const [action, setAction] = useState<'delete' | 'purge' | null>(null)
  const [isPending, startTransition] = useTransition()
  const cannotRemove = setup.is_default || setup.organization_count > 0

  function handleConfirm() {
    if (!action) return

    startTransition(async () => {
      const result =
        action === 'delete'
          ? await client.provisioningSetups.del(setup.key)
          : await client.provisioningSetups.purge(setup.key)
      if (result.error) return

      setAction(null)
      router.push('/settings/orgs/provisioning')
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'text-muted-foreground hover:text-foreground size-8 shrink-0'
          )}
          aria-label={`More actions for ${setup.name}`}
          disabled={isPending}
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem
            variant="destructive"
            disabled={setup.status === 'archived' || cannotRemove || isPending}
            onClick={() => setAction('delete')}
          >
            <Trash className="size-4" />
            Delete setup
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={cannotRemove || isPending}
            onClick={() => setAction('purge')}
          >
            <Trash className="size-4" />
            Purge setup
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {action === 'purge' ? 'Purge setup?' : 'Delete setup?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'purge' ? (
                <>
                  <strong>{setup.name}</strong> and its finance provisioning
                  defaults will be permanently erased. This cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{setup.name}</strong>?
                  It will no longer be available for new organization
                  provisioning.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              {action === 'purge' ? 'Purge setup' : 'Delete setup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
