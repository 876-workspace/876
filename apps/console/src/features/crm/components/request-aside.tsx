import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { CategoryIcon } from '@876/ui/category-icons'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Skeleton } from '@876/ui/skeleton'
import {
  ArrowRight,
  EnvelopeIcon,
  ExternalLink,
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
  loadOrgCategoryIndex,
  loadOrgCustomer,
  loadOrgRequest,
  requestCustomerHref,
  resolveRequestOrgId,
} from '../request-data'

/**
 * The record's right column: who the request is for, and the request's own
 * reference data.
 */
export async function RequestAside({
  requestId,
  organizationId,
  baseHref = `/support/${requestId}`,
  customerHref,
}: {
  requestId: string
  organizationId?: string
  baseHref?: string
  customerHref?: string
}) {
  const orgId = await resolveRequestOrgId(organizationId)
  if (!orgId) return null

  const { request } = await loadOrgRequest(orgId, requestId, baseHref)

  const [{ customer }, categories] = await Promise.all([
    loadOrgCustomer(orgId, request.customerId),
    loadOrgCategoryIndex(orgId),
  ])
  const category = request.categoryId
    ? categories.get(request.categoryId)
    : undefined

  const identity = resolveCustomerIdentity(customer, request.customerId)
  const customerSubtitle = identity.legalName ?? identity.typeLabel

  const targetCustomerHref =
    customerHref ?? requestCustomerHref(baseHref, request.customerId)

  return (
    <>
      <section className="876-card overflow-hidden">
        <div className="bg-muted/20 flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="876-eyebrow text-[0.6875rem]">Customer</span>
          <Badge
            variant="secondary"
            className="text-muted-foreground text-[0.625rem] font-medium tracking-wider uppercase"
          >
            {identity.isBusiness ? 'Business' : 'Individual'}
          </Badge>
        </div>

        <div className="space-y-3.5 p-4">
          <div className="flex items-start gap-3">
            <CustomerAvatar
              name={identity.name}
              size="lg"
              className="size-10 rounded-lg text-sm ring-0 after:rounded-lg sm:size-10 sm:text-sm [&_[data-slot=avatar-fallback]]:rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={targetCustomerHref}
                className="text-foreground/90 hover:text-info inline-flex items-center gap-1 truncate text-sm font-medium transition-colors"
              >
                <span className="truncate">{identity.name}</span>
                <ExternalLink
                  className="text-muted-foreground/60 size-3 shrink-0"
                  aria-hidden="true"
                />
              </Link>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {customerSubtitle}
              </p>
            </div>
          </div>

          {identity.email || identity.phone ? (
            <div className="bg-muted/30 flex flex-col gap-2 rounded-md p-2.5 text-xs">
              {identity.email ? (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <a
                    href={`mailto:${identity.email}`}
                    className="text-foreground/80 hover:text-info flex items-center gap-1.5 truncate transition-colors"
                  >
                    <EnvelopeIcon
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{identity.email}</span>
                  </a>
                  <CopyButton value={identity.email} label="email" />
                </div>
              ) : null}
              {identity.phone ? (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <a
                    href={`tel:${identity.phone}`}
                    className="text-foreground/80 hover:text-info flex items-center gap-1.5 truncate transition-colors"
                  >
                    <Phone
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{identity.phone}</span>
                  </a>
                  <CopyButton value={identity.phone} label="phone number" />
                </div>
              ) : null}
            </div>
          ) : null}

          {identity.isBusiness ? (
            <div className="border-border/60 space-y-2 border-t pt-2">
              <span className="text-muted-foreground text-[0.6875rem] font-medium tracking-wider uppercase">
                Primary Contact
              </span>
              {identity.contact ? (
                <div className="bg-muted/20 flex items-start gap-2.5 rounded-md p-2.5 text-xs">
                  <CustomerAvatar
                    name={identity.contact.name}
                    src={identity.contact.avatar}
                    className="size-7 shrink-0 text-[0.625rem]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground/90 truncate font-medium">
                      {identity.contact.name}
                    </p>
                    {identity.contact.email ? (
                      <a
                        href={`mailto:${identity.contact.email}`}
                        className="text-muted-foreground hover:text-info mt-1 flex items-center gap-1.5 truncate text-[0.75rem] transition-colors"
                      >
                        <EnvelopeIcon
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {identity.contact.email}
                        </span>
                      </a>
                    ) : null}
                    {identity.contact.phone ? (
                      <a
                        href={`tel:${identity.contact.phone}`}
                        className="text-muted-foreground hover:text-info mt-1 flex items-center gap-1.5 truncate text-[0.75rem] transition-colors"
                      >
                        <Phone className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {identity.contact.phone}
                        </span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No contact on file
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="bg-muted/10 border-t px-4 py-2.5">
          <Link
            href={targetCustomerHref}
            className="text-muted-foreground hover:text-info flex items-center justify-between text-xs font-medium transition-colors"
          >
            <span>View full profile</span>
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
      <section className="876-card overflow-hidden">
        <div className="bg-muted/20 flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="space-y-3.5 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
        <div className="bg-muted/10 border-t px-4 py-2.5">
          <Skeleton className="h-3.5 w-28" />
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
