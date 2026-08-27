import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Separator } from '@876/ui/separator'
import { Skeleton } from '@876/ui/skeleton'
import {
  ArrowRight,
  EnvelopeIcon,
  InformationCircleIcon,
  Phone,
} from '@876/ui/icons'
import { formatDateTime } from '@876/core/timestamps'

import { CopyButton } from '../../_components/copy-button'
import { RequestSourceIcon } from '../../_components/request-source-icon'
import { formatCustomerType, formatSource } from '../../_lib/request-format'
import { loadCustomer, loadRequest } from '../_data'

/**
 * The record's right column: who the request is for, and the request's own
 * reference data. It sits outside the tab strip because reaching the customer
 * is the first thing anyone does on a request, whichever section they are in.
 */
export async function RequestAside({ requestId }: { requestId: string }) {
  const { request } = await loadRequest(requestId)
  const { profile, customer } = await loadCustomer(request.customerId)

  const customerName =
    customer?.name ?? profile?.billingCustomerId ?? request.customerId
  // The registry stores a business's legal name beside its trading name, and
  // for most orgs the two are identical — printing both reads as a rendering
  // bug, so the second line only earns its place when it says something new.
  const customerSubtitle =
    customer?.companyName && customer.companyName !== customerName
      ? customer.companyName
      : formatCustomerType(customer?.customerType)

  return (
    <>
      <section className="876-card p-4">
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={customerName}
            size="lg"
            className="size-12 text-base sm:size-12 sm:text-base"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/customers/${request.customerId}`}
              className="block truncate font-medium hover:underline"
            >
              {customerName}
            </Link>
            <p className="text-muted-foreground truncate text-sm">
              {customerSubtitle}
            </p>
          </div>
          {customer?.customerKind ? (
            <Badge variant="secondary" className="shrink-0 capitalize">
              {customer.customerKind.toLowerCase()}
            </Badge>
          ) : null}
        </div>

        <Separator className="my-4" />

        {/*
          The contact rows are always on screen. They used to sit behind an
          accordion, which charged a click for the page's most-used control and
          left the column looking empty.
        */}
        <div className="flex flex-col gap-2.5">
          <ContactRow
            icon={
              <EnvelopeIcon className="size-4 shrink-0" aria-hidden="true" />
            }
            href={customer?.email ? `mailto:${customer.email}` : undefined}
            value={customer?.email}
            empty="No email on file"
          />
          <ContactRow
            icon={<Phone className="size-4 shrink-0" aria-hidden="true" />}
            href={customer?.phone ? `tel:${customer.phone}` : undefined}
            value={customer?.phone}
            empty="No phone on file"
          />
        </div>

        <Link
          href={`/customers/${request.customerId}`}
          className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium no-underline! hover:underline!"
        >
          <span>View customer profile</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </section>

      <section className="876-card p-4">
        <h2 className="876-section-title flex items-center gap-2 text-sm">
          <InformationCircleIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
          Details
        </h2>

        <dl className="mt-3 space-y-3 text-sm">
          <DetailRow label="Source">
            <span className="text-foreground flex items-center gap-1.5">
              <RequestSourceIcon source={request.source} />
              {formatSource(request.source)}
            </span>
          </DetailRow>

          <DetailRow label="Created">
            <span className="text-foreground">
              {formatDateTime(request.createdAt)}
            </span>
          </DetailRow>

          <div className="border-t pt-3">
            <DetailRow label="Request ID">
              <span className="flex items-center gap-1">
                <code className="bg-muted max-w-[150px] truncate rounded px-1.5 py-0.5 font-mono text-xs">
                  {request.id}
                </code>
                <CopyButton value={request.id} label="Request ID" />
              </span>
            </DetailRow>
          </div>
        </dl>
      </section>
    </>
  )
}

export function RequestAsideSkeleton() {
  return (
    <>
      <section className="876-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1.5 h-4 w-24" />
          </div>
        </div>
        <Separator className="my-4" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2.5 h-4 w-32" />
      </section>
      <section className="876-card p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-2/3" />
      </section>
    </>
  )
}

function ContactRow({
  icon,
  href,
  value,
  empty,
}: {
  icon: React.ReactNode
  href?: string
  value?: string | null
  empty: string
}) {
  if (!value || !href) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {empty}
      </p>
    )
  }

  return (
    <a
      href={href}
      className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm no-underline! transition-colors"
    >
      {icon}
      <span className="truncate">{value}</span>
    </a>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}
