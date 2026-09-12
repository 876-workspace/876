'use client'

import { useRouter } from 'next/navigation'

import { DocumentToolbar } from '@876/billing-ui/panels/document-toolbar'

import { client } from '@/lib/client'

import {
  getInvoiceEditability,
  type InvoiceStatus,
} from '../_lib/invoice-editability'

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

  return (
    <DocumentToolbar
      status={status}
      sharePath={`/invoices/${invoiceId}`}
      document={{ number: documentNumber, totalAmount }}
      editHref={canWrite ? `/invoices/${invoiceId}/edit` : undefined}
      recordPaymentHref={canRecordPayment ? recordPaymentHref : undefined}
      canEdit={canWrite && editability.editable}
      canDelete={canWrite && editability.deletable}
      onFinalize={
        canWrite && status === 'DRAFT'
          ? async () => {
              const result = await client.documents.finalize(invoiceId)
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
              const result = await client.documents.send(invoiceId)
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onVoid={
        canWrite && (status === 'OPEN' || status === 'SENT')
          ? async (reason) => {
              const result = await client.documents.void(invoiceId, reason)
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
              const result = await client.documents.writeOff(invoiceId, reason)
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onDelete={
        canWrite && editability.deletable
          ? async () => {
              const result = await client.documents.delete(invoiceId)
              if (result.error) return { error: result.error.message }
              router.push('/invoices')
              router.refresh()
              return { error: null }
            }
          : undefined
      }
    />
  )
}
