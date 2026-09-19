import type { AdminPrice, AdminProduct } from '@876/platform/compat'

import { formatMoney } from '@/lib/format'

export type PriceOption = {
  product: AdminProduct
  price: AdminPrice
  label: string
}

export function buildPriceOptions(products: AdminProduct[]): PriceOption[] {
  return products.flatMap((product) =>
    product.prices
      .filter((price) => price.active)
      .map((price) => ({
        product,
        price,
        label: `${product.name} · ${formatPriceLabel(price)}`,
      }))
  )
}

export function formatPriceLabel(price: AdminPrice): string {
  const interval = price.billing_interval ? `/${price.billing_interval}` : ''
  return `${formatMoney(price.unit_amount ?? 0, price.currency)}${interval}`
}
