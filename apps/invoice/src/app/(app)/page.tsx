import { getInvoiceContext } from '@/lib/auth/context'

export default async function OverviewPage() {
  const context = await getInvoiceContext()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="text-muted-foreground">
        Welcome to 876 Invoice{context ? ` — ${context.orgName}` : ''}.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Invoices</div>
          <div className="mt-2 text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Outstanding</div>
          <div className="mt-2 text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-muted-foreground text-sm">Paid</div>
          <div className="mt-2 text-2xl font-semibold">—</div>
        </div>
      </div>
    </div>
  )
}
