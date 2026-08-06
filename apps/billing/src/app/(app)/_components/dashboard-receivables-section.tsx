import { formatMoney } from '../_lib/dashboard-format'

type IssuedInvoiceTotalMetric = {
  currency: string
  totalOutstanding: bigint
  totalIssued: bigint
}

export function DashboardReceivablesSection({
  metrics,
}: {
  metrics: IssuedInvoiceTotalMetric[]
}) {
  return (
    <section className="876-card group border-border relative overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="pointer-events-none absolute top-0 right-0 bg-gradient-to-bl from-rose-500/10 via-transparent to-transparent p-32 opacity-50" />
      <div className="relative p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold tracking-tight">
            Outstanding Receivables
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Total value of issued invoices and pending balances.
          </p>
        </div>

        {metrics.length === 0 ? (
          <div className="bg-muted/30 border-border/60 rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm font-semibold">No finalized invoices</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Finalize an open invoice to see outstanding balances.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.currency}
                className="bg-background/50 border-border/50 rounded-xl border p-5 shadow-sm backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    {metric.currency} Outstanding
                  </p>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    Owed
                  </span>
                </div>
                <p className="text-3xl font-extrabold tracking-tighter text-rose-600 dark:text-rose-400">
                  {formatMoney(metric.totalOutstanding, metric.currency)}
                </p>
                <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3">
                  <p className="text-muted-foreground text-sm font-medium">
                    Total Invoiced (All-time)
                  </p>
                  <p className="text-sm font-semibold">
                    {formatMoney(metric.totalIssued, metric.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
