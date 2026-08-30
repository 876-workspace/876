'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import {
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
} from 'next/navigation'
import { toast } from 'sonner'
import { CustomerCardFrame as SharedCustomerCardFrame } from '@876/crm-ui/customer-card-frame'
import { Button, buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Trash, XIcon } from '@876/ui/icons'

import type { CrmCustomerRow } from '@/features/customers/types'
import { client } from '@/lib/client'
import { useCustomerLinks } from '../../_lib/use-customer-links'

/**
 * Standalone CRM adapter for the shared customer-card chrome.
 *
 * The product package owns the record identity, tabs, scrolling and footer;
 * this host keeps its own mutations and navigation authority.
 */
export function CustomerCardFrame({
  customer,
  children,
}: {
  customer: CrmCustomerRow
  children: ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkTo = useCustomerLinks()
  const activeSegment = useSelectedLayoutSegment()
  const [status, setStatus] = useState(customer.status)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isActive = status === 'ACTIVE'

  function close() {
    router.push(linkTo('/customers'))
  }

  async function toggleStatus() {
    if (togglingStatus) return
    const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE'
    setTogglingStatus(true)
    const result = await client.customers.update(customer.profileId, {
      customerKind: customer.isBusiness ? 'BUSINESS' : 'INDIVIDUAL',
      status: nextStatus,
    })
    setTogglingStatus(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    setStatus(nextStatus)
    toast.success(
      nextStatus === 'ACTIVE' ? 'Customer activated.' : 'Customer deactivated.'
    )
    router.refresh()
  }

  async function handleDelete() {
    if (deleting) return
    if (!window.confirm('Remove this customer from CRM?')) return
    setDeleting(true)
    const result = await client.customers.delete(customer.profileId)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success('Customer deleted.')
    close()
    router.refresh()
  }

  const actions = (
    <>
      <Link
        href={`/customers/${customer.profileId}/edit`}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        <Pencil className="size-3.5" />
        Edit
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" />}
          aria-label="More customer actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem onClick={toggleStatus} disabled={togglingStatus}>
            {isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={close}
        aria-label="Close customer details"
        className="text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-4" />
      </Button>
    </>
  )

  return (
    <SharedCustomerCardFrame
      customer={{ ...customer, status }}
      baseHref={`/customers/${encodeURIComponent(customer.profileId)}`}
      activeSegment={activeSegment}
      query={searchParams.toString() || undefined}
      actions={actions}
    >
      {children}
    </SharedCustomerCardFrame>
  )
}
