import { redirect } from 'next/navigation'

import { InvoicesTable } from '@/components/invoices/invoices-table'
import { getInvoiceContext } from '@/lib/auth/context'
import { get876Client } from '@/lib/876'

export default async function InvoicesPage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  let invoices: any[] = []
  let error: { message: string } | null = null

  try {
    const client = await get876Client(context.orgId)
    const result = await client.invoices.list()
    if (result.error) error = result.error
    else invoices = result.data.data as any[]
  } catch (e) {
    error = {
      message: e instanceof Error ? e.message : 'Failed to load invoices',
    }
  }

  if (error) {
    if (error.message.toLowerCase().includes('not authenticated'))
      redirect('/login')
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-4 text-sm">
          Failed to load invoices: {error.message}
        </div>
        <p className="text-muted-foreground text-sm">
          If your workspace is provisioning, please try again shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-muted-foreground text-sm">
          Invoices for this organization.
        </p>
      </div>
      <InvoicesTable invoices={invoices} />
    </div>
  )
}
