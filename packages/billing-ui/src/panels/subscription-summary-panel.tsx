import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface SubscriptionSummaryBucket {
  start: number
  end: number
  label: string
  newCount: number
  canceledCount: number
}

export interface SubscriptionSummaryCurrencyBlock {
  currency: string
  active: number
  trialing: number
  paused: number
  mrrDisplay: string
  arrDisplay: string
  churnDisplay: string | null
  maxBucketCount: number
  buckets: SubscriptionSummaryBucket[]
}

export interface SubscriptionSummaryPanelData {
  blocks: SubscriptionSummaryCurrencyBlock[]
}

function pairedHeight(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0
  return Math.max((count / max) * 100, 4)
}

export function SubscriptionSummaryPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<SubscriptionSummaryPanelData> }) {
  return (
    <PanelFrame title="Subscription summary" {...props}>
      {state.status === 'ready' ? (
        state.data.blocks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            No subscriptions recorded.
          </p>
        ) : (
          <div className="space-y-6">
            {state.data.blocks.map((block) => (
              <section
                key={block.currency}
                aria-label={`${block.currency} subscription summary`}
              >
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {block.currency}
                </p>
                <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">Active</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.active}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">Trialing</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.trialing}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">Paused</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.paused}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">MRR</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.mrrDisplay}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">ARR</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.arrDisplay}
                    </dd>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <dt className="text-muted-foreground text-xs">Churn rate</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {block.churnDisplay ?? '—'}
                    </dd>
                  </div>
                </dl>
                {block.buckets.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="bg-primary inline-block h-2.5 w-2.5 rounded-sm" />
                        New
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="bg-muted-foreground inline-block h-2.5 w-2.5 rounded-sm" />
                        Canceled
                      </span>
                    </div>
                    <div
                      role="img"
                      aria-label={`${block.currency} new versus canceled subscriptions per bucket`}
                      className="mt-2 flex h-28 items-stretch gap-1.5"
                    >
                      {block.buckets.map((bucket) => (
                        <div
                          key={bucket.start}
                          className="flex min-w-0 flex-1 flex-col"
                          title={`${bucket.label}: ${bucket.newCount} new, ${bucket.canceledCount} canceled`}
                        >
                          <div className="flex min-h-0 flex-1 items-end justify-center gap-0.5">
                            <div
                              role="img"
                              aria-label={`${bucket.label} new: ${bucket.newCount}`}
                              className="bg-primary w-full max-w-4 min-w-2 rounded-t"
                              style={{
                                height: `${pairedHeight(bucket.newCount, block.maxBucketCount)}%`,
                              }}
                            />
                            <div
                              role="img"
                              aria-label={`${bucket.label} canceled: ${bucket.canceledCount}`}
                              className="bg-muted-foreground w-full max-w-4 min-w-2 rounded-t"
                              style={{
                                height: `${pairedHeight(bucket.canceledCount, block.maxBucketCount)}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground mt-1 w-full truncate text-center text-[10px]">
                            {bucket.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">
          No subscriptions recorded.
        </p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function SubscriptionSummaryPanelSkeleton() {
  return (
    <PanelFrame title="Subscription summary">
      <PanelRowsSkeleton rows={6} />
    </PanelFrame>
  )
}
