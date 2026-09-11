'use client'

import { useRouter } from 'next/navigation'
import {
  RecurringInvoiceLifecycleActions,
  type RecurringInvoiceLifecycleActionsProps,
} from '@876/billing-ui/recurring-invoice-lifecycle-actions'

import { client } from '@/lib/client'

export function InvoiceRecurringInvoiceLifecycleActions({
  recurringInvoiceId,
  status,
  generatedCount,
  canWrite,
}: {
  recurringInvoiceId: string
  status: RecurringInvoiceLifecycleActionsProps['status']
  generatedCount: number
  canWrite: boolean
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  if (!canWrite) return null

  return (
    <RecurringInvoiceLifecycleActions
      status={status}
      generatedCount={generatedCount}
      onPause={async () => {
        const result = await client.recurringInvoices.pause(recurringInvoiceId)
        if (result.error) return { error: result.error.message }
        refresh()
        return { error: null }
      }}
      onResume={async () => {
        const result = await client.recurringInvoices.resume(recurringInvoiceId)
        if (result.error) return { error: result.error.message }
        refresh()
        return { error: null }
      }}
      onStop={async () => {
        const result = await client.recurringInvoices.stop(recurringInvoiceId)
        if (result.error) return { error: result.error.message }
        refresh()
        return { error: null }
      }}
      onDelete={async () => {
        const result = await client.recurringInvoices.remove(recurringInvoiceId)
        if (result.error) return { error: result.error.message }
        router.push('/recurring-invoices')
        router.refresh()
        return { error: null }
      }}
    />
  )
}
