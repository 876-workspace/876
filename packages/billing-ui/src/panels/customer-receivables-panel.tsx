import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerReceivables { outstanding: string; overdue: string; paid: string; currency: string }

export function CustomerReceivablesPanel({ state, ...props }: PanelProps & { state: PanelState<CustomerReceivables> }) {
  return <PanelFrame title="Receivables" {...props}>{state.status === 'ready' ? <div className="grid gap-4 sm:grid-cols-3">{[['Outstanding', state.data.outstanding], ['Overdue', state.data.overdue], ['Paid', state.data.paid]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-3"><p className="text-muted-foreground text-xs">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p><p className="text-muted-foreground mt-1 text-xs">{state.data.currency}</p></div>)}</div> : state.status === 'empty' ? <p className="text-muted-foreground py-4 text-sm">No receivables have been recorded.</p> : <PanelError error={state} />}</PanelFrame>
}
export function CustomerReceivablesPanelSkeleton() { return <PanelFrame title="Receivables"><PanelRowsSkeleton rows={3} /></PanelFrame> }
