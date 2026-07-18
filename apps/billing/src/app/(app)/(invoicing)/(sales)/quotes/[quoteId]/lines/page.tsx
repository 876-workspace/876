import { notFound } from 'next/navigation'

import { DocumentLines } from '@/components/document-lines'
import { resolveQuote } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function QuoteLinesPage({
  params,
}: {
  params: Promise<{ quoteId: string }>
}) {
  const { quoteId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const quote = await resolveQuote(context.tenant.id, quoteId)
  if (!quote) notFound()

  return (
    <>
      <DocumentLines lines={quote.lines} currency={quote.currency} />
    </>
  )
}
