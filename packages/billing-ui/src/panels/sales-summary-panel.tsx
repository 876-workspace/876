import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'
import { ReportBars, type ReportBar } from './report-bars'

export interface SalesSummaryBucket extends ReportBar {
  start: number
  end: number
}

export interface SalesSummaryCurrencyBlock {
  currency: string
  subscriptionDisplay: string
  recurringDisplay: string
  oneOffDisplay: string
  salesReceiptsDisplay: string
  creditNotesDisplay: string
  netSalesDisplay: string
  buckets: SalesSummaryBucket[]
}

export interface SalesSummaryPanelData {
  blocks: SalesSummaryCurrencyBlock[]
}

const SOURCE_ROWS: Array<{
  key: keyof Omit<
    SalesSummaryCurrencyBlock,
    'currency' | 'buckets'
  >
  label: string
}> = [
  { key: 'subscriptionDisplay', label: 'Subscription invoices' },
  { key: 'recurringDisplay', label: 'Recurring invoices' },
  { key: 'oneOffDisplay', label: 'One-off invoices' },
  { key: 'salesReceiptsDisplay', label: 'Sales receipts' },
  { key: 'creditNotesDisplay', label: 'Credit notes' },
  { key: 'netSalesDisplay', label: 'Net sales' },
]

export function SalesSummaryPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<SalesSummaryPanelData> }) {
  return (
    <PanelFrame title="Sales summary" {...props}>
      {state.status === 'ready' ? (
        state.data.blocks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">No sales recorded.</p>
        ) : (
          <div className="space-y-6">
            {state.data.blocks.map((block) => (
              <section key={block.currency} aria-label={`${block.currency} sales`}>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {block.currency}
                </p>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {SOURCE_ROWS.map(({ key, label }) => (
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
                      ariaLabel={`${block.currency} net sales per bucket`}
                    />
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">No sales recorded.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function SalesSummaryPanelSkeleton() {
  return (
    <PanelFrame title="Sales summary">
      <PanelRowsSkeleton rows={5} />
    </PanelFrame>
  )
}
