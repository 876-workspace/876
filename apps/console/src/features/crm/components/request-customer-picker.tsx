'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@876/ui/command'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  Building2,
  CheckIcon,
  ChevronsUpDown,
  EnvelopeIcon,
  Phone,
  User,
} from '@876/ui/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'

import {
  searchRequestCustomers,
  type RequestCustomerOption,
} from '../request-customer-option'

type Props = {
  customers: RequestCustomerOption[]
  value: string
  onSelect: (customerId: string) => void
}

export function RequestCustomerPicker({ customers, value, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = customers.find((customer) => customer.id === value)
  const visibleCustomers = useMemo(
    () => searchRequestCustomers(customers, query),
    [customers, query]
  )

  function select(customerId: string) {
    onSelect(customerId)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        className="h-11 w-full justify-between px-3 font-normal"
        aria-label="Search customers"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected ? (
            <CustomerAvatar name={selected.name} className="size-7" />
          ) : null}
          <span className={selected ? 'truncate' : 'text-muted-foreground'}>
            {selected?.name ?? 'Search by customer name…'}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-80 gap-0 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search customers…"
          />
          <CommandList>
            {visibleCustomers.length === 0 ? (
              <CommandEmpty>No customer matches that search.</CommandEmpty>
            ) : null}
            <CommandGroup>
              {visibleCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  data-checked={value === customer.id}
                  onSelect={() => select(customer.id)}
                  className="gap-3 py-2.5"
                >
                  <CustomerAvatar
                    name={customer.name}
                    className="size-8 rounded-lg after:rounded-lg [&_[data-slot=avatar-fallback]]:rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {customer.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {customer.email ?? customer.typeLabel}
                    </span>
                  </span>
                  {customer.status === 'INACTIVE' ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : null}
                  <CheckIcon
                    className={
                      value === customer.id
                        ? 'ml-auto size-4'
                        : 'ml-auto size-4 opacity-0'
                    }
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function CustomerSelectionCard({
  customers,
  selectedId,
  onSelect,
}: {
  customers: RequestCustomerOption[]
  selectedId: string
  onSelect: (customerId: string) => void
}) {
  const customer = customers.find((entry) => entry.id === selectedId)

  return (
    <section className="876-card overflow-hidden">
      <div className="bg-muted/20 flex items-center justify-between gap-2 border-b px-4 py-3">
        <span className="876-eyebrow text-[0.6875rem]">Customer</span>
        {customer ? (
          <Badge
            variant="secondary"
            className="text-muted-foreground text-[0.625rem] font-medium tracking-wider uppercase"
          >
            {customer.isBusiness ? 'Business' : 'Individual'}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        <RequestCustomerPicker
          customers={customers}
          value={selectedId}
          onSelect={onSelect}
        />

        {customer ? (
          <div className="space-y-3.5 border-t pt-4">
            <div className="flex items-start gap-3">
              <CustomerAvatar
                name={customer.name}
                size="lg"
                className="size-10 rounded-lg text-sm ring-0 after:rounded-lg sm:size-10 sm:text-sm [&_[data-slot=avatar-fallback]]:rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground/90 truncate text-sm font-medium">
                  {customer.name}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {customer.legalName ?? customer.typeLabel}
                </p>
              </div>
              <Badge
                variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
              >
                {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="bg-muted/30 flex flex-col gap-2 rounded-md p-2.5 text-xs">
              <div className="text-foreground/80 flex min-w-0 items-center gap-1.5">
                {customer.isBusiness ? (
                  <Building2 className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <User className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <span className="truncate">{customer.typeLabel}</span>
              </div>
              {customer.email ? (
                <div className="text-foreground/80 flex min-w-0 items-center gap-1.5">
                  <EnvelopeIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              ) : null}
              {customer.phone ? (
                <div className="text-foreground/80 flex min-w-0 items-center gap-1.5">
                  <Phone className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              ) : null}
            </div>

            {customer.contactName ? (
              <div className="border-border/60 border-t pt-3">
                <p className="text-muted-foreground text-[0.6875rem] font-medium tracking-wider uppercase">
                  Primary contact
                </p>
                <p className="mt-1 text-xs font-medium">
                  {customer.contactName}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="876-empty-dashed px-4 py-8 text-center text-xs">
            Search for and select the customer this request is for.
          </div>
        )}
      </div>
    </section>
  )
}
