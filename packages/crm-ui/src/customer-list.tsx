'use client'

import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Mail, Phone, Plus, UsersIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

export type CrmCustomerRow = {
  profileId: string
  billingCustomerId?: string
  name: string
  legalName?: string | null
  isBusiness: boolean
  typeLabel?: string
  email: string | null
  phone: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone?: string | null
  contactUserId?: string | null
  contactAvatar?: string | null
  ownerId?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt?: number
  updatedAt?: number
}

export type CustomersTableProps = {
  customers: readonly CrmCustomerRow[]
  customersHref: string
  newCustomerHref?: string | null
  query?: string
}

export type CondensedCustomersTableProps = {
  customers: readonly CrmCustomerRow[]
  selectedId?: string | null
  customersHref: string
  query?: string
}

function hrefWithQuery(path: string, query?: string) {
  return query ? `${path}?${query}` : path
}

function customerHref(
  customersHref: string,
  customerId: string,
  query?: string
) {
  return hrefWithQuery(`${customersHref}/${customerId}`, query)
}

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
  customersHref,
  query,
}: {
  customer: CrmCustomerRow
  selected: boolean
  customersHref: string
  query?: string
}) {
  const subtitle = customer.isBusiness
    ? (customer.contactName ?? customer.email ?? 'Business')
    : (customer.email ?? 'Individual')

  return (
    <TableRow
      data-state={selected ? 'selected' : undefined}
      className={
        selected
          ? 'bg-muted/70 font-medium transition-colors'
          : 'transition-colors'
      }
    >
      <TableCell className="relative py-3 pr-3 pl-4">
        <RowLink
          href={customerHref(customersHref, customer.profileId, query)}
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

export function CustomerTableRow({
  customer,
  customersHref,
  query,
}: {
  customer: CrmCustomerRow
  customersHref: string
  query?: string
}) {
  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-4">
        <RowLink
          href={customerHref(customersHref, customer.profileId, query)}
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

export function CustomersTable({
  customers,
  customersHref,
  newCustomerHref,
  query,
}: CustomersTableProps) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Customer
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Contact
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Phone
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No customers yet</EmptyTitle>
                  </EmptyHeader>
                  {newCustomerHref ? (
                    <EmptyContent>
                      <Link
                        href={hrefWithQuery(newCustomerHref, query)}
                        className={buttonVariants({
                          variant: 'info',
                          size: 'sm',
                        })}
                      >
                        <Plus className="size-4" strokeWidth={2.25} />
                        Add
                      </Link>
                    </EmptyContent>
                  ) : null}
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => (
              <CustomerTableRow
                key={customer.profileId}
                customer={customer}
                customersHref={customersHref}
                query={query}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function CondensedCustomersTable({
  customers,
  selectedId,
  customersHref,
  query,
}: CondensedCustomersTableProps) {
  return (
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
        Customers
      </header>
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Table>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No customers yet
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <CondensedCustomerRow
                  key={customer.profileId}
                  customer={customer}
                  selected={customer.profileId === selectedId}
                  customersHref={customersHref}
                  query={query}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
