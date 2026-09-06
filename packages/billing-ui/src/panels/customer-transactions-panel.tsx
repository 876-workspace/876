import Link from 'next/link'
import { Badge } from '@876/ui/badge'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerDocument { id: string; number: string; type: string; date: string; status: string; amount: string }
export function CustomerTransactionsPanel({ state, hrefForDocument, ...props }: PanelProps & { state: PanelState<CustomerDocument[]>; hrefForDocument: (id: string) => string }) {
  return <PanelFrame title="Transactions" {...props}>{state.status === 'ready' ? state.data.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-muted-foreground border-b text-left"><tr><th className="pb-3 font-medium">Document</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Status</th><th className="pb-3 text-right font-medium">Amount</th></tr></thead><tbody>{state.data.map((document) => <tr key={document.id} className="border-b last:border-0"><td className="py-3 font-medium"><Link href={hrefForDocument(document.id)} className="text-primary hover:underline">{document.number}</Link></td><td className="py-3">{document.type}</td><td className="py-3">{document.date}</td><td className="py-3"><Badge variant="secondary">{document.status}</Badge></td><td className="py-3 text-right tabular-nums">{document.amount}</td></tr>)}</tbody></table></div> : <Empty /> : state.status === 'empty' ? <Empty /> : <PanelError error={state} />}</PanelFrame>
}
export function CustomerTransactionsPanelSkeleton() { return <PanelFrame title="Transactions"><PanelRowsSkeleton rows={4} /></PanelFrame> }
function Empty() { return <p className="text-muted-foreground py-4 text-sm">No documents have been recorded for this customer.</p> }
