import type { CursorPageParams } from '@876/core/client'

import type { List } from '../../types'
import type {
  BillingCustomerKind,
  BillingCustomerStatus,
  BillingCustomerType,
} from './enums'

/**
 * This object represents a Billing customer exposed through the integration API.
 */
export interface BillingCustomer {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the product app that created this customer, if any.
   */
  sourceAppId: string | null

  /**
   * External reference in the product app that created this customer, if any.
   */
  sourceExternalReference: string | null

  /**
   * How this customer is linked to the 876 identity platform.
   */
  customerType: BillingCustomerType

  /**
   * Whether the customer is a person or a business.
   */
  customerKind: BillingCustomerKind

  /**
   * ID of the Core organization linked when `customerType` is `CORE_ORGANIZATION`.
   */
  organizationId: string | null

  /**
   * ID of the Core user linked when `customerType` is `CORE_USER`.
   */
  userId: string | null

  /**
   * An external reference you can use to match this customer in another system.
   */
  externalReference: string | null

  /**
   * The customer's full name or business name.
   */
  name: string

  /**
   * Optional salutation for the customer.
   */
  salutation: string | null

  /**
   * The customer's first name.
   */
  firstName: string | null

  /**
   * The customer's last name.
   */
  lastName: string | null

  /**
   * The customer's company name when they are a business.
   */
  companyName: string | null

  /**
   * The customer's email address.
   */
  email: string | null

  /**
   * The customer's phone number.
   */
  phone: string | null

  /**
   * The customer's work phone number.
   */
  workPhone: string | null

  /**
   * The customer's billing address, if present.
   */
  billingAddress: unknown | null

  /**
   * Set of key-value pairs attached to the customer.
   */
  metadata: unknown | null

  /**
   * Three-letter ISO currency code the customer is billed in, if set.
   */
  defaultCurrency: string | null

  /**
   * Preferred language or locale for the customer.
   */
  language: string | null

  /**
   * Outstanding receivable balance as a decimal string.
   */
  outstandingReceivable: string

  /**
   * Unused credits as a decimal string.
   */
  unusedCredits: string

  /**
   * Time at which Core identity fields were last synced. Measured in seconds since the Unix epoch.
   */
  coreSyncedAt: number | null

  /**
   * Lifecycle status of the customer. One of `ACTIVE` or `ARCHIVED`.
   */
  status: BillingCustomerStatus

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number

  /**
   * Related resource counts, when the endpoint includes them.
   */
  counts?: {
    invoices: number
    quotes: number
    subscriptions: number
  }
}

/**
 * Parameters for creating a Billing customer through the integration API.
 */
export interface BillingCustomerCreateParams {
  /**
   * The customer's full name or business name.
   */
  name: string

  /**
   * Whether the customer is a person or a business. One of `INDIVIDUAL` or `BUSINESS`.
   */
  customerKind?: BillingCustomerKind

  /**
   * Optional salutation for the customer.
   */
  salutation?: string | null

  /**
   * The customer's first name.
   */
  firstName?: string | null

  /**
   * The customer's last name.
   */
  lastName?: string | null

  /**
   * The customer's company name when they are a business.
   */
  companyName?: string | null

  /**
   * The customer's email address.
   */
  email?: string | null

  /**
   * The customer's phone number.
   */
  phone?: string | null

  /**
   * The customer's work phone number.
   */
  workPhone?: string | null

  /**
   * Three-letter ISO currency code the customer is billed in.
   */
  currency?: string | null

  /**
   * Preferred language or locale for the customer.
   */
  language?: string | null

  /**
   * How this customer is linked to the 876 identity platform. One of
   * `EXTERNAL`, `CORE_USER`, or `CORE_ORGANIZATION`.
   */
  customerType?: BillingCustomerType

  /**
   * ID of the Core organization linked when `customerType` is `CORE_ORGANIZATION`.
   */
  organizationId?: string | null

  /**
   * ID of the Core user linked when `customerType` is `CORE_USER`.
   */
  userId?: string | null

  /**
   * External reference for the product app that created the customer.
   */
  sourceExternalReference?: string | null
}

/**
 * Parameters for listing Billing customers.
 */
export interface BillingCustomerListParams extends CursorPageParams {
  /**
   * Filter by lifecycle status. One of `ACTIVE` or `ARCHIVED`.
   */
  status?: BillingCustomerStatus

  /**
   * Resolve the one shared Billing customer linked to a Core user.
   */
  userId?: string

  /**
   * Resolve the one shared Billing customer linked to a Core organization.
   */
  organizationId?: string
}

/**
 * Parameters for updating a Billing customer.
 */
export type BillingCustomerUpdateParams = Partial<
  Pick<
    BillingCustomer,
    | 'name'
    | 'customerKind'
    | 'salutation'
    | 'firstName'
    | 'lastName'
    | 'companyName'
    | 'email'
    | 'phone'
    | 'workPhone'
    | 'language'
    | 'status'
  > & { currency: string | null }
>

/**
 * A deleted customer tombstone.
 */
export interface DeletedBillingCustomer {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * A list of Billing customers.
 */
export type BillingCustomerList = List<BillingCustomer>
