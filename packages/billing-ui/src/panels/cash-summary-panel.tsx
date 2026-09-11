import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'
import { ReportBars, type ReportBar } from './report-bars'

export interface CashSummaryBucket extends ReportBar {
  start: number
  end: number
}

export interface CashSummaryCurrencyBlock {
  currency: string
  paymentsDisplay: string
  salesReceiptsDisplay: string
  refundsDisplay: string
  netCashDisplay: string
  buckets: CashSummaryBucket[]
}

export interface CashSummaryPanelData {
  blocks: CashSummaryCurrencyBlock[]
}

const CASH_ROWS: Array<{
  key: keyof Omit<CashSummaryCurrencyBlock, 'currency' | 'buckets'>
  label: string
}> = [
  { key: 'paymentsDisplay', label: 'Payments' },
  { key: 'salesReceiptsDisplay', label: 'Sales-receipt cash' },
  { key: 'refundsDisplay', label: 'Refunds' },
  { key: 'netCashDisplay', label: 'Net cash' },
]

export function CashSummaryPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<CashSummaryPanelData> }) {
  return (
    <PanelFrame title="Cash summary" {...props}>
      {state.status === 'ready' ? (
        state.data.blocks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">No cash recorded.</p>
        ) : (
          <div className="space-y-6">
            {state.data.blocks.map((block) => (
              <section key={block.currency} aria-label={`${block.currency} cash`}>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {block.currency}
                </p>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {CASH_ROWS.map(({ key, label }) => (
                    <div key={key} className="bg-muted/50 rounded-lg p-3">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {block[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {block.buckets.length > 0 ? (
                  <div className="mt-3">
                    <ReportBars
                      bars={block.buckets}
                      ariaLabel={`${block.currency} net cash per bucket`}
                    />
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">No cash recorded.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function CashSummaryPanelSkeleton() {
  return (
    <PanelFrame title="Cash summary">
      <PanelRowsSkeleton rows={4} />
    </PanelFrame>
  )
}
