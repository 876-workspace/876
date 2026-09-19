/**
 * Vendors.
 *
 * Vendors are the businesses a workspace pays — suppliers, contractors, and
 * service providers. The Billing API serves full CRUD at `/api/v1/vendors`
 * with an optional `status` filter on list.
 */

/**
 * The lifecycle status of a vendor.
 */
export type VendorStatus = 'ACTIVE' | 'ARCHIVED'

/**
 * This object represents a vendor in a finance workspace.
 */
export interface Vendor {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'vendor'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * External reference for the vendor, if any.
   */
  externalReference: string | null

  /**
   * The vendor's display name.
   */
  name: string

  /**
   * The vendor's email address. Null when none was given.
   */
  email: string | null

  /**
   * The vendor's phone number. Null when none was given.
   */
  phone: string | null

  /**
   * The vendor's billing address. Null when none was given.
   */
  billingAddress: unknown

  /**
   * Arbitrary metadata attached to the vendor. Null when none was given.
   */
  metadata: unknown

  /**
   * The vendor's default currency. Null when none was set.
   */
  defaultCurrency: string | null

  /**
   * Whether the vendor is active or archived.
   */
  status: VendorStatus

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
 * A minimal vendor resource returned after a write.
 */
export interface VendorCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'vendor'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted vendor tombstone.
 */
export interface VendorDeleted extends VendorCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * Parameters for listing vendors in the active Billing workspace.
 *
 * Mirrors the server's `vendorListQuerySchema` for `GET /api/v1/vendors`.
 */
export interface VendorListParams {
  /**
   * Filter to active or archived vendors. Omit to list both.
   */
  status?: VendorStatus
}

/**
 * Parameters for creating a vendor.
 *
 * Mirrors the server's `vendorCreateBodySchema` for `POST /api/v1/vendors`.
 */
export interface VendorCreateParams {
  /**
   * The vendor's display name.
   */
  name: string

  /**
   * The vendor's email address.
   */
  email?: string | null

  /**
   * The vendor's phone number.
   */
  phone?: string | null

  /**
   * The vendor's website.
   */
  website?: string | null

  /**
   * Three-letter ISO currency code for the vendor.
   */
  currency?: string | null

  /**
   * External reference for the vendor.
   */
  externalReference?: string | null
}

/**
 * Parameters for updating a vendor.
 *
 * Mirrors the server's `vendorUpdateBodySchema` for `PATCH /api/v1/vendors/:vendorId`.
 */
export interface VendorUpdateParams {
  /**
   * The vendor's display name.
   */
  name?: string

  /**
   * The vendor's email address. Null clears it.
   */
  email?: string | null

  /**
   * The vendor's phone number. Null clears it.
   */
  phone?: string | null

  /**
   * The vendor's website. Null clears it.
   */
  website?: string | null

  /**
   * Three-letter ISO currency code for the vendor. Null clears it.
   */
  currency?: string | null

  /**
   * Whether the vendor is active or archived.
   */
  status?: VendorStatus
}
