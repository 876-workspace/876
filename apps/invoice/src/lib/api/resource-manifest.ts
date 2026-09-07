export const PROXIED_RESOURCES = Object.freeze([
  'bank-accounts',
  'currencies',
  'customers',
  'invoices',
  'item-preferences',
  'item-variants',
  'items',
  'payment-modes',
  'payments',
  'quotes',
  'tax-authorities',
  'tax-rates',
] as const)

export type ProxiedResource = (typeof PROXIED_RESOURCES)[number]

export function isProxiedResource(value: string): value is ProxiedResource {
  return PROXIED_RESOURCES.some((resource) => resource === value)
}
