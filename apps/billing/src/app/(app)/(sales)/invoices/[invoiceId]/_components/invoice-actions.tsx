'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  DocumentEmailPrepareParams,
  DocumentEmailSendParams,
} from '@876/billing'
import { DocumentEmailComposer } from '@876/billing-ui/panels/document-email-composer'
import { DocumentToolbar } from '@876/billing-ui/panels/document-toolbar'

import { client } from '@/lib/client'
import type { InvoiceStatus } from '@/types/invoice'

import { getInvoiceEditability } from '../_lib/invoice-editability'

export function InvoiceActions({
  invoiceId,
  status,
  canWrite,
  canRecordPayment,
  recordPaymentHref,
  documentNumber,
  totalAmount,
}: {
  invoiceId: string
  status: InvoiceStatus
  canWrite: boolean
  canRecordPayment: boolean
  recordPaymentHref: string
  documentNumber: string
  totalAmount: string
}) {
  const router = useRouter()
  const editability = getInvoiceEditability(status)
  const [emailOpen, setEmailOpen] = useState(false)

  const prepareEmail = useCallback(
    async (params: DocumentEmailPrepareParams) => {
      const result = await client.invoices.prepareEmail(invoiceId, params)
      if (result.error)
        return { data: null, error: { message: result.error.message } }
      return { data: result.data, error: null }
    },
    [invoiceId]
  )

  const sendEmail = useCallback(
    async (params: DocumentEmailSendParams) => {
      const result = await client.invoices.sendEmail(invoiceId, params)
      if (result.error)
        return { data: null, error: { message: result.error.message } }
      router.refresh()
      return { data: result.data, error: null }
    },
    [invoiceId, router]
  )

  return (
    <>
      <DocumentToolbar
        status={status}
        sharePath={`/invoices/${invoiceId}`}
        document={{ number: documentNumber, totalAmount }}
        editHref={`/invoices/${invoiceId}/edit`}
        recordPaymentHref={canRecordPayment ? recordPaymentHref : undefined}
        preferencesHref={
          canWrite ? '/subscriptions/invoice-preferences' : undefined
        }
        canEdit={canWrite && editability.editable}
        canDelete={canWrite && editability.deletable}
        onFinalize={
          canWrite && status === 'DRAFT'
            ? async () => {
                const result = await client.invoices.finalize(invoiceId, {
                  autoApplyCredits: true,
                })
                if (result.error) return { error: result.error.message }
                router.refresh()
                return { error: null }
              }
            : undefined
        }
        onSend={
          canWrite &&
          status !== 'DRAFT' &&
          status !== 'VOID' &&
          status !== 'UNCOLLECTIBLE'
            ? async () => {
                setEmailOpen(true)
                return { error: null }
              }
            : undefined
        }
        onVoid={
          canWrite && (status === 'OPEN' || status === 'SENT')
            ? async (reason) => {
                const result = await client.invoices.void(invoiceId, { reason })
                if (result.error) return { error: result.error.message }
                router.refresh()
                return { error: null }
              }
            : undefined
        }
        onWriteOff={
          canWrite &&
          (status === 'OPEN' ||
            status === 'SENT' ||
            status === 'PARTIALLY_PAID' ||
            status === 'OVERDUE')
            ? async (reason) => {
                const result = await client.invoices.writeOff(invoiceId, {
                  reason,
                })
                if (result.error) return { error: result.error.message }
                router.refresh()
                return { error: null }
              }
            : undefined
        }
        onDelete={
          canWrite && editability.deletable
            ? async () => {
                const result = await client.invoices.delete(invoiceId)
                if (result.error) return { error: result.error.message }
                router.push('/invoices')
                router.refresh()
                return { error: null }
              }
            : undefined
        }
      />

      {canWrite ? (
        <DocumentEmailComposer
          open={emailOpen}
          onOpenChange={setEmailOpen}
          documentLabel="invoice"
          prepare={prepareEmail}
          send={sendEmail}
        />
      ) : null}
    </>
  )
}
