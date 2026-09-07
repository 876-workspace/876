import type { CustomerKind, CustomerType, TaxBehavior } from './enums'
import type { List, MinorAmount } from './common'

/**
 * Parameters for creating a tenant-owned Billing customer.
 */
export interface CustomerCreateParams {
  /**
   * The customer's full name or business name.
   */
  name: string

  /**
   * Whether the customer is a person or a business. One of `INDIVIDUAL` or `BUSINESS`.
   */
  customerKind?: CustomerKind

  /**
   * Optional salutation for the customer (for example, `Mr` or `Ms`).
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
  customerType?: CustomerType

  /**
   * ID of the 876 organization linked when `customerType` is `CORE_ORGANIZATION`.
   */
  organizationId?: string | null

  /**
   * ID of the 876 user linked when `customerType` is `CORE_USER`.
   */
  userId?: string | null

  /**
   * An external reference you can use to match this customer in another system.
   */
  externalReference?: string | null

  /**
   * ID of the default payment term for this customer's invoices.
   */
  paymentTermId?: string | null

  /**
   * ID of the default salesperson for this customer.
   */
  salespersonId?: string | null

  /**
   * ID of the default price list used when resolving catalog prices.
   */
  priceListId?: string | null

  /**
   * Optional tax behavior override for this customer. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  taxBehaviorOverride?: TaxBehavior | null

  /**
   * Whether late fees are waived for this customer.
   */
  lateFeeExempt?: boolean

  /**
   * Default notes printed on invoices for this customer.
   */
  invoiceNotes?: string | null

  /**
   * Default terms printed on invoices for this customer.
   */
  invoiceTerms?: string | null
}

/**
 * A minimal customer resource returned after creation.
 */
export interface CustomerCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * Parameters for posting a customer opening balance.
 */
export interface CustomerOpeningBalanceParams {
  /**
   * Opening balance amount in the smallest currency unit.
   */
  amount: MinorAmount

  /**
   * Three-letter ISO currency code for the opening balance.
   */
  currency: string

  /**
   * Time at which the opening balance takes effect. Measured in seconds since the Unix epoch.
   */
  asOf: number

  /**
   * An arbitrary reference attached to the opening balance entry.
   */
  reference?: string | null
}

/**
 * A single line on a customer account statement.
 */
export interface CustomerLedgerEntry {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer_ledger_entry'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The type of ledger entry (for example, invoice, payment, or credit).
   */
  type: string

  /**
   * Whether the entry increases or decreases the receivable. One of `DEBIT` or `CREDIT`.
   */
  direction: 'DEBIT' | 'CREDIT'

  /**
   * Amount as a decimal string.
   */
  amount: string

  /**
   * Three-letter ISO currency code for the entry.
   */
  currency: string

  /**
   * An arbitrary description of the entry. Often useful for displaying to users.
   */
  description: string | null

  /**
   * Time at which the entry is effective. Measured in seconds since the Unix epoch.
   */
  effectiveAt: number

  /**
   * ID of the related invoice, if any.
   */
  invoiceId: string | null

  /**
   * ID of the related payment, if any.
   */
  paymentId: string | null

  /**
   * ID of the related credit note, if any.
   */
  creditNoteId: string | null

  /**
   * ID of the related refund, if any.
   */
  refundId: string | null
}

/**
 * Aggregated receivable position and statement for a customer.
 */
export interface CustomerAccount {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer_account'

  /**
   * The customer this account belongs to.
   */
  customer: {
    /**
     * String representing the object's type. Objects of the same type share the same value.
     */
    object: 'customer'

    /**
     * Unique identifier for the object.
     */
    id: string

    /**
     * The customer's full name or business name.
     */
    name: string
  }

  /**
   * Three-letter ISO currency code used for the aggregated balances, if known.
   */
  currency: string | null

  /**
   * Lifetime billed amount as a decimal string.
   */
  lifetimeBilled: string

  /**
   * Lifetime paid amount as a decimal string.
   */
  lifetimePaid: string

  /**
   * Outstanding receivable balance as a decimal string.
   */
  outstandingReceivable: string

  /**
   * Available credit balance as a decimal string.
   */
  availableCredit: string

  /**
   * Net position (receivable minus credit) as a decimal string.
   */
  netPosition: string

  /**
   * Statement lines for the account.
   */
  statement: CustomerLedgerEntry[]
}

/**
 * A contact person associated with a customer.
 */
export interface CustomerContact {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'contact'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the 876 user linked to this contact, if any.
   */
  userId: string | null

  /**
   * Optional salutation for the contact (for example, `Mr` or `Ms`).
   */
  salutation: string | null

  /**
   * The contact's first name.
   */
  firstName: string | null

  /**
   * The contact's last name.
   */
  lastName: string | null

  /**
   * The contact's email address.
   */
  email: string | null

  /**
   * The contact's work phone number.
   */
  workPhone: string | null

  /**
   * The contact's mobile phone number.
   */
  mobilePhone: string | null

  /** Snapshot of the linked 876 user's avatar, if any. */
  avatar: string | null

  /**
   * Whether this is the primary contact for the customer.
   */
  isPrimary: boolean

  /**
   * Time at which this contact was last synced with the 876 core identity platform. Measured in seconds since the Unix epoch. `null` if not synced.
   */
  coreSyncedAt: number | null
}

/** Parameters for creating a customer contact. */
export interface CustomerContactCreateParams {
  salutation?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  workPhone?: string | null
  mobilePhone?: string | null
  isPrimary?: boolean
}

/** Parameters for updating a customer contact. */
export type CustomerContactUpdateParams = CustomerContactCreateParams

/** A list of customer contacts. */
export type CustomerContactList = List<CustomerContact>

/** A minimal customer contact resource returned after creation. */
export interface CustomerContactCreated {
  object: 'contact'
  id: string
}

/** A deleted customer contact tombstone. */
export interface DeletedCustomerContact {
  object: 'contact'
  id: string
  deleted: true
}

/**
 * Lifecycle status of a customer. One of `ACTIVE` or `ARCHIVED`.
 */
export type CustomerStatus = 'ACTIVE' | 'ARCHIVED'

/**
 * A full customer resource returned by the retrieve and list endpoints.
 */
export interface Customer {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the source application that created this customer, if any.
   */
  sourceAppId: string | null

  /**
   * External reference from the source application that created this customer, if any.
   */
  sourceExternalReference: string | null

  /**
   * How this customer is linked to the 876 identity platform. One of `EXTERNAL`, `CORE_USER`, or `CORE_ORGANIZATION`.
   */
  customerType: CustomerType

  /**
   * Whether the customer is a person or a business. One of `INDIVIDUAL` or `BUSINESS`.
   */
  customerKind: CustomerKind

  /**
   * ID of the 876 organization linked to this customer, if any.
   */
  organizationId: string | null

  /**
   * ID of the 876 user linked to this customer, if any.
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
   * Optional salutation for the customer (for example, `Mr` or `Ms`).
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
   * The customer's billing address, or `null` if not set.
   */
  billingAddress: unknown | null

  /**
   * Arbitrary key-value metadata attached to the customer, or `null` if not set.
   */
  metadata: unknown | null

  /**
   * Three-letter ISO currency code the customer is billed in, or `null` if not set.
   */
  defaultCurrency: string | null

  /**
   * Preferred language or locale for the customer, or `null` if not set.
   */
  language: string | null

  /**
   * Outstanding receivable balance as a decimal string.
   */
  outstandingReceivable: string

  /**
   * Unused credit balance as a decimal string.
   */
  unusedCredits: string

  /**
   * Time at which this customer was last synced with the 876 core identity platform. Measured in seconds since the Unix epoch. `null` if not synced.
   */
  coreSyncedAt: number | null

  /**
   * Lifecycle status of the customer. One of `ACTIVE` or `ARCHIVED`.
   */
  status: CustomerStatus

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number

  /**
   * The primary contact person for the customer, or `null` if not set.
   */
  primaryContact: CustomerContact | null
}

/**
 * Paginated list of customers.
 */
export type CustomerList = import('./common').List<Customer>

/**
 * Parameters for listing customers.
 */
export interface CustomerListParams {
  /** Case-insensitive match on customer name, company, email, or reference. */
  q?: string
  /**
   * Filter by lifecycle status. One of `ACTIVE` or `ARCHIVED`.
   */
  status?: CustomerStatus

  /**
   * Filter by a comma-separated list of customer IDs.
   */
  ids?: string[]

  /**
   * Filter by the ID of the linked 876 user.
   */
  userId?: string

  /**
   * Filter by the ID of the linked 876 organization.
   */
  organizationId?: string

  /**
   * Cursor for use in pagination. Returns the page starting after this customer ID.
   */
  starting_after?: string

  /**
   * Cursor for use in pagination. Returns the page ending before this customer ID.
   */
  ending_before?: string

  /**
   * Maximum number of customers to return. Defaults to 100.
   */
  limit?: number
}

/**
 * Parameters for updating an existing customer.
 */
export type CustomerUpdateParams = Partial<CustomerCreateParams> & {
  /**
   * Lifecycle status of the customer. One of `ACTIVE` or `ARCHIVED`.
   */
  status?: CustomerStatus
}

/**
 * A tombstone returned after a customer is deleted.
 */
export interface DeletedCustomer {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'customer'

  /**
   * Unique identifier of the deleted customer.
   */
  id: string

  /**
   * Always `true` for a deleted resource.
   */
  deleted: true
}
