export const PROXIED_RESOURCES = Object.freeze([
  'bank-accounts',
  'customers',
  'invoices',
  'items',
  'payment-modes',
  'payments',
  'quotes',
] as const)

export type ProxiedResource = (typeof PROXIED_RESOURCES)[number]

export function isProxiedResource(value: string): value is ProxiedResource {
  return PROXIED_RESOURCES.some((resource) => resource === value)
}
