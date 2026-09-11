import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'
import { ReportBars, type ReportBar } from './report-bars'

export interface CustomerSalesSummaryData {
  lifetimeSalesDisplay: string
  lifetimeCreditsDisplay: string
  lastSaleDisplay: string
  rangeSalesDisplay: string
  activeSubscriptionCount: number | null
  subscriptionMrrDisplay: string | null
  monthlyBuckets: ReportBar[]
}

export function CustomerSalesSummaryPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<CustomerSalesSummaryData> }) {
  return (
    <PanelFrame title="Sales summary" {...props}>
      {state.status === 'ready' ? (
        <div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Lifetime sales</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.lifetimeSalesDisplay}
              </dd>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Lifetime credits</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.lifetimeCreditsDisplay}
              </dd>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Last sale</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.lastSaleDisplay}
              </dd>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <dt className="text-muted-foreground text-xs">Sales in range</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {state.data.rangeSalesDisplay}
              </dd>
            </div>
            {state.data.activeSubscriptionCount !== null ? (
              <div className="bg-muted/50 rounded-lg p-3">
                <dt className="text-muted-foreground text-xs">
                  Active subscriptions
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {state.data.activeSubscriptionCount}
                </dd>
              </div>
            ) : null}
            {state.data.subscriptionMrrDisplay !== null ? (
              <div className="bg-muted/50 rounded-lg p-3">
                <dt className="text-muted-foreground text-xs">
                  Subscription MRR
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {state.data.subscriptionMrrDisplay}
                </dd>
              </div>
            ) : null}
          </dl>
          {state.data.monthlyBuckets.length > 0 ? (
            <div className="mt-3">
              <ReportBars
                bars={state.data.monthlyBuckets}
                ariaLabel="Customer sales per month"
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

export function CustomerSalesSummaryPanelSkeleton() {
  return (
    <PanelFrame title="Sales summary">
      <PanelRowsSkeleton rows={4} />
    </PanelFrame>
  )
}
