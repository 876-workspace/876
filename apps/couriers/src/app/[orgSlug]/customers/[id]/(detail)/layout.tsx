import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Calendar, Mail, MapPin, Phone } from '@876/ui/icons'
import { RouteTabs } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderActions,
  DetailHeaderMain,
  DetailHeaderTabs,
  DetailHeaderTop,
} from '@876/ui/detail-header'
import { Skeleton } from '@876/ui/skeleton'

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

  return {
    title: `${titleName} - Customers`,
  }
}

export default async function CustomerDetailLayout({
  children,
  params,
}: Props) {
  const { orgSlug, id } = await params
  const base = `/${orgSlug}/customers/${id}`

  return (
    <div>
      <DetailHeader
        condensedTitle={
          <Suspense fallback={<CondensedTitleFallback />}>
            <CondensedTitle orgSlug={orgSlug} id={id} />
          </Suspense>
        }
      >
        <DetailHeaderTop>
          <DetailHeaderMain>
            <Suspense fallback={<IdentityFallback />}>
              <CustomerIdentity orgSlug={orgSlug} id={id} />
            </Suspense>
          </DetailHeaderMain>

          <DetailHeaderActions>
            <Suspense fallback={<ActionsFallback />}>
              <CustomerHeaderActions orgSlug={orgSlug} id={id} />
            </Suspense>
          </DetailHeaderActions>
        </DetailHeaderTop>

        <DetailHeaderTabs>
          <RouteTabs tabs={customerTabs(base)} />
        </DetailHeaderTabs>
      </DetailHeader>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

async function CustomerIdentity({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) notFound()

  const name = customer.identity?.name || customer.profile.billingCustomerId
  const isActive = customer.profile.status === 'ACTIVE'

  return (
    <>
      <CustomerAvatar name={name} size="lg" />

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="876-page-title truncate">{name}</h1>
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Suspended'}
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4">
          {customer.mailbox?.number && (
            <span className="flex items-center gap-1.5">
              <span className="text-foreground/70">Mailbox</span>
              {customer.mailbox.number}
            </span>
          )}
          {customer.branch?.name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {customer.branch.name}
            </span>
          )}
          {customer.identity?.email && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="max-w-[220px] truncate">
                {customer.identity.email}
              </span>
            </span>
          )}
          {customer.identity?.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              {customer.identity.phone}
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            Joined {formatDate(customer.profile.createdAt)}
          </span>
        </div>
      </div>
    </>
  )
}

async function CondensedTitle({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) return null

  const name = customer.identity?.name || customer.profile.billingCustomerId

  return (
    <>
      <CustomerAvatar name={name} size="sm" />
      <span className="truncate text-[0.8125rem] font-semibold">{name}</span>
    </>
  )
}

function CustomerHeaderActions({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  return <CustomerActions orgSlug={orgSlug} id={id} />
}

function CondensedTitleFallback() {
  return (
    <>
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <Skeleton className="h-4 w-36" />
    </>
  )
}

function IdentityFallback() {
  return (
    <>
      <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-x-2">
          <Skeleton className="h-7 w-44 max-w-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
    </>
  )
}

function ActionsFallback() {
  return (
    <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
      <Skeleton className="h-8 w-[4.5rem] rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp * 1000))
}
