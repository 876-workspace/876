'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Trash, XIcon } from '@876/ui/icons'

import { client } from '@/lib/client'
import { CustomerActivity } from './customer-activity'
import type { CrmCustomerRow } from './customers-table'

type TabKey = 'overview' | 'activity'

const DETAIL_TABS: { value: TabKey; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
]

export function CustomerDetail({
  customer,
  onClose,
  className,
}: {
  customer: CrmCustomerRow
  onClose: () => void
  className?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('overview')
  const [status, setStatus] = useState(customer.status)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isActive = status === 'ACTIVE'

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
    onClose()
    router.refresh()
  }

  const subtitle =
    customer.legalName ??
    customer.typeLabel ??
    (customer.isBusiness ? 'Business' : 'Individual')

  return (
    <section
      aria-label={`Customer details: ${customer.name}`}
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-start gap-3.5 border-b px-6 py-5">
        <CustomerAvatar
          name={customer.name}
          className="size-12 rounded-xl text-base after:rounded-xl [&_*]:rounded-xl"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
              {customer.name}
            </h2>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {customer.isBusiness ? (
              <Badge variant="outline">Business</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {subtitle}
            {customer.email ? ` · ${customer.email}` : ''}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
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
              <DropdownMenuItem
                onClick={toggleStatus}
                disabled={togglingStatus}
              >
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
            onClick={onClose}
            aria-label="Close customer details"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div
        role="tablist"
        aria-label="Customer details tabs"
        className="border-876-surface-border shrink-0 border-b px-6 pt-3.5 pb-3"
      >
        <div className="bg-muted/60 inline-flex w-fit items-center gap-1 rounded-lg p-1">
          {DETAIL_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
                tab === entry.value
                  ? 'text-foreground bg-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div
        key={tab}
        role="tabpanel"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 overflow-y-auto p-6 motion-safe:duration-150 motion-safe:ease-out"
      >
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Party Details */}
            <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
              <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
                {customer.isBusiness
                  ? 'Organization Details'
                  : 'Customer Details'}
              </h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customer.legalName ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Legal Name
                    </dt>
                    <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                      {customer.legalName}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground text-xs">Email</dt>
                  <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                    {customer.email || (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Phone</dt>
                  <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                    {customer.phone || (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Type</dt>
                  <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                    {customer.isBusiness ? 'Business' : 'Individual'}
                  </dd>
                </div>
                {customer.typeLabel ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">Source</dt>
                    <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                      {customer.typeLabel}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* Primary Contact for Business */}
            {customer.isBusiness ? (
              <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
                <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
                  Primary Contact
                </h3>
                {customer.contactName ? (
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Contact Name
                      </dt>
                      <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                        {customer.contactName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Contact Email
                      </dt>
                      <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                        {customer.contactEmail || (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </dd>
                    </div>
                    {customer.contactPhone ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          Contact Phone
                        </dt>
                        <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                          {customer.contactPhone}
                        </dd>
                      </div>
                    ) : null}
                    {customer.contactUserId ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">
                          876 Account
                        </dt>
                        <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
                          {customer.contactUserId}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    No primary contact on file
                  </p>
                )}
              </div>
            ) : null}

            {/* CRM Record Details */}
            <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
              <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
                CRM Record
              </h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Registry ID</dt>
                  <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
                    {customer.billingCustomerId}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">CRM Status</dt>
                  <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                    <Badge variant={isActive ? 'success' : 'secondary'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </dd>
                </div>
                {customer.ownerId ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">Owner ID</dt>
                    <dd className="text-foreground mt-0.5 font-mono text-[0.8125rem]">
                      {customer.ownerId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        )}

        {tab === 'activity' && <CustomerActivity customer={customer} />}
      </div>

      {/* Footer */}
      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground flex shrink-0 items-center justify-between border-t px-6 py-2.5 text-xs">
        <span className="truncate font-mono">{customer.profileId}</span>
      </footer>
    </section>
  )
}
