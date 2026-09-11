import { Link } from '../link'
import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'
import { barHeightPercent, type ReportBar } from './report-bars'

export interface AgingTopCustomer {
  customerId: string
  customerName: string | null
  outstandingDisplay: string
}

export interface ReceivablesAgingCurrencyBlock {
  currency: string
  currentDisplay: string
  days1To30Display: string
  days31To60Display: string
  days61To90Display: string
  over90Display: string
  totalOutstandingDisplay: string
  totalOverdueDisplay: string
  bucketBars: Array<ReportBar & { bucket: string }>
  topCustomers: AgingTopCustomer[]
}

export interface ReceivablesAgingPanelData {
  blocks: ReceivablesAgingCurrencyBlock[]
}

const BUCKET_LABELS: Record<string, string> = {
  current: 'Current',
  days1To30: '1–30 days',
  days31To60: '31–60 days',
  days61To90: '61–90 days',
  over90: 'Over 90 days',
}

export function ReceivablesAgingPanel({
  state,
  customerHref,
  ...props
}: PanelProps & {
  state: PanelState<ReceivablesAgingPanelData>
  customerHref: (customerId: string) => string
}) {
  return (
    <PanelFrame title="Receivables aging" {...props}>
      {state.status === 'ready' ? (
        state.data.blocks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            No outstanding receivables.
          </p>
        ) : (
          <div className="space-y-6">
            {state.data.blocks.map((block) => (
              <section
                key={block.currency}
                aria-label={`${block.currency} receivables aging`}
              >
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {block.currency}
                </p>
                <div
                  role="img"
                  aria-label={`${block.currency} outstanding by aging bucket`}
                  className="mt-2 flex h-24 items-stretch gap-1.5"
                >
                  {block.bucketBars.map((bar) => {
                    const maxRaw = block.bucketBars
                      .reduce(
                        (max, candidate) =>
                          BigInt(candidate.rawValue) > max
                            ? BigInt(candidate.rawValue)
                            : max,
                        0n
                      )
                      .toString()
                    return (
                      <div
                        key={bar.bucket}
                        className="flex min-w-0 flex-1 flex-col"
                        title={`${BUCKET_LABELS[bar.bucket] ?? bar.bucket}: ${bar.valueLabel}`}
                      >
                        <div className="flex min-h-0 flex-1 items-end">
                          <div
                            role="img"
                            aria-label={`${BUCKET_LABELS[bar.bucket] ?? bar.bucket}: ${bar.valueLabel}`}
                            className="bg-primary w-full min-w-2 rounded-t"
                            style={{
                              height: `${barHeightPercent(bar.rawValue, maxRaw)}%`,
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground mt-1 w-full truncate text-center text-[10px]">
                          {BUCKET_LABELS[bar.bucket] ?? bar.bucket}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">
                      Total outstanding
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.totalOutstandingDisplay}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">Total overdue</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.totalOverdueDisplay}
                    </dd>
                  </div>
                </dl>
                {block.topCustomers.length > 0 ? (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-left text-xs">
                        <th className="py-1 pr-2 font-medium">Customer</th>
                        <th className="py-1 text-right font-medium tabular-nums">
                          Outstanding
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.topCustomers.map((customer) => (
                        <tr key={customer.customerId} className="border-t">
                          <td className="py-1.5 pr-2 font-medium">
                            <Link href={customerHref(customer.customerId)}>
                              {customer.customerName ?? customer.customerId}
                            </Link>
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {customer.outstandingDisplay}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </section>
            ))}
          </div>
        )
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">
          No outstanding receivables.
        </p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function ReceivablesAgingPanelSkeleton() {
  return (
    <PanelFrame title="Receivables aging">
      <PanelRowsSkeleton rows={5} />
    </PanelFrame>
  )
}
