export type FinanceProvisioningConfiguration = {
  billing: {
    url: string
    internalKey: string
    financeProvisioningDisabled: boolean
  }
}

/**
 * Finance provisioning is a required dependency whenever its worker is enabled.
 * Reject broken service configuration before the API starts listening instead
 * of accepting traffic and failing organization activation minutes later.
 */
export function assertFinanceProvisioningConfiguration(
  settings: FinanceProvisioningConfiguration
): void {
  if (settings.billing.financeProvisioningDisabled) return

  const rawUrl = settings.billing.url.trim()
  if (!rawUrl) {
    throw new Error(
      'Finance provisioning is enabled but BILLING_API_URL/BILLING_URL is missing.'
    )
  }
  if (!settings.billing.internalKey.trim()) {
    throw new Error(
      'Finance provisioning is enabled but BILLING_INTERNAL_KEY is missing.'
    )
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(
      'Finance provisioning is enabled but BILLING_API_URL/BILLING_URL is not a valid URL.'
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      'BILLING_API_URL/BILLING_URL must use http:// or https://.'
    )
  }
  if (url.username || url.password) {
    throw new Error(
      'BILLING_API_URL/BILLING_URL must not contain embedded credentials.'
    )
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      'BILLING_API_URL/BILLING_URL must be a service origin with no path, query, or fragment.'
    )
  }
}
