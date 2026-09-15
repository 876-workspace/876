import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import {
  InvoiceDocumentPanel,
  type InvoiceDocumentSeller,
} from '@876/billing-ui/panels/invoice-document-panel'
import type { PlatformOrganizationProfile } from '@876/core/platform'

import { formatDate, formatMoney } from '@/lib/finance/format'
import { getManageContext } from '@/lib/auth/manage-context'
import { createBillingIntegration } from '@/lib/services/billing'
import { getPlatformClient } from '@/lib/services/platform'

import { resolveInvoice } from '../_lib/invoice-data'
import { toInvoiceDocumentProps } from '../_lib/invoice-document'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function InvoiceOverviewPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<InvoiceOverviewFallback />}>
      <InvoiceOverviewData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

function InvoiceOverviewFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function factValue(value: string | null) {
  return value || <span className="text-muted-foreground">&mdash;</span>
}

function countryLabelFor(countryCode: string | null): string | null {
  if (!countryCode) return null
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ??
      countryCode
    )
  } catch {
    return countryCode
  }
}

function sellerFromProfile(
  profile: PlatformOrganizationProfile | null,
  fallback: { name: string | null; logoUrl: string | null }
): InvoiceDocumentSeller {
  const country = countryLabelFor(profile?.country_code ?? null)
  return {
    name: profile?.name ?? fallback.name ?? 'Organization',
    countryLabel: country,
    logoUrl: profile?.logo_url ?? fallback.logoUrl,
    email: profile?.primary_email ?? null,
    phone: profile?.primary_phone ?? null,
    address: {
      line1: profile?.address_line1 ?? null,
      line2: profile?.address_line2 ?? null,
      city: profile?.city ?? null,
      countryLabel: country,
    },
  }
}

async function InvoiceOverviewData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx) notFound()

  const billing = createBillingIntegration()
  const platform = await getPlatformClient()
  const [invoice, resolved, profileResult] = await Promise.all([
    resolveInvoice(orgSlug, id),
    billing.documentTemplates.resolve(ctx.orgId, 'invoice'),
    platform.organizations.retrieveProfile(ctx.orgId),
  ])
  if (!invoice) notFound()

  const seller = sellerFromProfile(
    !profileResult.error ? profileResult.data : null,
    { name: ctx.orgName, logoUrl: ctx.orgLogoUrl }
  )
  const template =
    !resolved.error && resolved.data
      ? { layout: resolved.data.layout, settings: resolved.data.settings }
      : undefined
  const branding =
    !resolved.error && resolved.data ? resolved.data.branding : undefined

  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
          <DetailCardFact
            label="Customer"
            value={factValue(invoice.customer?.name ?? invoice.customerId)}
          />
          <DetailCardFact label="Status" value={factValue(invoice.status)} />
          <DetailCardFact
            label="Issued"
            value={factValue(formatDate(invoice.issueAt))}
          />
          <DetailCardFact
            label="Due"
            value={factValue(formatDate(invoice.dueAt))}
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Amounts">
        <DetailCardFacts>
          <DetailCardFact
            label="Subtotal"
            value={formatMoney(invoice.subtotalAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Tax"
            value={formatMoney(invoice.taxAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Total"
            value={formatMoney(invoice.totalAmount, invoice.currency)}
          />
          <DetailCardFact
            label="Amount due"
            value={formatMoney(invoice.amountDue, invoice.currency)}
          />
          <DetailCardFact
            label="Amount paid"
            value={formatMoney(invoice.amountPaid, invoice.currency)}
          />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Document">
        <InvoiceDocumentPanel
          {...toInvoiceDocumentProps(invoice, seller)}
          seller={seller}
          footer={null}
          template={template}
          branding={branding}
        />
      </DetailCardSection>
    </div>
  )
}
