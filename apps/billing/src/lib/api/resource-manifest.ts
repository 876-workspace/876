export const PROXIED_RESOURCES = Object.freeze([
  'addons',
  'bank-accounts',
  'bank-transactions',
  'banking',
  'credit-notes',
  'currencies',
  'customers',
  'discounts',
  'invoice-preferences',
  'invoices',
  'item-preferences',
  'item-variants',
  'items',
  'members',
  'payment-modes',
  'payment-providers',
  'payment-terms',
  'payments',
  'plans',
  'price-lists',
  'prices',
  'products',
  'quotes',
  'recurring-invoices',
  'refunds',
  'report-preferences',
  'roles',
  'salespeople',
  'subscriptions',
  'tax-authorities',
  'tax-rates',
] as const)

export type ProxiedResource = (typeof PROXIED_RESOURCES)[number]

export function isProxiedResource(value: string): value is ProxiedResource {
  return PROXIED_RESOURCES.some((resource) => resource === value)
}
