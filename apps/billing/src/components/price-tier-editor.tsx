import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { INITIAL_TIER, type TierDraft } from './catalog-price-draft'

export function PriceTierEditor({
  tiers,
  onChange,
}: {
  tiers: TierDraft[]
  onChange: (tiers: TierDraft[]) => void
}) {
  function updateTier(index: number, field: keyof TierDraft, value: string) {
    onChange(
      tiers.map((tier, row) =>
        row === index ? { ...tier, [field]: value } : tier
      )
    )
  }

  return (
    <section className="876-card space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Quantity tiers</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Volume uses one matching rate for every unit; graduated pricing
          charges each range independently.
        </p>
      </div>
      {tiers.map((tier, index) => (
        <div
          key={index}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <Input
            aria-label="From quantity"
            type="number"
            min="1"
            placeholder="From"
            value={tier.from}
            onChange={(event) => updateTier(index, 'from', event.target.value)}
          />
          <Input
            aria-label="To quantity"
            type="number"
            min="1"
            placeholder="No limit"
            value={tier.to}
            onChange={(event) => updateTier(index, 'to', event.target.value)}
          />
          <Input
            aria-label="Unit amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Per unit"
            value={tier.unit}
            onChange={(event) => updateTier(index, 'unit', event.target.value)}
          />
          <Input
            aria-label="Flat tier amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Flat add-on"
            value={tier.flat}
            onChange={(event) => updateTier(index, 'flat', event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(tiers.filter((_, row) => row !== index))}
            disabled={tiers.length === 1}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...tiers, { ...INITIAL_TIER, from: '' }])}
      >
        Add tier
      </Button>
    </section>
  )
}
