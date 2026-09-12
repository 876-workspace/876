'use client'

import {
  QuoteLifecycleActions,
  type QuoteLifecycleStatus,
  type QuoteLifecycleUiAction,
} from '@876/billing-ui/quote-lifecycle-actions'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'

export function QuoteActions({
  quoteId,
  status,
  isExpired,
  canWrite,
  canDelete,
  canConvert,
  convertedInvoiceId,
}: {
  quoteId: string
  status: QuoteLifecycleStatus
  isExpired: boolean
  canWrite: boolean
  canDelete: boolean
  canConvert: boolean
  convertedInvoiceId?: string | null
}) {
  const router = useRouter()

  const onAction = async (action: QuoteLifecycleUiAction) => {
    if (action === 'delete') {
      const result = await client.documents.delete(quoteId, '/api/quotes')
      if (result.error) return { error: result.error.message }
      router.push('/quotes')
      router.refresh()
      return
    }

    if (action === 'convert') {
      const result = await client.documents.convertQuoteToInvoice(quoteId)
      if (result.error || !result.data)
        return {
          error: result.error?.message ?? 'Failed to convert the quote.',
        }
      router.push(`/invoices/${result.data.id}`)
      router.refresh()
      return
    }

    const result = await client.documents.transitionQuote(quoteId, action)
    if (result.error) return { error: result.error.message }
    router.refresh()
  }

  return (
    <QuoteLifecycleActions
      status={status}
      isExpired={isExpired}
      canWrite={canWrite}
      canDelete={canDelete}
      canConvert={canConvert}
      editHref={`/quotes/${quoteId}/edit`}
      sharePath={`/quotes/${quoteId}`}
      convertedInvoiceHref={
        convertedInvoiceId ? `/invoices/${convertedInvoiceId}` : undefined
      }
      onAction={onAction}
    />
  )
}
