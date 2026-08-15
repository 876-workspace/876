import type { Invoice } from '@876/billing'

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Invoices for this organization will appear here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Invoice</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">ID</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-4 py-2">{String((inv as any).number ?? inv.id)}</td>
              <td className="px-4 py-2">{String((inv as any).status ?? '—')}</td>
              <td className="px-4 py-2 font-mono text-xs">{inv.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
