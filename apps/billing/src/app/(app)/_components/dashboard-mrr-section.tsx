import { formatMoney } from '../_lib/dashboard-format'

type RecurringRevenueMetric = {
  currency: string
  mrr: bigint
  arr: bigint
}

export function DashboardMrrSection({
  metrics,
}: {
  metrics: RecurringRevenueMetric[]
}) {
  return (
    <section className="876-card group border-border relative overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="pointer-events-none absolute top-0 right-0 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent p-32 opacity-50" />
      <div className="relative p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold tracking-tight">
            Recurring Revenue
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Contracted recurring value from active subscriptions.
            <br />
            <span className="text-xs italic">
              (Does not include one-off invoices)
            </span>
          </p>
        </div>

        {metrics.length === 0 ? (
          <div className="bg-muted/30 border-border/60 rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm font-semibold">No recurring subscriptions</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a recurring price and subscription to track MRR.
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
                    {metric.currency} MRR
                  </p>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    Active
                  </span>
                </div>
                <p className="text-3xl font-extrabold tracking-tighter">
                  {formatMoney(metric.mrr, metric.currency)}
                </p>
                <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3">
                  <p className="text-muted-foreground text-sm font-medium">
                    Annualized (ARR)
                  </p>
                  <p className="text-sm font-semibold">
                    {formatMoney(metric.arr, metric.currency)}
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
