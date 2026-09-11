import { Link } from '../link'
import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface ItemSalesPanelRow {
  itemId: string
  variantId: string | null
  itemName: string | null
  currency: string
  quantitySold: number
  quantityReturned: number
  netDisplay: string
  documentCount: number
}

export interface ItemSalesPanelData {
  rows: ItemSalesPanelRow[]
}

export function ItemSalesPanel({
  state,
  itemHref,
  ...props
}: PanelProps & {
  state: PanelState<ItemSalesPanelData>
  itemHref: (itemId: string) => string
}) {
  return (
    <PanelFrame title="Top items" {...props}>
      {state.status === 'ready' ? (
        state.data.rows.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">No item sales.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 text-right font-medium tabular-nums">
                  Sold
                </th>
                <th className="py-1 pr-2 text-right font-medium tabular-nums">
                  Returned
                </th>
                <th className="py-1 text-right font-medium tabular-nums">
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.rows.map((row) => (
                <tr
                  key={`${row.itemId}:${row.variantId ?? ''}:${row.currency}`}
                  className="border-t"
                >
                  <td className="py-1.5 pr-2 font-medium">
                    <Link href={itemHref(row.itemId)}>
                      {row.itemName ?? row.itemId}
                    </Link>
                    <span className="text-muted-foreground block text-xs font-normal">
                      {row.currency}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {row.quantitySold}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {row.quantityReturned}
                  </td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {row.netDisplay}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : state.status === 'empty' ? (
        <p className="text-muted-foreground py-4 text-sm">No item sales.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function ItemSalesPanelSkeleton() {
  return (
    <PanelFrame title="Top items">
      <PanelRowsSkeleton rows={5} />
    </PanelFrame>
  )
}
