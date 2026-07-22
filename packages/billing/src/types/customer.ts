import type { CustomerKind, CustomerType, TaxBehavior } from './enums'
import type { MinorAmount } from './common'

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
