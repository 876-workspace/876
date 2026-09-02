'use client'

import type { ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardTab,
  DetailCardTabs,
} from '@876/ui/detail-card'
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
    <DetailCard aria-label={`Customer details: ${customer.name}`}>
      <DetailCardHeader
        icon={
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
        }
        title={customer.name}
        meta={
          <>
            <Badge
              variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
            >
              {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              {customer.isBusiness ? 'Business' : 'Individual'}
            </Badge>
          </>
        }
        subtitle={
          <DetailCardMeta>
            <span className="text-foreground/80 font-medium">{subtitle}</span>
            {customer.email ? (
              <DetailCardMetaItem
                icon={<Mail />}
                href={`mailto:${customer.email}`}
              >
                {customer.email}
              </DetailCardMetaItem>
            ) : null}
            {customer.phone ? (
              <DetailCardMetaItem
                icon={<Phone />}
                href={`tel:${customer.phone}`}
              >
                {customer.phone}
              </DetailCardMetaItem>
            ) : null}
          </DetailCardMeta>
        }
        actions={actions}
      />

      {tabs.length > 0 ? (
        <DetailCardTabs>
          {tabs.map((tab) => (
            <DetailCardTab
              key={tab.label}
              href={tabHref(baseHref, tab.segment, query)}
              active={activeSegment === tab.segment}
            >
              {tab.label}
            </DetailCardTab>
          ))}
        </DetailCardTabs>
      ) : null}

      <DetailCardBody>{children}</DetailCardBody>

      <DetailCardIdBar>
        <span className="truncate">{customer.profileId}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
