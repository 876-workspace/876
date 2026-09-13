import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { documentStatusVariant } from '@876/billing-ui/document-status'
import { Skeleton } from '@876/ui/skeleton'

import { resolveInvoice } from '../_lib/invoice-data'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params
  const invoice = await resolveInvoice(orgSlug, id)
  if (!invoice) return { title: 'Invoice not found' }

  return { title: `${invoice.number} - Invoices` }
}

/**
 * The invoice record card in the detail column. Awaits `params` and nothing
 * else: the header streams behind its own boundary, where `notFound()` is
 * decided.
 */
export default async function InvoiceDetailLayout({ children, params }: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/invoices`

  return (
    <DetailCard aria-label="Invoice">
      <Suspense
        key={id}
        fallback={<InvoiceHeaderFallback closeHref={closeHref} />}
      >
        <InvoiceHeader orgSlug={orgSlug} id={id} closeHref={closeHref} />
      </Suspense>
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function InvoiceHeader({
  orgSlug,
  id,
  closeHref,
}: {
  orgSlug: string
  id: string
  closeHref: string
}) {
  const invoice = await resolveInvoice(orgSlug, id)
  if (!invoice) notFound()

  return (
    <DetailCardHeader
      title={invoice.number}
      meta={
        <Badge variant={documentStatusVariant(invoice.status)}>
          {invoice.status}
        </Badge>
      }
      subtitle={invoice.customer?.name ?? invoice.customerId}
      closeHref={closeHref}
      closeLabel="Close invoice details"
    />
  )
}

function InvoiceHeaderFallback({ closeHref }: { closeHref: string }) {
  return (
    <DetailCardHeader
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-72" />}
      closeHref={closeHref}
      closeLabel="Close invoice details"
    />
  )
}
