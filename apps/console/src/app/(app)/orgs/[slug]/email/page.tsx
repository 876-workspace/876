import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import {
  DomainListPanel,
  DomainListPanelSkeleton,
} from '@876/communications-ui/panels/domain-list-panel'
import {
  DomainRecordsPanel,
  DomainRecordsPanelSkeleton,
} from '@876/communications-ui/panels/domain-records-panel'
import {
  SenderListPanel,
  SenderListPanelSkeleton,
} from '@876/communications-ui/panels/sender-list-panel'
import {
  TemplateListPanel,
  TemplateListPanelSkeleton,
} from '@876/communications-ui/panels/template-list-panel'

import {
  DeliveriesTable,
  DeliveriesTableSkeleton,
} from '@/features/email/components/deliveries-table'
import { DomainVerifyActions } from '@/features/email/components/domain-verify-actions'
import { resolveOrg } from '@/features/orgs/org-data'
import { communications } from '@/lib/services/communications'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Email' }

  return { title: `${org.name ?? org.slug} • Email - Organizations` }
}

function toError(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const typed = error as { code: string; message: string }
    return { code: typed.code, message: typed.message }
  }
  return { code: 'email/load-failed', message: fallback }
}

export default function OrganizationEmailPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <h1 className="876-page-title">Email</h1>
      <Suspense fallback={<SenderListPanelSkeleton />}>
        <SendersData params={params} />
      </Suspense>
      <Suspense fallback={<DomainListPanelSkeleton />}>
        <DomainsData params={params} />
      </Suspense>
      <Suspense
        fallback={<DomainRecordsPanelSkeleton domainName="Sending domain" />}
      >
        <DomainRecordsData params={params} />
      </Suspense>
      <Suspense fallback={<TemplateListPanelSkeleton />}>
        <TemplatesData params={params} />
      </Suspense>
      <Suspense fallback={<DeliveriesTableSkeleton />}>
        <DeliveriesData params={params} />
      </Suspense>
    </div>
  )
}

async function orgBaseHref(slug: string) {
  const org = await resolveOrg(slug)
  if (!org) notFound()
  return { org, baseHref: `/orgs/${slug}/email` }
}

async function SendersData({ params }: Props) {
  const { slug } = await params
  const { org, baseHref } = await orgBaseHref(slug)

  const result = await communications.senders.list(org.id)
  if (result.error || !result.data)
    return (
      <SenderListPanel
        state={{
          status: 'error',
          error: toError(
            result.error,
            'Senders could not be loaded. Try again.'
          ),
        }}
        baseHref={baseHref}
      />
    )
  if (result.data.data.length === 0)
    return <SenderListPanel state={{ status: 'empty' }} baseHref={baseHref} />
  return (
    <SenderListPanel
      state={{ status: 'ready', data: result.data.data }}
      baseHref={baseHref}
    />
  )
}

async function DomainsData({ params }: Props) {
  const { slug } = await params
  const { org, baseHref } = await orgBaseHref(slug)

  const result = await communications.domains.list(org.id)
  if (result.error || !result.data)
    return (
      <DomainListPanel
        state={{
          status: 'error',
          error: toError(
            result.error,
            'Sending domains could not be loaded. Try again.'
          ),
        }}
        baseHref={baseHref}
      />
    )
  if (result.data.data.length === 0)
    return <DomainListPanel state={{ status: 'empty' }} baseHref={baseHref} />
  return (
    <div className="space-y-4">
      <DomainListPanel
        state={{ status: 'ready', data: result.data.data }}
        baseHref={baseHref}
      />
      <DomainVerifyActions
        organizationId={org.id}
        domains={result.data.data.map((domain) => ({
          id: domain.id,
          name: domain.name,
          status: domain.status,
        }))}
      />
    </div>
  )
}

async function DomainRecordsData({ params }: Props) {
  const { slug } = await params
  const { org, baseHref } = await orgBaseHref(slug)

  const result = await communications.domains.list(org.id)
  if (result.error || !result.data)
    return (
      <DomainRecordsPanel
        state={{
          status: 'error',
          error: toError(
            result.error,
            'DNS records could not be loaded. Try again.'
          ),
        }}
        domainName="Sending domain"
        domainId="unknown"
        baseHref={baseHref}
      />
    )
  const first = result.data.data[0]
  if (!first || first.records.length === 0)
    return (
      <DomainRecordsPanel
        state={{ status: 'empty' }}
        domainName={first?.name ?? 'Sending domain'}
        domainId={first?.id ?? 'unknown'}
        baseHref={baseHref}
      />
    )
  return (
    <DomainRecordsPanel
      state={{ status: 'ready', data: first.records }}
      domainName={first.name}
      domainId={first.id}
      baseHref={baseHref}
    />
  )
}

async function TemplatesData({ params }: Props) {
  const { slug } = await params
  const { org, baseHref } = await orgBaseHref(slug)

  const result = await communications.templates.list(org.id)
  if (result.error || !result.data)
    return (
      <TemplateListPanel
        state={{
          status: 'error',
          error: toError(
            result.error,
            'Email templates could not be loaded. Try again.'
          ),
        }}
        baseHref={baseHref}
      />
    )
  if (result.data.data.length === 0)
    return <TemplateListPanel state={{ status: 'empty' }} baseHref={baseHref} />
  return (
    <TemplateListPanel
      state={{ status: 'ready', data: result.data.data }}
      baseHref={baseHref}
    />
  )
}

async function DeliveriesData({ params }: Props) {
  const { slug } = await params
  const { org } = await orgBaseHref(slug)

  const result = await communications.deliveries.list(org.id)
  if (result.error || !result.data)
    return (
      <DeliveriesTable
        state={{
          status: 'error',
          error: toError(
            result.error,
            'Deliveries could not be loaded. Try again.'
          ),
        }}
      />
    )
  if (result.data.data.length === 0)
    return <DeliveriesTable state={{ status: 'empty' }} />
  return <DeliveriesTable state={{ status: 'ready', data: result.data.data }} />
}
