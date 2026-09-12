import { notFound, redirect } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { listQuotes } from '@/app/(app)/_lib/list-data'
import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'

import { QuoteEditForm } from '../_components/quote-edit-form'

export const metadata = { title: 'Edit Quote' }

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>
}) {
  const { quoteId } = await params
  await requireAppPermission('quotes.edit')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = await listQuotes(context.orgId)
  const quote = result.data?.data.find((row) => row.id === quoteId)
  if (!quote) notFound()
  if (quote.status !== 'DRAFT')
    redirect(`/quotes/${encodeURIComponent(quoteId)}`)

  return (
    <Page>
      <PageHeader>
        <PageTitle>Edit Quote</PageTitle>
      </PageHeader>
      <QuoteEditForm
        quoteId={quote.id}
        initial={{
          issueAt: typeof quote.issueAt === 'number' ? quote.issueAt : null,
          expiresAt:
            typeof quote.expiresAt === 'number' ? quote.expiresAt : null,
          notes: typeof quote.notes === 'string' ? quote.notes : null,
          terms: typeof quote.terms === 'string' ? quote.terms : null,
        }}
      />
    </Page>
  )
}
