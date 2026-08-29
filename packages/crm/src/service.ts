export const CRM_SERVICE_KEY = 'crm' as const
export const CRM_PRODUCT_APP_SLUG = '876-crm' as const

/**
 * A CRM service workspace is the organization's tenant in the CRM bounded
 * context. Its existence is infrastructure and never implies entitlement to
 * launch the standalone 876 CRM product.
 */
export type CrmServiceWorkspaceRef = {
  service: typeof CRM_SERVICE_KEY
  organizationId: string
}

export function crmServiceWorkspace(
  organizationId: string
): CrmServiceWorkspaceRef {
  return { service: CRM_SERVICE_KEY, organizationId }
}
