import type { List } from '../../types'
import type { BillingBankAccountType } from './enums'

/**
 * This object represents a bank account exposed through the integration API.
 */
export interface BillingBankAccount {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'bank_account'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The account's display name.
   */
  name: string

  /**
   * Classification of the financial account.
   */
  accountType: BillingBankAccountType

  /**
   * Three-letter ISO currency code held by the account.
   */
  currency: string

  /**
   * An arbitrary description of the account. Often useful for displaying to users.
   */
  description: string | null

  /**
   * Whether the account is active for new deposits.
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
 * A list of Billing bank accounts.
 */
export type BillingBankAccountList = List<BillingBankAccount>
