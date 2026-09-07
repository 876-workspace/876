'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2Icon, MoreHorizontalIcon, Trash } from '@876/ui/icons'
import { CustomerDetailActions } from '@876/billing-ui/customer-detail-actions'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  customerId: string
  customerName: string
  /** Whether the current member may edit/archive the customer. */
  canManage: boolean
}

export function CustomerActions({
  customerId,
  customerName,
  canManage,
}: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await client.customers.delete(customerId)
      if (result.error) return
      setDeleteOpen(false)
      router.push('/customers')
      router.refresh()
    })
  }

  if (!canManage) return null

  const transactionGroups = [
    {
      actions: [
        { label: 'Invoice', href: `/invoices/new?customerId=${customerId}` },
        {
          label: 'Customer Payment',
          href: `/payments/new?customerId=${customerId}`,
        },
        { label: 'Quote', href: `/quotes/new?customerId=${customerId}` },
        {
          label: 'Credit Note',
          href: `/credit-notes/new?customerId=${customerId}`,
        },
      ],
    },
    {
      label: 'Recurring',
      actions: [
        {
          label: 'Subscription',
          href: `/subscriptions/new?customerId=${customerId}`,
        },
      ],
    },
  ]

  return (
    <>
      <CustomerDetailActions
        editHref={`/customers/${customerId}/edit`}
        transactionGroups={transactionGroups}
        linkComponent={Link}
        overflow={
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground font-medium">
                {customerName || 'This customer'}
              </strong>{' '}
              will be removed from billing. Existing invoices and quotes are
              retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
