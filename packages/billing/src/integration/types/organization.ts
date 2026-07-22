/**
 * This object represents a Billing tenant linked to a Core organization.
 */
export interface BillingOrganization {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_organization'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the Core organization this tenant represents.
   */
  organizationId: string

  /**
   * Unique slug for the Billing tenant.
   */
  slug: string

  /**
   * The organization's display name.
   */
  name: string

  /**
   * Two-letter country code (ISO 3166-1 alpha-2).
   */
  countryCode: string

  /**
   * Status of the tenant. One of `ACTIVE` or `SUSPENDED`.
   */
  status: 'ACTIVE' | 'SUSPENDED'

  /**
   * Three-letter ISO currency code used as the tenant default.
   */
  defaultCurrency: string

  /**
   * Default language for the tenant.
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
