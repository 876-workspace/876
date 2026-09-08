type AccountCustomer = {
  object: 'customer'
  id: string
  name: string
  defaultCurrency: string | null
  outstandingReceivable: string
  unusedCredits: string
}

export type AccountLedgerEntry = {
  object: 'customer_ledger_entry'
  id: string
  customerId: string
  subscriptionId: string | null
  invoiceId: string | null
  paymentId: string | null
  creditNoteId: string | null
  refundId: string | null
  type: string
  direction: 'DEBIT' | 'CREDIT'
  amount: string
  currency: string
  description: string | null
  effectiveAt: number
  createdAt: number
}

export type AccountLedgerSummary = {
  type: string
  direction: 'DEBIT' | 'CREDIT'
  amount: bigint
}

function signedAmount(
  direction: 'DEBIT' | 'CREDIT',
  amount: bigint
): bigint {
  return direction === 'DEBIT' ? amount : -amount
}

function sumTypes(
  summaries: AccountLedgerSummary[],
  types: ReadonlySet<string>
): bigint {
  return summaries.reduce(
    (total, row) =>
      types.has(row.type)
        ? total + signedAmount(row.direction, row.amount)
        : total,
    0n
  )
}

function sumType(summaries: AccountLedgerSummary[], type: string): bigint {
  return summaries.reduce(
    (total, row) => (row.type === type ? total + row.amount : total),
    0n
  )
}

const BILLED_TYPES = new Set([
  'INVOICE_FINALIZED',
  'INVOICE_VOIDED',
  'OPENING_BALANCE',
])

/**
 * Build one customer-account read model from immutable subledger evidence plus
 * the denormalized current AR/credit projections.
 *
 * Receipt and allocation deliberately remain separate here. A payment receipt
 * contributes one `PAYMENT_RECEIVED` credit to the subledger. Allocating that
 * already-received cash changes `outstandingReceivable` and `unusedCredits` in
 * equal/opposite directions and creates no second customer credit.
 */
export function buildCustomerAccountProjection(
  customer: AccountCustomer,
  entriesNewestFirst: AccountLedgerEntry[],
  summaries: AccountLedgerSummary[],
  overdueReceivable: bigint
) {
  const closingBalance = summaries.reduce(
    (total, row) => total + signedAmount(row.direction, row.amount),
    0n
  )
  const lifetimeBilled = sumTypes(summaries, BILLED_TYPES)
  const lifetimePaid =
    sumType(summaries, 'PAYMENT_RECEIVED') -
    sumType(summaries, 'PAYMENT_REVERSED') -
    sumType(summaries, 'REFUND_ISSUED')

  const statementEntries = [...entriesNewestFirst].reverse()
  const displayedNet = statementEntries.reduce(
    (total, entry) =>
      total + signedAmount(entry.direction, BigInt(entry.amount)),
    0n
  )
  const openingBalance = closingBalance - displayedNet
  let runningBalance = openingBalance
  const statement = statementEntries.map((entry) => {
    runningBalance += signedAmount(entry.direction, BigInt(entry.amount))
    return { ...entry, balance: runningBalance.toString() }
  })

  const outstandingReceivable = BigInt(customer.outstandingReceivable)
  const availableCredit = BigInt(customer.unusedCredits)

  return {
    object: 'customer_account' as const,
    customer,
    currency: customer.defaultCurrency,
    lifetimeBilled: lifetimeBilled.toString(),
    lifetimePaid: lifetimePaid.toString(),
    outstandingReceivable: outstandingReceivable.toString(),
    overdueReceivable: overdueReceivable.toString(),
    availableCredit: availableCredit.toString(),
    netPosition: (outstandingReceivable - availableCredit).toString(),
    openingBalance: openingBalance.toString(),
    closingBalance: closingBalance.toString(),
    statement,

    // Compatibility aliases for the Express v1 shape that shipped during the
    // Prisma-to-API cutover. Keep them until all current consumers have moved to
    // the typed account fields above; they are projections of the same facts,
    // not a second financial representation.
    unusedCredits: availableCredit.toString(),
    entries: entriesNewestFirst,
  }
}
