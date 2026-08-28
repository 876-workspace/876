import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { CategoryIcon } from '@876/ui/category-icons'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import {
  ArrowRight,
  EnvelopeIcon,
  InformationCircleIcon,
  Phone,
} from '@876/ui/icons'
import { formatDateTime } from '@876/core/timestamps'

import { CopyButton } from './copy-button'
import { RequestSourceIcon } from './request-source-icon'
import { categoryColorClass } from '../category-color'
import { formatSource } from '../request-format'
import { resolveCustomerIdentity } from '../customer-identity'
import {
  loadCategoryIndex,
  loadCustomer,
  loadOrgCategoryIndex,
  loadOrgCustomer,
  loadOrgRequest,
  loadRequest,
} from '../request-data'

/**
 * The record's right column: who the request is for, and the request's own
 * reference data.
 */
export async function RequestAside({
  requestId,
  organizationId,
  customerHref,
}: {
  requestId: string
  organizationId?: string
  customerHref?: string
}) {
  let orgId = organizationId
  let requestData: any = null

  if (organizationId) {
    const data = await loadOrgRequest(
      organizationId,
      requestId,
      `/support/${requestId}`
    )
    orgId = data.org.id
    requestData = data.request
  } else {
    const data = await loadRequest(requestId)
    if (!data.org || !data.request) return null
    orgId = data.org.id
    requestData = data.request
  }

  const [{ customer }, categories] = await Promise.all([
    loadOrgCustomer(orgId, requestData.customerId),
    loadOrgCategoryIndex(orgId),
  ])
  const category = requestData.categoryId
    ? categories.get(requestData.categoryId)
    : undefined

  const identity = resolveCustomerIdentity(customer, requestData.customerId)
  const customerSubtitle = identity.legalName ?? identity.typeLabel

  const targetCustomerHref =
    customerHref ?? `/customers/${requestData.customerId}`

  return (
    <>
      <section className="876-card overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <CustomerAvatar
            name={identity.name}
            size="lg"
            className="size-11 rounded-lg text-sm ring-0 after:rounded-lg sm:size-11 sm:text-sm [&_[data-slot=avatar-fallback]]:rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={targetCustomerHref}
                className="min-w-0 truncate font-medium hover:underline"
              >
                {identity.name}
              </Link>
              {identity.isBusiness ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[0.65rem] capitalize"
                >
                  business
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {customerSubtitle}
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <ContactRow
                icon={
                  <EnvelopeIcon
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                }
                href={identity.email ? `mailto:${identity.email}` : undefined}
                value={identity.email}
                empty={
                  identity.isBusiness
                    ? 'No organization email'
                    : 'No email on file'
                }
              />
              <ContactRow
                icon={
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                }
                href={identity.phone ? `tel:${identity.phone}` : undefined}
                value={identity.phone}
                empty={
                  identity.isBusiness
                    ? 'No organization phone'
                    : 'No phone on file'
                }
              />
            </div>
          </div>
        </div>

        {identity.isBusiness ? (
          <div className="bg-muted/40 border-t px-4 py-3">
            <p className="text-muted-foreground mb-2 text-[0.65rem] font-medium tracking-wider uppercase">
              Primary contact
            </p>
            {identity.contact ? (
              <div className="flex items-start gap-2.5">
                <CustomerAvatar
                  name={identity.contact.name}
                  src={identity.contact.avatar}
                  className="size-8 shrink-0 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {identity.contact.name}
                  </p>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <ContactRow
                      icon={
                        <EnvelopeIcon
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      href={
                        identity.contact.email
                          ? `mailto:${identity.contact.email}`
                          : undefined
                      }
                      value={identity.contact.email}
                      empty="No contact email"
                    />
                    <ContactRow
                      icon={
                        <Phone
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      href={
                        identity.contact.phone
                          ? `tel:${identity.contact.phone}`
                          : undefined
                      }
                      value={identity.contact.phone}
                      empty="No contact phone"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No contact on file
              </p>
            )}
          </div>
        ) : null}

        <div className="border-t px-4 py-2.5">
          <Link
            href={targetCustomerHref}
            className="text-primary inline-flex items-center gap-1 text-sm font-medium no-underline! hover:underline!"
          >
            <span>View customer profile</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
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
          <DetailRow label="Category">
            {category ? (
              <span className="text-foreground flex items-center gap-1.5">
                <CategoryIcon
                  name={category.icon}
                  className={`size-4 ${categoryColorClass(category.color)}`}
                />
                {category.name}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailRow>

          <DetailRow label="Source">
            <span className="text-foreground flex items-center gap-1.5">
              <RequestSourceIcon source={requestData.source} />
              {formatSource(requestData.source)}
            </span>
          </DetailRow>

          <DetailRow label="Created">
            <span className="text-foreground">
              {formatDateTime(requestData.createdAt)}
            </span>
          </DetailRow>

          <div className="border-t pt-3">
            <DetailRow label="Request ID">
              <span className="flex items-center gap-1">
                <code className="bg-muted max-w-[150px] truncate rounded px-1.5 py-0.5 font-mono text-xs">
                  {requestData.id}
                </code>
                <CopyButton value={requestData.id} label="Request ID" />
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
      <section className="876-card overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <Skeleton className="size-11 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1.5 h-3 w-24" />
            <Skeleton className="mt-3 h-3.5 w-40" />
            <Skeleton className="mt-1.5 h-3.5 w-28" />
          </div>
        </div>
        <div className="bg-muted/40 border-t px-4 py-3">
          <Skeleton className="h-2.5 w-24" />
          <div className="mt-2 flex items-start gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1.5 h-3.5 w-36" />
            </div>
          </div>
        </div>
        <div className="border-t px-4 py-2.5">
          <Skeleton className="h-4 w-36" />
        </div>
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
