import { redirect } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { resolveQuote } from '@/app/(app)/_lib/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { QuoteEditForm } from '../_components/quote-edit-form'

export const metadata = { title: 'Edit Quote' }

export default async function EditQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const context = await requirePagePermission('sales:write')
  const quote = await resolveQuote(context.tenant.id, quoteId)
  if (!quote || quote.status !== 'DRAFT') redirect(`/quotes/${encodeURIComponent(quoteId)}`)

  return (
    <Page>
      <PageHeader><PageTitle>Edit Quote</PageTitle></PageHeader>
      <QuoteEditForm quoteId={quote.id} initial={{ issueAt: quote.issueAt, expiresAt: quote.expiresAt, notes: quote.notes, terms: quote.terms }} />
    </Page>
  )
}
