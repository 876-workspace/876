/**
 * Billing workspaces (tenants).
 *
 * A tenant is the finance workspace linked to one 876 organization. The
 * roster lookup joins workspace rows, so it is an internal-key projection
 * served by the Billing server client rather than the tenant client.
 */

/**
 * The lifecycle status of a Billing workspace.
 */
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

/**
 * This object represents a Billing workspace linked to a platform organization.
 *
 * Mirrors the Billing API's internal `tenantSchema` for
 * `POST /internal/projections/tenants`.
 */
export interface Tenant {
  /**
   * Unique identifier for the workspace.
   */
  id: string

  /**
   * ID of the linked platform organization. Null when unlinked.
   */
  organizationId: string | null

  /**
   * URL-safe slug for the workspace.
   */
  slug: string

  /**
   * The workspace's display name.
   */
  name: string

  /**
   * Whether the workspace is usable.
   */
  status: TenantStatus

  /**
   * Three-letter ISO code of the workspace's operating currency.
   */
  defaultCurrency: string

  /**
   * BCP 47 tag of the workspace's default language.
   */
  defaultLanguage: string

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * Parameters for resolving Billing workspaces by platform organization.
 *
 * Mirrors the Billing API's request schema for
 * `POST /internal/projections/tenants`.
 */
export interface TenantListParams {
  /**
   * Platform organization IDs to resolve, up to 100.
   */
  organizationIds: string[]
}
