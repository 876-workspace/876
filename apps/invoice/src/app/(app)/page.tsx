import { BarChart3, ClipboardList, CreditCard, Users } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { getInvoiceContext } from '@/lib/auth/context'

export default async function OverviewPage() {
  const context = await getInvoiceContext()
  return (
    <Page>
      <div className="mb-6">
        <h1 className="876-page-title">Home</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome to 876 Invoice{context ? ` — ${context.orgName}` : ''}. Billing parity overview.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="876-card p-5">
          <div className="flex items-center gap-3">
            <span className="bg-muted flex size-8 items-center justify-center rounded-lg"><Users className="size-4" style={{ color: 'var(--876-gold)' }} /></span>
            <span className="text-muted-foreground text-sm">Customers</span>
          </div>
          <div className="mt-4 text-2xl font-semibold">—</div>
          <p className="text-muted-foreground mt-1 text-xs">Managed in the shared customer registry</p>
        </div>
        <div className="876-card p-5">
          <div className="flex items-center gap-3">
            <span className="bg-muted flex size-8 items-center justify-center rounded-lg"><ClipboardList className="size-4" style={{ color: 'var(--876-purple)' }} /></span>
            <span className="text-muted-foreground text-sm">Invoices</span>
          </div>
          <div className="mt-4 text-2xl font-semibold">—</div>
          <p className="text-muted-foreground mt-1 text-xs">Draft → Sent → Paid lifecycle</p>
        </div>
        <div className="876-card p-5">
          <div className="flex items-center gap-3">
            <span className="bg-muted flex size-8 items-center justify-center rounded-lg"><CreditCard className="size-4" style={{ color: 'var(--876-green)' }} /></span>
            <span className="text-muted-foreground text-sm">Outstanding</span>
          </div>
          <div className="mt-4 text-2xl font-semibold">—</div>
          <p className="text-muted-foreground mt-1 text-xs">Receivables from open invoices</p>
        </div>
      </div>
      <div className="876-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4" style={{ color: 'var(--876-blue)' }} />
          <h2 className="text-sm font-semibold">Getting started</h2>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">Create a customer, add an item, then draft your first quote or invoice — the same flow as 876 Billing, streamlined for invoicing.</p>
      </div>
    </Page>
  )
}
