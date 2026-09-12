import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'

function client(fetchMock: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl: BASE,
    organizationId: 'org_1',
    fetch: fetchMock as unknown as typeof fetch,
  })
}

function jsonOnce(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

function bankAccount() {
  return {
    object: 'bank_account',
    id: 'ba_1',
    name: 'NCB Operating',
    accountType: 'CHECKING',
    currency: 'JMD',
    description: null,
    directoryBankId: 'bank_ncb',
    directoryBranchId: 'bankBranch_halfwaytree',
    institutionName: 'National Commercial Bank Jamaica Limited',
    accountHolderName: 'Example Limited',
    accountNumberLast4: '1234',
    openingBalance: '0',
    openingBalanceAt: null,
    isActive: true,
    isSystem: false,
    balance: '0',
    booksBalance: '0',
    bankBalance: null,
    bankBalanceAt: null,
    lastStatementBalance: null,
    lastStatementAt: null,
    createdAt: 1_789_000_000,
    updatedAt: 1_789_000_000,
  }
}

function statementLine() {
  return {
    object: 'bank-statement-line',
    id: 'bsl_1',
    accountId: 'ba_1',
    importId: 'bsi_1',
    externalId: null,
    fingerprint: 'fp_1',
    postedAt: 1_789_000_000,
    authorizedAt: null,
    type: 'debit',
    amount: '123450',
    currency: 'JMD',
    description: 'POS, KINGSTON',
    payee: null,
    reference: null,
    bankCategory: null,
    runningBalance: '9876550',
    status: 'uncategorized',
    recognitionSource: null,
    recognizedRuleId: null,
    duplicateOfId: null,
    excludedAt: null,
    createdAt: 1_789_000_001,
    updatedAt: 1_789_000_001,
  }
}

function statementImport() {
  return {
    object: 'bank-statement-import',
    id: 'bsi_1',
    accountId: 'ba_1',
    source: 'file',
    format: 'csv',
    sourceFileId: 'file_1',
    sourceName: 'statement.csv',
    status: 'completed',
    transactionCount: 1,
    duplicateCount: 0,
    completedAt: 1_789_000_001,
    undoneAt: null,
    createdAt: 1_789_000_001,
    updatedAt: 1_789_000_001,
    lines: [statementLine()],
  }
}

function bankDeposit() {
  return {
    object: 'bank-deposit' as const,
    id: 'bdep_1',
    sourceAccountId: 'ba_undeposited',
    destinationAccountId: 'ba_checking',
    amount: '12500',
    currency: 'JMD',
    depositedAt: 1_789_000_000,
    description: null,
    reference: null,
    status: 'posted' as const,
    reversedAt: null,
    createdAt: 1_789_000_000,
    updatedAt: 1_789_000_000,
    transactionIds: ['btxn_1'],
  }
}

const signedMapping = {
  amountMode: 'signed' as const,
  dateColumn: 'Date',
  dateFormat: 'dd/mm/yyyy' as const,
  descriptionColumn: 'Description',
  amountColumn: 'Amount',
  balanceColumn: 'Balance',
  positiveDirection: 'credit' as const,
  numberFormat: {
    decimalSeparator: '.' as const,
    thousandsSeparator: ',' as const,
  },
}

describe('banking SDK resources', () => {
  it('preserves full bank-account responses including Core directory ids', async () => {
    const fetchMock = jsonOnce(bankAccount())

    const result = await client(fetchMock).bankAccounts.create({
      name: 'NCB Operating',
      accountType: 'CHECKING',
      currency: 'JMD',
      directoryBankId: 'bank_ncb',
      directoryBranchId: 'bankBranch_halfwaytree',
    })

    expect(result.error).toBeNull()
    expect(result.data?.directoryBankId).toBe('bank_ncb')
    expect(result.data?.directoryBranchId).toBe('bankBranch_halfwaytree')
    expect(result.data?.booksBalance).toBe('0')
  })

  it('previews a file through the account-scoped preview endpoint', async () => {
    const fetchMock = jsonOnce({
      object: 'bank-statement-preview',
      accountId: 'ba_1',
      format: 'csv',
      currency: 'JMD',
      headers: ['Date', 'Description', 'Amount', 'Balance'],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      lines: [
        {
          sourceRowNumber: 2,
          externalId: null,
          postedAt: 1_789_000_000,
          type: 'debit',
          amount: '123450',
          currency: 'JMD',
          description: 'POS, KINGSTON',
          payee: null,
          reference: null,
          runningBalance: '9876550',
        },
      ],
      errors: [],
    })

    const params = {
      format: 'csv' as const,
      content:
        'Date,Description,Amount,Balance\n12/09/2026,"POS, KINGSTON","-1,234.50","98,765.50"',
      currency: 'JMD',
      mapping: signedMapping,
    }
    const result = await client(fetchMock).bankStatementImports.previewFile(
      'ba/1',
      params
    )

    expect(result.error).toBeNull()
    expect(result.data?.lines[0]?.amount).toBe('123450')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/accounts/${encodeURIComponent('ba/1')}/statement-imports/preview`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('imports raw statement content rather than client-normalized lines', async () => {
    const fetchMock = jsonOnce(statementImport())

    const result = await client(fetchMock).bankStatementImports.importFile(
      'ba_1',
      {
        format: 'csv',
        content:
          'Date,Description,Amount,Balance\n12/09/2026,"POS, KINGSTON","-1,234.50","98,765.50"',
        currency: 'JMD',
        mapping: signedMapping,
        sourceFileId: 'file_1',
        sourceName: 'statement.csv',
      }
    )

    expect(result.error).toBeNull()
    expect(result.data?.lines).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/accounts/ba_1/statement-imports/file`,
      expect.objectContaining({ method: 'POST' })
    )

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(body).toHaveProperty('content')
    expect(body).not.toHaveProperty('lines')
  })

  it('encodes statement line ids for matching endpoints', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/x',
    })

    await client(fetchMock).bankStatementLines.matches('line/1')

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${BASE}/api/v1/banking/statement-lines/${encodeURIComponent('line/1')}/matches`
    )
  })

  it('posts reconciliation completion through the action endpoint', async () => {
    const fetchMock = jsonOnce({
      object: 'bank-reconciliation',
      id: 'br_1',
      accountId: 'ba_1',
      startAt: 1,
      endAt: 2,
      openingBalance: '0',
      closingBalance: '0',
      clearedBalance: '0',
      difference: '0',
      status: 'completed',
      completedAt: 2,
      reopenedAt: null,
      createdAt: 1,
      updatedAt: 2,
      bankTransactionIds: [],
    })

    const result = await client(fetchMock).bankReconciliations.complete('br_1')

    expect(result.data?.status).toBe('completed')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/reconciliations/br_1/complete`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('lists bank deposits through the banking collection', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [bankDeposit()],
      has_more: false,
      total_count: 1,
      url: '/api/v1/banking/deposits',
    })
    const result = await client(fetchMock).bankDeposits.list()
    expect(result.data?.data).toEqual([bankDeposit()])
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/deposits`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a bank deposit with minor-unit amount strings', async () => {
    const fetchMock = jsonOnce(bankDeposit())
    await client(fetchMock).bankDeposits.create({
      sourceAccountId: 'ba_undeposited',
      destinationAccountId: 'ba_checking',
      transactionIds: ['btxn_1'],
      amount: '12500',
      currency: 'JMD',
      depositedAt: 1_789_000_000,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/deposits`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          sourceAccountId: 'ba_undeposited',
          destinationAccountId: 'ba_checking',
          transactionIds: ['btxn_1'],
          amount: '12500',
          currency: 'JMD',
          depositedAt: 1_789_000_000,
        }),
      })
    )
  })

  it('retrieves a bank deposit with an encoded identifier', async () => {
    const fetchMock = jsonOnce(bankDeposit())
    const result = await client(fetchMock).bankDeposits.retrieve('bdep/1')
    expect(result.data?.id).toBe('bdep_1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/deposits/${encodeURIComponent('bdep/1')}`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('voids a bank deposit through its action endpoint', async () => {
    const fetchMock = jsonOnce({
      ...bankDeposit(),
      status: 'reversed',
      reversedAt: 1_789_000_001,
    })
    const result = await client(fetchMock).bankDeposits.void('bdep_1')
    expect(result.data?.status).toBe('reversed')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/banking/deposits/bdep_1/void`,
      expect.objectContaining({ method: 'POST' })
    )
  })
})
