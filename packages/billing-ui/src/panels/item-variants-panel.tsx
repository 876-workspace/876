'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

export interface ItemVariantRow {
  id: string
  label: string
  sku: string | null
  sellingAmount: string | null
  costAmount: string | null
  stockQuantity: number | null
  isActive: boolean
}
export type ItemVariantsPanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; variants: readonly ItemVariantRow[] }
export interface ItemVariantsPanelProps {
  state: ItemVariantsPanelState
  formatAmount: (amount: string | null) => string
  onSave: (
    variantId: string,
    patch: Pick<
      ItemVariantRow,
      'sku' | 'sellingAmount' | 'costAmount' | 'stockQuantity' | 'isActive'
    >
  ) => Promise<{ error: { message: string } | null }>
}

export function ItemVariantsPanel({
  state,
  formatAmount,
  onSave,
}: ItemVariantsPanelProps) {
  if (state.status === 'loading')
    return (
      <ItemVariantsFrame>
        <div className="bg-muted h-24 animate-pulse rounded-md" />
      </ItemVariantsFrame>
    )
  if (state.status === 'error')
    return (
      <ItemVariantsFrame>
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      </ItemVariantsFrame>
    )
  if (state.status === 'empty')
    return (
      <ItemVariantsFrame>
        <p className="text-muted-foreground text-sm">No variants yet.</p>
      </ItemVariantsFrame>
    )
  return (
    <ItemVariantsFrame>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="py-2">Variant</th>
              <th className="py-2">SKU</th>
              <th className="py-2 text-right">Selling</th>
              <th className="py-2 text-right">Cost</th>
              <th className="py-2 text-right">Stock</th>
              <th className="py-2">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.variants.map((variant) => (
              <VariantEditor
                key={variant.id}
                variant={variant}
                formatAmount={formatAmount}
                onSave={onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </ItemVariantsFrame>
  )
}

function VariantEditor({
  variant,
  formatAmount,
  onSave,
}: {
  variant: ItemVariantRow
  formatAmount: (amount: string | null) => string
  onSave: ItemVariantsPanelProps['onSave']
}) {
  const [draft, setDraft] = useState(variant)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  function save() {
    setError(null)
    startTransition(async () => {
      const result = await onSave(variant.id, {
        sku: draft.sku,
        sellingAmount: draft.sellingAmount,
        costAmount: draft.costAmount,
        stockQuantity: draft.stockQuantity,
        isActive: draft.isActive,
      })
      if (result.error) setError(result.error.message)
    })
  }
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 font-medium">
        {variant.label}
        {error ? (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        ) : null}
      </td>
      <td className="py-2 pr-2">
        <Input
          aria-label={`${variant.label} SKU`}
          value={draft.sku ?? ''}
          onChange={(event) =>
            setDraft({ ...draft, sku: event.target.value || null })
          }
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Input
          aria-label={`${variant.label} selling amount`}
          className="text-right tabular-nums"
          value={draft.sellingAmount ?? ''}
          placeholder={formatAmount(null)}
          onChange={(event) =>
            setDraft({ ...draft, sellingAmount: event.target.value || null })
          }
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Input
          aria-label={`${variant.label} cost amount`}
          className="text-right tabular-nums"
          value={draft.costAmount ?? ''}
          placeholder={formatAmount(null)}
          onChange={(event) =>
            setDraft({ ...draft, costAmount: event.target.value || null })
          }
        />
      </td>
      <td className="py-2 pr-2 text-right">
        <Input
          aria-label={`${variant.label} stock`}
          className="text-right tabular-nums"
          value={draft.stockQuantity ?? ''}
          onChange={(event) =>
            setDraft({
              ...draft,
              stockQuantity:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
        />
      </td>
      <td className="py-2">
        <input
          aria-label={`${variant.label} active`}
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) =>
            setDraft({ ...draft, isActive: event.target.checked })
          }
        />
      </td>
      <td className="py-2 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={save}
        >
          Save
        </Button>
      </td>
    </tr>
  )
}
function ItemVariantsFrame({ children }: { children: ReactNode }) {
  return (
    <section className="876-card space-y-4 p-5">
      <h2 className="876-section-title">Variants</h2>
      {children}
    </section>
  )
}
