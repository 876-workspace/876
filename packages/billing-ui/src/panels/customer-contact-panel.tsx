import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerContact {
  avatar: string | null
  name: string
  role: string | null
  sourceLabel: string
  email: string | null
  phone: string | null
}

export function CustomerContactPanel({ state, ...props }: PanelProps & { state: PanelState<CustomerContact> }) {
  return <PanelFrame title="Contact" {...props}>{state.status === 'ready' ? <div className="space-y-4"><div className="flex items-center gap-3"><Avatar className="size-10 text-sm">{state.data.avatar ? <AvatarImage src={state.data.avatar} alt="" /> : null}<AvatarFallback>{initials(state.data.name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{state.data.name}</p><p className="text-muted-foreground truncate text-xs">{[state.data.role, state.data.sourceLabel].filter(Boolean).join(' · ')}</p></div></div><Facts values={[['Email', state.data.email ?? '—'], ['Phone', state.data.phone ?? '—']]} /></div> : state.status === 'empty' ? <Empty copy="No contact details have been added." /> : <PanelError error={state} />}</PanelFrame>
}

export function CustomerContactPanelSkeleton() { return <PanelFrame title="Contact"><PanelRowsSkeleton rows={3} /></PanelFrame> }

function Facts({ values }: { values: Array<[string, string]> }) { return <dl className="grid gap-3 sm:grid-cols-2">{values.map(([label, value]) => <div key={label}><dt className="text-muted-foreground text-xs">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl> }
function Empty({ copy }: { copy: string }) { return <p className="text-muted-foreground py-2 text-sm">{copy}</p> }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?' }
