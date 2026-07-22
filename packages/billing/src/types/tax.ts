/**
 * Parameters for creating a tenant tax authority.
 */
export interface TaxAuthorityCreateParams {
  /**
   * The tax authority's display name.
   */
  name: string

  /**
   * An arbitrary description of the tax authority. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Two-letter country code (ISO 3166-1 alpha-2).
   */
  countryCode?: string

  /**
   * Subdivision code for the authority, if any.
   */
  subdivisionCode?: string | null

  /**
   * Whether this authority should become the tenant default.
   */
  isDefault?: boolean
}

/**
 * Parameters for updating a tax authority.
 */
export interface TaxAuthorityUpdateParams {
  /**
   * The tax authority's display name.
   */
  name?: string

  /**
   * An arbitrary description of the tax authority. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Two-letter country code (ISO 3166-1 alpha-2).
   */
  countryCode?: string

  /**
   * Subdivision code for the authority, if any.
   */
  subdivisionCode?: string | null

  /**
   * Whether this authority should become the tenant default.
   */
  isDefault?: boolean

  /**
   * Whether the tax authority is active for new rates.
   */
  isActive?: boolean
}

/**
 * This object represents a tax authority used to group effective-dated tax rates.
 */
export interface TaxAuthority {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'tax_authority'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The tax authority's display name.
   */
  name: string

  /**
   * An arbitrary description of the tax authority. Often useful for displaying to users.
   */
  description: string | null

  /**
   * Two-letter country code (ISO 3166-1 alpha-2).
   */
  countryCode: string

  /**
   * Subdivision code for the authority, if any.
   */
  subdivisionCode: string | null

  /**
   * Whether this is the tenant's default tax authority.
   */
  isDefault: boolean

  /**
   * Whether the tax authority is active for new rates.
   */
  isActive: boolean

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
 * A minimal tax authority resource returned after creation.
 */
export interface TaxAuthorityCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'tax_authority'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * Parameters for creating an immutable effective-dated tax rate.
 */
export interface TaxRateCreateParams {
  /**
   * The tax rate's display name.
   */
  name: string

  /**
   * An arbitrary description of the tax rate. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * High-level tax type (for example, `VAT` or `sales_tax`).
   */
  taxType?: string | null

  /**
   * Tax rate percentage or fixed amount, depending on configuration.
   */
  rate: number | string

  /**
   * ID of the tax authority this rate belongs to.
   */
  taxAuthorityId?: string | null

  /**
   * Whether the rate is tax-inclusive.
   */
  inclusive?: boolean

  /**
   * Time at which the rate becomes effective. Measured in seconds since the Unix epoch.
   */
  startsAt?: number | null
}

/**
 * Parameters for updating a tax rate.
 */
export interface TaxRateUpdateParams {
  /**
   * Whether the tax rate is active for new applications.
   */
  isActive: boolean
}

/**
 * This object represents an effective-dated tax rate under a tax authority.
 */
export interface TaxRate {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'tax_rate'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The tax rate's display name.
   */
  name: string

  /**
   * An arbitrary description of the tax rate. Often useful for displaying to users.
   */
  description: string | null

  /**
   * High-level tax type (for example, `VAT` or `sales_tax`).
   */
  taxType: string | null

  /**
   * Tax rate as a decimal string.
   */
  rate: string

  /**
   * Whether the rate is tax-inclusive.
   */
  inclusive: boolean

  /**
   * Time at which the rate becomes effective. Measured in seconds since the Unix epoch.
   */
  startsAt: number | null

  /**
   * Whether the tax rate is active for new applications.
   */
  isActive: boolean

  /**
   * The tax authority this rate belongs to.
   */
  taxAuthority: TaxAuthority

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
 * A minimal tax rate resource returned after creation.
 */
export interface TaxRateCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'tax_rate'

  /**
   * Unique identifier for the object.
   */
  id: string
}
