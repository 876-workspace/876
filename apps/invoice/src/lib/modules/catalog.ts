import { INVOICE_MODULE_CATALOG } from '@876/billing/settings-catalog'

export { INVOICE_MODULE_CATALOG }

export type InvoiceModuleKey = (typeof INVOICE_MODULE_CATALOG)[number]['key']

export const INVOICE_MODULE_KEYS: readonly InvoiceModuleKey[] =
  INVOICE_MODULE_CATALOG.map((module) => module.key)

const invoiceModuleKeys = new Set<string>(INVOICE_MODULE_KEYS)

export function isInvoiceModuleKey(value: string): value is InvoiceModuleKey {
  return invoiceModuleKeys.has(value)
}
