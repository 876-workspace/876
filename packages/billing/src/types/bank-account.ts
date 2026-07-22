import type { BankAccountType } from './enums'

/**
 * Parameters for creating a tenant-owned financial account.
 */
export interface BankAccountCreateParams {
  /**
   * The account's display name.
   */
  name: string

  /**
   * Classification of the financial account.
   */
  accountType: BankAccountType

  /**
   * Three-letter ISO currency code held by the account.
   */
  currency: string

  /**
   * An arbitrary description of the account. Often useful for displaying to users.
   */
  description?: string | null
}

/**
 * Parameters for updating a financial account.
 */
export interface BankAccountUpdateParams {
  /**
   * The account's display name.
   */
  name?: string

  /**
   * Classification of the financial account.
   */
  accountType?: BankAccountType

  /**
   * Three-letter ISO currency code held by the account.
   */
  currency?: string

  /**
   * An arbitrary description of the account. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Whether the account is active for new deposits.
   */
  isActive?: boolean
}

/**
 * This object represents a tenant-owned financial account used for deposits and reconciliation.
 */
export interface BankAccount {
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
  accountType: BankAccountType

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
   * Current balance as a decimal string.
   */
  balance: string

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
 * A minimal bank account resource returned after creation.
 */
export interface BankAccountCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'bank_account'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted bank account tombstone.
 */
export interface BankAccountDeleted extends BankAccountCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}
