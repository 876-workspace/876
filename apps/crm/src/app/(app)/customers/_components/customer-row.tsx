'use client'

import Link from 'next/link'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Mail, Phone } from '@876/ui/icons'
import { TableCell, TableRow } from '@876/ui/table'
import type { CrmCustomerRow } from '@/features/customers/types'
import { useCustomerLinks } from '../_lib/use-customer-links'
import { customerTabPath } from '../_lib/customer-tabs'

/**
 * Full-row link overlay. A `<tr>` cannot be an anchor, so the anchor is
 * stretched over the row instead: the whole row is clickable, and because it
 * is a real link it also supports middle-click, "open in new tab", and "copy
 * link address" — which is the point of putting the customer in the path.
 */
function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}

export function CondensedCustomerRow({
  customer,
  selected,
}: {
  customer: CrmCustomerRow
  selected: boolean
}) {
  const linkTo = useCustomerLinks()

  const subtitle = customer.isBusiness
    ? (customer.contactName ?? customer.email ?? 'Business')
    : (customer.email ?? 'Individual')

  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      className={cn('transition-colors', selected && 'bg-muted/70 font-medium')}
    >
      <TableCell className="relative py-3 pr-3 pl-4">
        <RowLink
          href={linkTo(customerTabPath(customer.profileId, null))}
          label={`View customer ${customer.name}`}
        />
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={customer.name}
            src={customer.contactAvatar}
            shape={customer.isBusiness ? 'square' : 'circle'}
            className="size-7 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-[0.8125rem] font-medium">
              {customer.name}
            </p>
            <p className="text-muted-foreground truncate text-[0.6875rem]">
              {subtitle}
            </p>
          </div>
          {customer.status === 'INACTIVE' ? (
            <Badge
              variant="secondary"
              className="h-4 px-1 py-0 text-[0.625rem]"
            >
              Inactive
            </Badge>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function CustomerTableRow({ customer }: { customer: CrmCustomerRow }) {
  const linkTo = useCustomerLinks()

  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-4">
        <RowLink
          href={linkTo(customerTabPath(customer.profileId, null))}
          label={`View customer ${customer.name}`}
        />
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={customer.name}
            src={customer.contactAvatar}
            shape={customer.isBusiness ? 'square' : 'circle'}
            className="size-8 shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
              {customer.name}
            </span>
            {customer.legalName ? (
              <p className="text-muted-foreground max-w-xs truncate text-xs">
                {customer.legalName}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 text-[0.8125rem]">
        {customer.isBusiness ? (
          customer.contactName ? (
            <div className="min-w-0">
              <p className="truncate font-medium">{customer.contactName}</p>
              {customer.contactEmail ? (
                <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                  <Mail className="text-muted-foreground/70 size-3 shrink-0" />
                  {customer.contactEmail}
                </p>
              ) : null}
            </div>
          ) : customer.email ? (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Mail className="text-muted-foreground/70 size-3.5 shrink-0" />
              {customer.email}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        ) : customer.email ? (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Mail className="text-muted-foreground/70 size-3.5 shrink-0" />
            {customer.email}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem] whitespace-nowrap">
        {customer.phone ? (
          <span className="flex items-center gap-1.5">
            <Phone className="text-muted-foreground/70 size-3.5 shrink-0" />
            {customer.phone}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
