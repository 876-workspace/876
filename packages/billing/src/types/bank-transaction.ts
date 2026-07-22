import type { BankTransactionStatus, BankTransactionType } from './enums'
import type { MinorAmount } from './common'

/**
 * Parameters for recording a manual bank transaction.
 */
export interface BankTransactionCreateParams {
  /**
   * Whether the transaction credits or debits the account. One of `CREDIT` or `DEBIT`.
   */
  type: BankTransactionType

  /**
   * Transaction amount in the smallest currency unit.
   */
  amount: MinorAmount

  /**
   * Time at which the transaction occurred. Measured in seconds since the Unix epoch.
   */
  date: number

  /**
   * An arbitrary description of the transaction. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * An arbitrary bank or external reference for the transaction.
   */
  reference?: string | null
}

/**
 * Parameters for updating a manual bank transaction.
 */
export interface BankTransactionUpdateParams {
  /**
   * Whether the transaction credits or debits the account. One of `CREDIT` or `DEBIT`.
   */
  type?: BankTransactionType

  /**
   * Transaction amount in the smallest currency unit.
   */
  amount?: MinorAmount

  /**
   * Time at which the transaction occurred. Measured in seconds since the Unix epoch.
   */
  date?: number

  /**
   * An arbitrary description of the transaction. Often useful for displaying to users.
   */
  description?: string | null

  /**
   * Reconciliation status. Cannot be set to `MATCHED` manually.
   */
  status?: Exclude<BankTransactionStatus, 'MATCHED'>

  /**
   * An arbitrary bank or external reference for the transaction.
   */
  reference?: string | null
}

/**
 * This object represents a bank transaction on a tenant financial account.
 */
export interface BankTransaction {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'bank_transaction'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the bank account that owns the transaction.
   */
  accountId: string

  /**
   * ID of the linked payment when the transaction was created from a payment.
   */
  paymentId: string | null

  /**
   * Whether the transaction credits or debits the account. One of `CREDIT` or `DEBIT`.
   */
  type: BankTransactionType

  /**
   * Transaction amount as a decimal string.
   */
  amount: string

  /**
   * Time at which the transaction occurred. Measured in seconds since the Unix epoch.
   */
  date: number

  /**
   * An arbitrary description of the transaction. Often useful for displaying to users.
   */
  description: string | null

  /**
   * Reconciliation status of the transaction.
   */
  status: BankTransactionStatus

  /**
   * An arbitrary bank or external reference for the transaction.
   */
  reference: string | null

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
 * A minimal bank transaction resource returned after creation.
 */
export interface BankTransactionCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'bank_transaction'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted bank transaction tombstone.
 */
export interface BankTransactionDeleted extends BankTransactionCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}
