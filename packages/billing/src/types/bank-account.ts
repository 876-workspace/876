import type { BankAccountType } from './enums'

/** Parameters for creating a tenant-owned financial account. */
export interface BankAccountCreateParams {
  name: string
  accountType: BankAccountType
  currency: string
  description?: string | null
  /** Opaque Core financial-directory bank id. */
  directoryBankId?: string | null
  /** Opaque Core financial-directory branch id. */
  directoryBranchId?: string | null
  institutionName?: string | null
  accountHolderName?: string | null
  /**
   * Full account number. Write-only: it is sealed server-side and never
   * returned on the account; read it back with `accountNumber.retrieve()`.
   * Spaces and dashes are accepted; `null` clears it on update.
   */
  accountNumber?: string | null
  /** Signed opening balance in integer minor units. */
  openingBalance?: string | number
  openingBalanceAt?: number | null
}

/** Parameters for updating financial-account display metadata. */
export interface BankAccountUpdateParams {
  name?: string
  accountType?: BankAccountType
  currency?: string
  description?: string | null
  directoryBankId?: string | null
  directoryBranchId?: string | null
  institutionName?: string | null
  accountHolderName?: string | null
  /**
   * Full account number. Write-only: it is sealed server-side and never
   * returned on the account; read it back with `accountNumber.retrieve()`.
   * Spaces and dashes are accepted; `null` clears it on update.
   */
  accountNumber?: string | null
  isActive?: boolean
}

/** A tenant-owned financial account used for booked cash and reconciliation. */
export interface BankAccount {
  object: 'bank_account'
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  /** Opaque Core directory id; intentionally not a Billing database relation. */
  directoryBankId: string | null
  /** Opaque Core branch id; intentionally not a Billing database relation. */
  directoryBranchId: string | null
  institutionName: string | null
  accountHolderName: string | null
  /** Last four characters of the sealed account number, for display. */
  accountNumberLast4: string | null
  openingBalance: string
  openingBalanceAt: number | null
  isActive: boolean
  /** Whether this account is the tenant's protected system cash account. */
  isSystem: boolean
  /** Compatibility alias for `booksBalance`. */
  balance: string
  /** Canonical balance derived from opening balance plus booked cash movements. */
  booksBalance: string
  /** Latest balance supplied by an external statement/feed source. */
  bankBalance: string | null
  bankBalanceAt: number | null
  lastStatementBalance: string | null
  lastStatementAt: number | null
  createdAt: number
  updatedAt: number
}

/** A minimal bank account resource returned after creation. */
export interface BankAccountCreated {
  object: 'bank_account'
  id: string
}

/** A deleted bank account tombstone. */
export interface BankAccountDeleted extends BankAccountCreated {
  deleted: true
}

/** A tenant's own full account number, disclosed on explicit request. */
export interface BankAccountNumber {
  object: 'bank_account_number'
  accountId: string
  accountNumber: string
  accountNumberLast4: string
}
