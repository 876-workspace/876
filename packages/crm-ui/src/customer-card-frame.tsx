'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Mail, Phone } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

import type { CrmCustomerRow } from './customer-list'

export type CustomerTab = {
  segment: string | null
  label: string
}

export const CRM_CUSTOMER_TABS: readonly CustomerTab[] = [
  { segment: null, label: 'Overview' },
  { segment: 'contacts', label: 'Contacts' },
  { segment: 'transactions', label: 'Transactions' },
  { segment: 'requests', label: 'Requests' },
  { segment: 'mails', label: 'Mails' },
  { segment: 'statement', label: 'Statement' },
  { segment: 'activity', label: 'Activity' },
]

export type CustomerCardFrameProps = {
  customer: CrmCustomerRow
  /** Exact href for this customer's index route in the current host. */
  baseHref: string
  activeSegment?: string | null
  query?: string
  tabs?: readonly CustomerTab[]
  actions?: ReactNode
  children: ReactNode
}

function hrefWithQuery(path: string, query?: string) {
  return query ? `${path}?${query}` : path
}

function tabHref(baseHref: string, segment: string | null, query?: string) {
  return hrefWithQuery(segment ? `${baseHref}/${segment}` : baseHref, query)
}

/**
 * Canonical CRM customer record chrome. Hosts own routing authority and
 * mutations; this package owns the customer identity/header, tab treatment,
 * body scroll region and record footer so embedded CRM does not drift from the
 * standalone product.
 */
export function CustomerCardFrame({
  customer,
  baseHref,
  activeSegment = null,
  query,
  tabs = CRM_CUSTOMER_TABS,
  actions,
  children,
}: CustomerCardFrameProps) {
  const subtitle =
    customer.legalName ??
    customer.typeLabel ??
    (customer.isBusiness ? 'Business' : 'Individual')

  return (
    <section
      aria-label={`Customer details: ${customer.name}`}
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start gap-4 border-b px-6 py-5">
        <CustomerAvatar
          name={customer.name}
          src={customer.contactAvatar}
          size="lg"
          shape={customer.isBusiness ? 'square' : 'circle'}
          className={cn(
            'ring-border/60 size-14 shrink-0 text-lg font-semibold shadow-xs ring-1 sm:size-16 sm:text-xl',
            customer.isBusiness
              ? 'rounded-2xl after:rounded-2xl sm:rounded-2xl'
              : 'rounded-full after:rounded-full'
          )}
        />

        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
              {customer.name}
            </h2>
            <Badge
              variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
            >
              {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              {customer.isBusiness ? 'Business' : 'Individual'}
            </Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-foreground/80 font-medium">{subtitle}</span>
            {customer.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="text-muted-foreground/70 size-3.5 shrink-0" />
                <a
                  href={`mailto:${customer.email}`}
                  className="hover:text-foreground hover:underline"
                >
                  {customer.email}
                </a>
              </span>
            ) : null}
            {customer.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="text-muted-foreground/70 size-3.5 shrink-0" />
                <a
                  href={`tel:${customer.phone}`}
                  className="hover:text-foreground hover:underline"
                >
                  {customer.phone}
                </a>
              </span>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {actions}
          </div>
        ) : null}
      </header>

      {tabs.length > 0 ? (
        <div className="border-876-surface-border shrink-0 border-b px-6 pt-3">
          <div className="876-scroll flex items-center gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeSegment === tab.segment
              return (
                <Link
                  key={tab.label}
                  href={tabHref(baseHref, tab.segment, query)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'border-b-2 pb-3 text-xs font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'border-primary text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        {children}
      </div>

      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground flex shrink-0 items-center justify-between border-t px-6 py-2.5 text-xs">
        <span className="truncate font-mono">{customer.profileId}</span>
      </footer>
    </section>
  )
}
