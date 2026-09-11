import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'
import { ReportBars, type ReportBar } from './report-bars'

export interface ItemSalesSummaryData {
  quantitySold: number
  quantityReturned: number
  netDisplay: string
  monthlyBuckets: ReportBar[]
}

export function ItemSalesSummaryPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<ItemSalesSummaryData> }) {
  return (
    <PanelFrame title="Sales summary" {...props}>
      {state.status === 'ready' ? (
        <div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Quantity sold</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.quantitySold}
              </dd>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Quantity returned</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.quantityReturned}
              </dd>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Net sales</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.netDisplay}
              </dd>
            </div>
          </dl>
          {state.data.monthlyBuckets.length > 0 ? (
            <div className="mt-3">
              <ReportBars
                bars={state.data.monthlyBuckets}
                ariaLabel="Item net sales per month"
              />
            </div>
          ) : null}
        </div>
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">No sales recorded.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function ItemSalesSummaryPanelSkeleton() {
  return (
    <PanelFrame title="Sales summary">
      <PanelRowsSkeleton rows={3} />
    </PanelFrame>
  )
}
