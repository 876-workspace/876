'use client'

import { useRouter } from 'next/navigation'

import { InvoiceLifecycleActions } from '@876/billing-ui/invoice-lifecycle-actions'

import { client } from '@/lib/client'
import type { InvoiceStatus } from '@/types/invoice'

import { getInvoiceEditability } from '../_lib/invoice-editability'

export function InvoiceActions({
  invoiceId,
  customerId,
  status,
  canRecordPayment,
}: {
  invoiceId: string
  customerId: string
  status: InvoiceStatus
  canRecordPayment: boolean
}) {
  const router = useRouter()
  const editability = getInvoiceEditability(status)
  const paymentParams = new URLSearchParams({ customerId, invoiceId })

  return (
    <InvoiceLifecycleActions
      status={status}
      editHref={`/invoices/${invoiceId}/edit`}
      recordPaymentHref={
        canRecordPayment ? `/payments/new?${paymentParams.toString()}` : undefined
      }
      canEdit={editability.editable}
      canDelete={editability.deletable}
      onFinalize={
        status === 'DRAFT'
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
        status !== 'DRAFT' &&
        status !== 'VOID' &&
        status !== 'UNCOLLECTIBLE'
          ? async () => {
              const result = await client.invoices.send(invoiceId)
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onVoid={
        status === 'OPEN' || status === 'SENT'
          ? async (reason) => {
              const result = await client.invoices.void(invoiceId, { reason })
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onWriteOff={
        status === 'OPEN' ||
        status === 'SENT' ||
        status === 'PARTIALLY_PAID' ||
        status === 'OVERDUE'
          ? async (reason) => {
              const result = await client.invoices.writeOff(invoiceId, { reason })
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onDelete={
        editability.deletable
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
  )
}
