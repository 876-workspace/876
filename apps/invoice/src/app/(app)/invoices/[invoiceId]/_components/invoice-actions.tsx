'use client'

import { useRouter } from 'next/navigation'

import { InvoiceLifecycleActions } from '@876/billing-ui/invoice-lifecycle-actions'

import { client } from '@/lib/client'

import {
  getInvoiceEditability,
  type InvoiceStatus,
} from '../_lib/invoice-editability'

export function InvoiceActions({
  invoiceId,
  customerId,
  status,
  canWrite,
  canRecordPayment,
}: {
  invoiceId: string
  customerId: string
  status: InvoiceStatus
  canWrite: boolean
  canRecordPayment: boolean
}) {
  const router = useRouter()
  const editability = getInvoiceEditability(status)
  const paymentParams = new URLSearchParams({ customerId, invoiceId })

  if (!canWrite && !canRecordPayment) return null

  return (
    <InvoiceLifecycleActions
      status={status}
      editHref={canWrite ? `/invoices/${invoiceId}/edit` : undefined}
      recordPaymentHref={
        canRecordPayment ? `/payments/new?${paymentParams.toString()}` : undefined
      }
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
