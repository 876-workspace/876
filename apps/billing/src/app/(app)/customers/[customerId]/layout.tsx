import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import {
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Mail,
  Phone,
  Users,
} from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { resolveCustomer } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { getFeatures } from '@/lib/features'
import { formatDate } from '@/lib/format'
import { CustomerActions } from './_components/customer-actions'
import { resolveCustomerParty, type CustomerPartyInput } from './_data'

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

export default async function CustomerDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ customerId: string }>
}) {
  const [{ customerId }, context] = await Promise.all([
    params,
    getWorkspaceContext(),
  ])
  const requestsEnabled = context
    ? (
        await getFeatures({
          userId: context.userId,
          organizationId: context.orgId,
        })
      ).productFeatures.requests
    : false
  const base = `/customers/${customerId}`
  const tabs = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Transactions', href: `${base}/transactions` },
    { label: 'Subscriptions', href: `${base}/subscriptions` },
    ...(requestsEnabled
      ? [{ label: 'Requests', href: `${base}/requests` }]
      : []),
    { label: 'Mails', href: `${base}/mails` },
    { label: 'Statement', href: `${base}/statement` },
    { label: 'Activity', href: `${base}/activity` },
  ]

  return (
    <DetailCard aria-label="Customer">
      <Suspense fallback={<CustomerHeaderSkeleton />}>
        <CustomerHeaderData customerId={customerId} />
      </Suspense>
      <DetailCardRouteTabs tabs={tabs} />
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function CustomerHeaderData({ customerId }: { customerId: string }) {
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  const isOrg =
    customer.customerType === 'CORE_ORGANIZATION' && customer.organizationId
  const party = await resolveCustomerParty(
    customer as unknown as CustomerPartyInput
  )
  const currency = (
    customer.defaultCurrency ?? context.tenant.defaultCurrency
  ).toUpperCase()
  const avatar = isOrg ? (
    <OrgAvatar
      name={party.org?.name ?? customer.name}
      src={party.org?.logo_url}
      size="lg"
      className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
    />
  ) : party.contact?.avatar ? (
    <Avatar className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl">
      <AvatarImage src={party.contact.avatar} alt="" />
      <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
    </Avatar>
  ) : (
    <CustomerAvatar name={customer.name} size="lg" />
  )
  const meta = isOrg ? (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <Hash className="size-3.5 shrink-0" />
        <span className="max-w-[160px] truncate sm:max-w-[220px]">
          {party.org?.slug}
        </span>
      </span>
      {party.memberCount !== null ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <Users className="size-3.5 shrink-0" />
          {party.memberCount} {party.memberCount === 1 ? 'member' : 'members'}
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5">
          <Building2 className="size-3.5 shrink-0" />
          876 organization
        </span>
      )}
      <CustomerMeta currency={currency} createdAt={customer.createdAt} />
    </>
  ) : (
    <>
      {customer.email ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Mail className="size-3.5 shrink-0" />
          <span className="max-w-[200px] truncate sm:max-w-[260px]">
            {customer.email}
          </span>
        </span>
      ) : null}
      {customer.phone ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <Phone className="size-3.5 shrink-0" />
          {customer.phone}
        </span>
      ) : null}
      <CustomerMeta currency={currency} createdAt={customer.createdAt} />
    </>
  )

  return (
    <DetailCardHeader
      icon={avatar}
      title={customer.name}
      subtitle={<DetailCardMeta>{meta}</DetailCardMeta>}
      actions={
        <CustomerActions
          customerId={customer.id}
          customerName={customer.name}
          canManage={hasPermission(context, 'customers:write')}
        />
      }
      closeHref="/customers"
      closeLabel="Close customer details"
    />
  )
}

function CustomerMeta({
  currency,
  createdAt,
}: {
  currency: string
  createdAt: number
}) {
  return (
    <>
      <span className="flex shrink-0 items-center gap-1.5">
        <CreditCard className="size-3.5 shrink-0" />
        {currency}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <Calendar className="size-3.5 shrink-0" />
        Added {formatDate(createdAt)}
      </span>
    </>
  )
}

function CustomerHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 rounded-full sm:size-16" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-72" />}
      actions={<Skeleton className="h-8 w-32" />}
      closeHref="/customers"
      closeLabel="Close customer details"
    />
  )
}
