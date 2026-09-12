'use client'

import {
  QuoteLifecycleActions,
  type QuoteLifecycleUiAction,
} from '@876/billing-ui/quote-lifecycle-actions'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'
import type { QuoteStatus } from '@/types/quote'

export function QuoteActions({
  quoteId,
  status,
  isExpired,
  convertedInvoiceId,
  canWrite,
}: {
  quoteId: string
  status: QuoteStatus
  isExpired: boolean
  convertedInvoiceId?: string | null
  canWrite: boolean
}) {
  const router = useRouter()

  const onAction = async (action: QuoteLifecycleUiAction) => {
    if (action === 'delete') {
      const result = await client.quotes.delete(quoteId)
      if (result.error) return { error: result.error.message }
      router.push('/quotes')
      router.refresh()
      return
    }

    if (action === 'convert') {
      const result = await client.quotes.convertToInvoice(quoteId)
      if (result.error || !result.data)
        return {
          error: result.error?.message ?? 'Failed to convert the quote.',
        }
      router.push(`/invoices/${result.data.id}`)
      router.refresh()
      return
    }

    const result = await client.quotes[action](quoteId)
    if (result.error) return { error: result.error.message }
    router.refresh()
  }

  return (
    <QuoteLifecycleActions
      status={status}
      isExpired={isExpired}
      canWrite={canWrite}
      canDelete={canWrite}
      canConvert={canWrite}
      editHref={`/quotes/${quoteId}/edit`}
      sharePath={`/quotes/${quoteId}`}
      convertedInvoiceHref={
        convertedInvoiceId ? `/invoices/${convertedInvoiceId}` : undefined
      }
      onAction={onAction}
    />
  )
}
