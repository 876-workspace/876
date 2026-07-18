import { notFound } from 'next/navigation'

import { resolvePrice } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'

export default async function PriceTiersPage({
  params,
}: {
  params: Promise<{ priceId: string }>
}) {
  const { priceId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const price = await resolvePrice(context.tenant.id, priceId)
  if (!price) notFound()

  return (
    <>
      <section className="876-card overflow-hidden">
        <div className="divide-border divide-y">
          {price.tiers.map((tier) => (
            <div
              key={tier.id}
              className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-3"
            >
              <span>
                {tier.fromUnit} to {tier.toUnit ?? '∞'} units
              </span>
              <span>
                {formatMoney(tier.unitAmount, price.currency)} per unit
              </span>
              <span>{formatMoney(tier.flatAmount, price.currency)} flat</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
