export type InvoiceBillingConfig = {
  baseUrl: string
  apiKey: string
}

export type InvoiceBillingEnvironment = {
  BILLING_API_URL?: string
  INVOICE_API_876_KEY?: string
}

function required(
  env: InvoiceBillingEnvironment,
  name: keyof InvoiceBillingEnvironment
): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for Invoice Billing integration.`)
  return value
}

/**
 * One fail-fast source for every Invoice → Billing client.
 *
 * Production must never silently fall back to localhost or an empty app key.
 * BILLING_API_URL is a service origin; route construction belongs to the shared
 * Billing clients, not environment configuration.
 */
export function getInvoiceBillingConfig(
  env: InvoiceBillingEnvironment = process.env
): InvoiceBillingConfig {
  const apiKey = required(env, 'INVOICE_API_876_KEY')
  const rawBaseUrl = required(env, 'BILLING_API_URL')

  let url: URL
  try {
    url = new URL(rawBaseUrl)
  } catch {
    throw new Error('BILLING_API_URL must be a valid URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('BILLING_API_URL must use http:// or https://.')
  }
  if (url.username || url.password) {
    throw new Error('BILLING_API_URL must not contain embedded credentials.')
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      'BILLING_API_URL must be a service origin with no path, query, or fragment.'
    )
  }

  return { baseUrl: url.origin, apiKey }
}
