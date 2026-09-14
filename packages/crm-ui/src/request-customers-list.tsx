import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import type { CrmCustomerRow } from './customer-list'

export function RequestCustomersList({
  customers,
  customerRequestsHrefBase,
}: {
  customers: readonly CrmCustomerRow[]
  customerRequestsHrefBase: string
}) {
  if (customers.length === 0) {
    return (
      <div className="876-card overflow-hidden">
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No request customers</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="876-card overflow-hidden">
      <ul className="divide-border/60 divide-y">
        {customers.map((customer) => {
          const billingCustomerId = customer.billingCustomerId
          const href = billingCustomerId
            ? `${customerRequestsHrefBase}/${encodeURIComponent(billingCustomerId)}/requests`
            : null

          const body = (
            <>
              <CustomerAvatar
                name={customer.name}
                src={customer.contactAvatar}
                shape={customer.isBusiness ? 'square' : 'circle'}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {customer.name}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {customer.contactName ??
                    customer.email ??
                    customer.typeLabel ??
                    'Customer'}
                </span>
              </div>
              <Badge
                variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
              >
                {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </>
          )

          return (
            <li
              key={customer.profileId}
              className="hover:bg-muted/40 transition-colors"
            >
              {href ? (
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                  aria-label={`Open requests for ${customer.name}`}
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3.5 opacity-70 sm:px-5">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function RequestCustomersListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="876-card overflow-hidden">
      <ul className="divide-border/60 divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  )
}
