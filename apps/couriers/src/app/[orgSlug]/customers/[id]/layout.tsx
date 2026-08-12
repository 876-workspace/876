import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Skeleton } from '@876/ui/skeleton'
import { RouteTabs } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderActions,
  DetailHeaderMain,
  DetailHeaderTabs,
  DetailHeaderTop,
} from '@876/ui/detail-header'
import { Calendar } from '@876/ui/icons'

import { formatDate } from '@876/core/timestamps'
import { DetailChromeGate } from '@/components/patterns/detail/detail-chrome-gate'
import { CustomerActions } from './_components/customer-actions'
import { customerTabs } from './_lib/customer-tabs'
import { resolveCustomer } from './_lib/customer-data'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { orgSlug, id } = await params
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) return { title: 'Customer not found' }
  return { title: `${customer.displayName} - Customers` }
}

export default async function CustomerDetailLayout({
  children,
  params,
}: Props) {
  const { orgSlug, id } = await params
  const base = `/${orgSlug}/customers/${id}`

  return (
    <div>
      <DetailChromeGate>
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
                <Identity orgSlug={orgSlug} id={id} />
              </Suspense>
            </DetailHeaderMain>

            <DetailHeaderActions>
              <Suspense fallback={<ActionsFallback />}>
                <HeaderActions orgSlug={orgSlug} id={id} />
              </Suspense>
            </DetailHeaderActions>
          </DetailHeaderTop>

          <DetailHeaderTabs>
            <RouteTabs tabs={customerTabs(base)} />
          </DetailHeaderTabs>
        </DetailHeader>
      </DetailChromeGate>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
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
  return (
    <>
      <Avatar size="sm" className="size-6 shrink-0 text-[0.625rem]">
        <AvatarFallback>{initialsOf(customer.displayName)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-[0.8125rem] font-semibold">
        {customer.displayName}
      </span>
    </>
  )
}

function CondensedTitleFallback() {
  return (
    <>
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <Skeleton className="h-4 w-36" />
    </>
  )
}

async function Identity({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) notFound()

  const { displayName, isActive, identity, mailbox, branch, profile } = customer

  const meta = [
    mailbox?.number,
    branch?.name,
    identity?.email,
    identity?.phone,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Avatar
        size="lg"
        className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
      >
        <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="876-page-title truncate">{displayName}</h1>
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Suspended'}
          </Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4">
          {meta ? <span className="truncate">{meta}</span> : null}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            Customer since {formatDate(profile.firstSeenAt)}
          </span>
        </div>
      </div>
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
          <Skeleton className="h-[1.375rem] w-16 rounded-md" />
        </div>
        <Skeleton className="h-5 w-60 max-w-full" />
      </div>
    </>
  )
}

async function HeaderActions({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const customer = await resolveCustomer(orgSlug, id)
  if (!customer) return null
  return <CustomerActions orgSlug={orgSlug} id={id} />
}

function ActionsFallback() {
  return (
    <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || 'CU'
}
