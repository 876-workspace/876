'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
} from '@876/billing'
import { DocumentEmailComposer } from '@876/billing-ui/panels/document-email-composer'
import {
  QuoteLifecycleActions,
  type QuoteLifecycleStatus,
  type QuoteLifecycleUiAction,
} from '@876/billing-ui/quote-lifecycle-actions'

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
  const [emailOpen, setEmailOpen] = useState(false)

  const prepareEmail = useCallback(
    async (params: DocumentEmailPrepareParams) => {
      const result = await client.documents.prepareQuoteEmail(quoteId, params)
      if (result.error)
        return { data: null, error: { message: result.error.message } }
      return { data: result.data, error: null }
    },
    [quoteId]
  )

  const sendEmail = useCallback(
    async (params: DocumentEmailSendParams) => {
      const result = await client.documents.sendQuoteEmail(quoteId, params)
      if (result.error)
        return { data: null, error: { message: result.error.message } }
      router.refresh()
      return { data: result.data, error: null }
    },
    [quoteId, router]
  )

  const onAction = async (action: QuoteLifecycleUiAction) => {
    if (action === 'send') {
      setEmailOpen(true)
      return
    }

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
    <>
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

      {canWrite ? (
        <DocumentEmailComposer
          open={emailOpen}
          onOpenChange={setEmailOpen}
          documentLabel="quote"
          prepare={prepareEmail}
          send={sendEmail}
        />
      ) : null}
    </>
  )
}
