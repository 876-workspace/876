import { Badge } from '@876/ui/badge'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerOrganization { name: string; slug: string; members: string; status: string }

export function CustomerOrganizationPanel({ state, ...props }: PanelProps & { state: PanelState<CustomerOrganization> }) {
  return <PanelFrame title="Organization" {...props}>{state.status === 'ready' ? <dl className="grid gap-3 sm:grid-cols-2">{[['Name', state.data.name], ['Slug', state.data.slug], ['Members', state.data.members]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}<div><dt className="text-muted-foreground text-xs">Status</dt><dd className="mt-1"><Badge variant="secondary" className="capitalize">{state.data.status}</Badge></dd></div></dl> : state.status === 'empty' ? <p className="text-muted-foreground py-2 text-sm">This customer is not linked to an 876 organization.</p> : <PanelError error={state} />}</PanelFrame>
}
export function CustomerOrganizationPanelSkeleton() { return <PanelFrame title="Organization"><PanelRowsSkeleton rows={2} /></PanelFrame> }
