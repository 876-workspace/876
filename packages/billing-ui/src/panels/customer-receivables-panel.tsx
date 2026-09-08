import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerReceivables {
  outstanding: string
  overdue: string
  availableCredit: string
  netPosition: string
  billed: string
  paid: string
  currency: string
}

const METRICS: Array<{
  key: keyof Omit<CustomerReceivables, 'currency'>
  label: string
}> = [
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'availableCredit', label: 'Available credit' },
  { key: 'netPosition', label: 'Net position' },
  { key: 'billed', label: 'Lifetime billed' },
  { key: 'paid', label: 'Lifetime paid' },
]

export function CustomerReceivablesPanel({
  state,
  ...props
}: PanelProps & { state: PanelState<CustomerReceivables> }) {
  return (
    <PanelFrame title="Receivables" {...props}>
      {state.status === 'ready' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {METRICS.map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="mt-1 font-semibold tabular-nums">{state.data[key]}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {state.data.currency}
              </p>
            </div>
          ))}
        </div>
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">
          No receivables have been recorded.
        </p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function CustomerReceivablesPanelSkeleton() {
  return (
    <PanelFrame title="Receivables">
      <PanelRowsSkeleton rows={6} />
    </PanelFrame>
  )
}
