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
  status,
  canWrite,
}: {
  invoiceId: string
  status: InvoiceStatus
  canWrite: boolean
}) {
  const router = useRouter()
  const editability = getInvoiceEditability(status)

  if (!canWrite) return null

  return (
    <InvoiceLifecycleActions
      status={status}
      editHref={`/invoices/${invoiceId}/edit`}
      canEdit={editability.editable}
      canDelete={editability.deletable}
      onFinalize={
        status === 'DRAFT'
          ? async () => {
              const result = await client.documents.finalize(invoiceId)
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
              const result = await client.documents.send(invoiceId)
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onVoid={
        status === 'OPEN' || status === 'SENT'
          ? async (reason) => {
              const result = await client.documents.void(invoiceId, reason)
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
              const result = await client.documents.writeOff(invoiceId, reason)
              if (result.error) return { error: result.error.message }
              router.refresh()
              return { error: null }
            }
          : undefined
      }
      onDelete={
        editability.deletable
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
