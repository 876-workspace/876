import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Page, PageBreadcrumb } from '@876/ui/page'
import {
  Calendar,
  CommandLineIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  Phone,
  SparklesIcon,
  TagIcon,
  User,
} from '@876/ui/icons'
import { formatDate, formatDateTime } from '@876/core/timestamps'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import type { RequestCategory, RequestSource } from '@/types/crm'

import { CopyButton } from '../_components/copy-button'
import { RequestHeaderActions } from '../_components/request-header-actions'
import { RequestNotesSection } from '../_components/request-notes'
import { RequestPriorityBadge } from '../_components/request-priority-badge'
import { RequestStatusBadge } from '../_components/request-status-badge'

type Props = { params: Promise<{ requestId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const context = await requireCrmContext()
  const { requestId } = await params
  const result = await $876.requests.retrieve(context.orgId, requestId)
  if (!result.data) return { title: 'Request' }
  return {
    title: `Request #${result.data.number} · ${result.data.subject}`,
  }
}

export default async function RequestPage({ params }: Props) {
  const context = await requireCrmContext()
  const { requestId } = await params
  const [result, notesResult] = await Promise.all([
    $876.requests.retrieve(context.orgId, requestId),
    $876.requestNotes.list(context.orgId, requestId),
  ])
  if (result.error?.code === 'crm/request-not-found') notFound()
  if (result.error) throw new Error(result.error.message)

  const request = result.data
  // A failed notes read is an outage, not an empty thread. Swallowing it with
  // `?? []` renders "no notes" over a broken request and hides the real cause.
  if (notesResult.error) throw new Error(notesResult.error.message)

  const notes = notesResult.data.data
  const customerResult = await $876.customerProfiles.retrieve(
    context.orgId,
    request.customerId
  )
  const profile = customerResult.data?.profile
  const customer = customerResult.data?.customer
  const customerName =
    customer?.name ?? profile?.billingCustomerId ?? request.customerId

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
      <header className="mb-6">
        {/*
          The back-link shares the actions row rather than owning one of its
          own: that row already existed and was half empty, so this costs no
          height, and it keeps the identity row from having to carry a
          navigation control alongside the request's own badges.
        */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <PageBreadcrumb
            href="/requests"
            label="Requests"
            className="-ml-2.5"
          />
          <RequestHeaderActions
            requestId={request.id}
            requestNumber={request.number}
            status={request.status}
            customerId={request.customerId}
          />
        </div>

        {/* The subject leads, with the badges reading as qualifiers on it. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-muted-foreground font-mono text-base font-semibold">
            #{request.number}
          </span>
          <h1 className="876-page-title min-w-0 text-balance">
            {request.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <RequestPriorityBadge priority={request.priority} />
            <Badge variant="outline" className="gap-1">
              <TagIcon className="size-3 shrink-0" aria-hidden="true" />
              <span>{formatCategory(request.category)}</span>
            </Badge>
          </div>
        </div>

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link
            href={`/customers/${request.customerId}`}
            className="text-foreground hover:text-primary inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
          >
            <User className="size-4 shrink-0" aria-hidden="true" />
            <span>{customerName}</span>
          </Link>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SourceIcon source={request.source} />
            <span>{formatSource(request.source)}</span>
          </span>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0" aria-hidden="true" />
            <span>Created {formatDate(request.createdAt)}</span>
          </span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <RequestNotesSection
            requestId={request.id}
            notes={notes}
            currentUserId={context.userId}
          />
        </div>

        {/* Right column: the customer, then the request's own fields. */}
        <aside className="min-w-0 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <CustomerAvatar name={customerName} size="lg" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/customers/${request.customerId}`}
                className="block truncate text-base font-semibold hover:underline"
              >
                {customerName}
              </Link>
              <p className="text-muted-foreground truncate text-sm">
                {customer?.companyName ||
                  formatCustomerType(customer?.customerType)}
              </p>
              {customer?.customerKind ? (
                <Badge variant="secondary" className="mt-1.5 capitalize">
                  {customer.customerKind.toLowerCase()}
                </Badge>
              ) : null}
            </div>
          </div>

          {/*
              Contact details open by default: reaching the customer is the
              first thing anyone does on a request, so it must not cost a click.
              The request's own fields are reference material and stay closed.
            */}
          <Accordion defaultValue={['contact']} className="mt-2">
            <AccordionItem value="contact">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2">
                  <User
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Contact details
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5">
                {customer?.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm no-underline! transition-colors"
                  >
                    <EnvelopeIcon
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{customer.email}</span>
                  </a>
                ) : (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <EnvelopeIcon
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    No email on file
                  </p>
                )}

                {customer?.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm no-underline! transition-colors"
                  >
                    <Phone className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{customer.phone}</span>
                  </a>
                ) : (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Phone className="size-4 shrink-0" aria-hidden="true" />
                    No phone on file
                  </p>
                )}

                <Link
                  href={`/customers/${request.customerId}`}
                  className="text-primary inline-flex items-center gap-1 pt-1 text-sm font-medium no-underline! hover:underline!"
                >
                  <span>View customer profile</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="details" className="border-b-0">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2">
                  <InformationCircleIcon
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Request details
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-3 text-sm">
                  <DetailRow label="Status">
                    <RequestStatusBadge status={request.status} />
                  </DetailRow>

                  <DetailRow label="Priority">
                    <RequestPriorityBadge priority={request.priority} />
                  </DetailRow>

                  <DetailRow label="Category">
                    <span className="text-foreground font-medium">
                      {formatCategory(request.category)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Source">
                    <span className="text-foreground flex items-center gap-1.5 font-medium">
                      <SourceIcon source={request.source} />
                      {formatSource(request.source)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Assignee">
                    {request.assigneeId ? (
                      <span className="text-foreground font-mono text-xs">
                        {request.assigneeId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </DetailRow>

                  <DetailRow label="Created">
                    <span className="text-foreground font-medium">
                      {formatDateTime(request.createdAt)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Updated">
                    <span className="text-foreground font-medium">
                      {formatDateTime(request.updatedAt)}
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </aside>
      </div>
    </Page>
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

function formatCategory(category: RequestCategory): string {
  switch (category) {
    case 'GENERAL':
      return 'General'
    case 'SUPPORT':
      return 'Support'
    case 'BILLING':
      return 'Billing'
    case 'SALES':
      return 'Sales'
    case 'COMPLAINT':
      return 'Complaint'
    case 'FEEDBACK':
      return 'Feedback'
    default:
      return category.replaceAll('_', ' ')
  }
}

function formatSource(source: RequestSource): string {
  switch (source) {
    case 'CRM':
      return 'CRM'
    case 'EMAIL':
      return 'Email'
    case 'PHONE':
      return 'Phone'
    case 'CHAT':
      return 'Chat'
    case 'WEB':
      return 'Web form'
    case 'API':
      return 'API'
    default:
      return source.replaceAll('_', ' ')
  }
}

function formatCustomerType(type?: string): string {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}

function SourceIcon({ source }: { source: RequestSource }) {
  switch (source) {
    case 'EMAIL':
      return <EnvelopeIcon className="size-3.5 shrink-0" aria-hidden="true" />
    case 'PHONE':
      return <Phone className="size-3.5 shrink-0" aria-hidden="true" />
    case 'WEB':
      return <GlobeAltIcon className="size-3.5 shrink-0" aria-hidden="true" />
    case 'API':
      return (
        <CommandLineIcon className="size-3.5 shrink-0" aria-hidden="true" />
      )
    default:
      return <SparklesIcon className="size-3.5 shrink-0" aria-hidden="true" />
  }
}
