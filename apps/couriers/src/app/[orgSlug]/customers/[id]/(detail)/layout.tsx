import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { Calendar, Mail, MapPin, Phone } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'
import { formatDate } from '@876/core/timestamps'

import { CustomerActions } from '../_components/customer-actions'
import { resolveCustomer, resolveCustomerTitle } from '../_lib/customer-data'
import { customerTabs } from '../_lib/customer-tabs'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params
  const titleName = await resolveCustomerTitle(orgSlug, id)
  if (!titleName) return { title: 'Customer not found' }

  return { title: `${titleName} - Customers` }
}

/**
 * The customer record card in the detail column. Awaits `params` and nothing
 * else: the tabs are built from the URL and render at once, while the record
 * header streams behind its own boundary, where `notFound()` is decided.
 */
export default async function CustomerDetailLayout({
  children,
  params,
}: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/customers`

  return (
    <DetailCard aria-label="Customer">
      <Suspense
        key={id}
        fallback={<CustomerHeaderFallback closeHref={closeHref} />}
      >
        <CustomerHeader orgSlug={orgSlug} id={id} closeHref={closeHref} />
      </Suspense>
      <DetailCardRouteTabs tabs={customerTabs(`${closeHref}/${id}`)} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function CustomerHeader({
  orgSlug,
  id,
  closeHref,
}: {
  orgSlug: string
  id: string
  closeHref: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) notFound()

  const { displayName, identity, mailbox, branch, profile } = customer
  const isActive = profile.status === 'ACTIVE'

  return (
    <DetailCardHeader
      icon={<CustomerAvatar name={displayName} size="lg" />}
      title={displayName}
      meta={
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Active' : 'Suspended'}
        </Badge>
      }
      subtitle={
        <DetailCardMeta>
          {mailbox?.number ? (
            <span className="flex items-center gap-1.5">
              <span className="text-foreground/70">Mailbox</span>
              {mailbox.number}
            </span>
          ) : null}
          {branch?.name ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {branch.name}
            </span>
          ) : null}
          {identity?.email ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="max-w-[220px] truncate">{identity.email}</span>
            </span>
          ) : null}
          {identity?.phone ? (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              {identity.phone}
            </span>
          ) : null}
          <span className="flex shrink-0 items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            Customer since {formatDate(profile.firstSeenAt)}
          </span>
        </DetailCardMeta>
      }
      actions={<CustomerActions orgSlug={orgSlug} id={id} />}
      closeHref={closeHref}
      closeLabel="Close customer details"
    />
  )
}

function CustomerHeaderFallback({ closeHref }: { closeHref: string }) {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 rounded-full sm:size-16" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-72" />}
      actions={<Skeleton className="h-8 w-28" />}
      closeHref={closeHref}
      closeLabel="Close customer details"
    />
  )
}
