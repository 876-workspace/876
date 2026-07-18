import type { ReactNode } from 'react'
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

import { DetailLayout } from '@/components/detail-layout'
import { resolveCustomer } from '@/app/(app)/detail-data'
import { getWorkspaceContext, hasPermission } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'
import { CustomerActions } from './customer-actions'
import { resolveCustomerParty } from './_data'

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
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  const isOrg =
    customer.customerType === 'CORE_ORGANIZATION' && customer.organizationId
  const party = await resolveCustomerParty(customer)

  const base = `/customers/${customer.id}`
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
  ) : (
    <Avatar className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl">
      {party.contact?.avatar ? (
        <AvatarImage src={party.contact.avatar} alt="" />
      ) : null}
      <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
    </Avatar>
  )

  const meta = isOrg ? (
    <>
      {party.org?.slug ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Hash className="size-3.5 shrink-0" />
          <span className="max-w-[160px] truncate sm:max-w-[220px]">
            {party.org.slug}
          </span>
        </span>
      ) : null}
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
      <span className="flex shrink-0 items-center gap-1.5">
        <CreditCard className="size-3.5 shrink-0" />
        {currency}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <Calendar className="size-3.5 shrink-0" />
        Added {formatDate(customer.createdAt)}
      </span>
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
      <span className="flex shrink-0 items-center gap-1.5">
        <CreditCard className="size-3.5 shrink-0" />
        {currency}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <Calendar className="size-3.5 shrink-0" />
        Added {formatDate(customer.createdAt)}
      </span>
    </>
  )

  return (
    <DetailLayout
      backHref="/customers"
      backLabel="Customers"
      title={customer.name}
      status={customer.status.toLowerCase()}
      statusVariant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
      avatar={avatar}
      meta={meta}
      actions={
        <CustomerActions
          customerId={customer.id}
          customerName={customer.name}
          canManage={hasPermission(context, 'customers:write')}
        />
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Transactions', href: `${base}/transactions` },
        { label: 'Mails', href: `${base}/mails` },
        { label: 'Requests', href: `${base}/requests` },
        { label: 'Statement', href: `${base}/statement` },
        { label: 'History', href: `${base}/history` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
