import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerBillingFacts { type: string; currency: string; reference: string; addedDate: string }

export function CustomerBillingFactsPanel({ state, ...props }: PanelProps & { state: PanelState<CustomerBillingFacts> }) {
  return <PanelFrame title="Billing" {...props}>{state.status === 'ready' ? <Facts data={state.data} /> : state.status === 'empty' ? <p className="text-muted-foreground py-2 text-sm">No billing facts are available.</p> : <PanelError error={state} />}</PanelFrame>
}
export function CustomerBillingFactsPanelSkeleton() { return <PanelFrame title="Billing"><PanelRowsSkeleton rows={2} /></PanelFrame> }
function Facts({ data }: { data: CustomerBillingFacts }) { return <dl className="grid gap-3 sm:grid-cols-2">{[['Type', data.type], ['Currency', data.currency], ['Reference', data.reference], ['Added', data.addedDate]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl> }
