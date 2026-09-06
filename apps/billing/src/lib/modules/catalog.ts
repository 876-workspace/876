import { BILLING_MODULE_CATALOG } from '@876/billing/settings-catalog'

export { BILLING_MODULE_CATALOG }

export type BillingModuleKey = (typeof BILLING_MODULE_CATALOG)[number]['key']

export const BILLING_MODULE_KEYS: readonly BillingModuleKey[] =
  BILLING_MODULE_CATALOG.map((module) => module.key)

const billingModuleKeys = new Set<string>(BILLING_MODULE_KEYS)

export function isBillingModuleKey(value: string): value is BillingModuleKey {
  return billingModuleKeys.has(value)
}
