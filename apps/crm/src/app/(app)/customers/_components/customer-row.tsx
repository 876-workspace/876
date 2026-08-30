'use client'

import type { KeyboardEvent } from 'react'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { TableCell, TableRow } from '@876/ui/table'
import type { CrmCustomerRow } from './customers-table'

export function CondensedCustomerRow({
  customer,
  selected,
  onSelect,
}: {
  customer: CrmCustomerRow
  selected: boolean
  onSelect: () => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  const subtitle = customer.isBusiness
    ? (customer.contactName ?? customer.email ?? 'Business')
    : (customer.email ?? 'Individual')

  return (
    <TableRow
      tabIndex={0}
      role="button"
      aria-label={`View customer ${customer.name}`}
      aria-pressed={selected}
      data-state={selected ? 'selected' : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'cursor-pointer transition-colors',
        selected && 'bg-muted/70 font-medium'
      )}
    >
      <TableCell className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-3">
          <CustomerAvatar name={customer.name} className="size-7 shrink-0" />
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
  onSelect,
}: {
  customer: CrmCustomerRow
  onSelect: (id: string) => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(customer.profileId)
    }
  }

  return (
    <TableRow
      tabIndex={0}
      role="button"
      aria-label={`View customer ${customer.name}`}
      onClick={() => onSelect(customer.profileId)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition-colors"
    >
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3">
          <CustomerAvatar name={customer.name} />
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
                <p className="text-muted-foreground truncate text-xs">
                  {customer.contactEmail}
                </p>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        ) : (
          <span className="text-muted-foreground">{customer.email ?? '—'}</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem] whitespace-nowrap">
        {customer.phone ?? <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>
          {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
