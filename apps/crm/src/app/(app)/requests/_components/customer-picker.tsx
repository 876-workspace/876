'use client'

import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import {
  EnvelopeIcon,
  MagnifyingGlassIcon,
  Phone,
  XMarkIcon,
} from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { CrmCustomer } from '@/types/crm'
import { resolveCustomerIdentity } from '@/features/customers/customer-identity'

export type PickerCustomer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  companyName: string | null
  kind: 'INDIVIDUAL' | 'BUSINESS' | null
  /** The person attached to a business customer; null for an individual. */
  contactName: string | null
  contactEmail: string | null
}

/** Flattens the profile/registry pair into the one shape the picker renders. */
export function toPickerCustomer({
  profile,
  customer,
}: CrmCustomer): PickerCustomer {
  const identity = resolveCustomerIdentity(customer, profile.billingCustomerId)
  return {
    id: profile.id,
    name: identity.name,
    email: identity.email,
    phone: identity.phone,
    companyName: customer?.companyName ?? null,
    kind: customer?.customerKind ?? null,
    contactName: identity.contact?.name ?? null,
    contactEmail: identity.contact?.email ?? null,
  }
}

function matches(customer: PickerCustomer, query: string): boolean {
  // A business is most often looked up by the person who called, so the
  // contact is part of the haystack — but it is never shown as the company's
  // own address.
  const haystack = [
    customer.name,
    customer.email,
    customer.phone,
    customer.companyName,
    customer.contactName,
    customer.contactEmail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

/**
 * Search-to-select customer picker.
 *
 * A plain `<Select>` here showed the opaque profile ID as the selected value
 * and forced the user to scroll a flat list of every customer. This searches by
 * name, email, phone, or company and renders the chosen customer as a card, so
 * what is selected reads as a person rather than an identifier.
 *
 * Matching is local: the customer list is already loaded by the page, and the
 * registry read behind it is bounded, so a round trip per keystroke would buy
 * nothing.
 */
export function CustomerPicker({
  customers,
  value,
  onSelect,
  disabled = false,
  locked = false,
}: {
  customers: PickerCustomer[]
  value: PickerCustomer | null
  onSelect: (customer: PickerCustomer | null) => void
  disabled?: boolean
  /** The customer of an existing request cannot be reassigned. */
  locked?: boolean
}) {
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const trimmed = query.trim()
  const results = useMemo(() => {
    const pool = trimmed
      ? customers.filter((c) => matches(c, trimmed))
      : customers
    return pool.slice(0, 8)
  }, [customers, trimmed])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (value) {
    return (
      <div className="border-input bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
        <CustomerAvatar name={value.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{value.name}</p>
            {value.kind ? (
              <Badge variant="secondary" className="text-[0.625rem] capitalize">
                {value.kind.toLowerCase()}
              </Badge>
            ) : null}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            {value.email ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <EnvelopeIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{value.email}</span>
              </span>
            ) : null}
            {value.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3 shrink-0" aria-hidden="true" />
                {value.phone}
              </span>
            ) : null}
            {!value.email && !value.phone ? (
              <span>No contact details</span>
            ) : null}
          </div>
        </div>
        {locked ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            disabled={disabled}
            onClick={() => {
              onSelect(null)
              setQuery('')
              setOpen(true)
            }}
            aria-label="Change customer"
            title="Change customer"
          >
            <XMarkIcon className="size-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search customers
      </label>
      <div className="relative">
        <MagnifyingGlassIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-8"
          placeholder="Search by name, email, or phone"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && open && results.length === 1) {
              event.preventDefault()
              onSelect(results[0]!)
              setOpen(false)
            }
          }}
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="876-card absolute z-50 mt-1 max-h-72 w-full overflow-y-auto p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2.5 text-[0.8125rem]">
              {customers.length === 0
                ? 'No customers yet.'
                : 'No customers match that search.'}
            </p>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelect(customer)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left',
                  'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'
                )}
              >
                <CustomerAvatar name={customer.name} />
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-medium">
                    {customer.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {customer.email ??
                      customer.phone ??
                      customer.companyName ??
                      '—'}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
