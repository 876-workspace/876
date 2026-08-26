import type { AdminPrice, AdminProduct } from '@876/admin'

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

export function formatMoney(amount: number, currency: string | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency ?? 'usd').toUpperCase(),
  }).format((amount ?? 0) / 100)
}
