import { describe, expect, it } from 'vitest'

import {
  previewDelimitedStatement,
  StatementFileParseError,
} from './banking-statement-file.parser'
import type { StatementFileMapping } from './banking-statement-file.schemas'

const jmdNumberFormat = {
  decimalSeparator: '.' as const,
  thousandsSeparator: ',' as const,
}

describe('previewDelimitedStatement', () => {
  it('parses signed JMD CSV with quoted commas and running balances', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'signed',
      dateColumn: 'Date',
      dateFormat: 'dd/mm/yyyy',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      balanceColumn: 'Balance',
      positiveDirection: 'credit',
      numberFormat: jmdNumberFormat,
    }

    const preview = previewDelimitedStatement({
      content: [
        'Date,Description,Amount,Balance',
        '12/09/2026,"POS, KINGSTON","-1,234.50","98,765.50"',
        '13/09/2026,Deposit,"2,000.00","100,765.50"',
      ].join('\n'),
      format: 'csv',
      currency: 'JMD',
      decimalPlaces: 2,
      mapping,
    })

    expect(preview.errors).toEqual([])
    expect(preview.totalRows).toBe(2)
    expect(preview.lines).toEqual([
      expect.objectContaining({
        sourceRowNumber: 2,
        type: 'debit',
        amount: '123450',
        currency: 'JMD',
        description: 'POS, KINGSTON',
        runningBalance: '9876550',
      }),
      expect.objectContaining({
        sourceRowNumber: 3,
        type: 'credit',
        amount: '200000',
        runningBalance: '10076550',
      }),
    ])
  })

  it('parses separate debit and credit columns', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'debit-credit',
      dateColumn: 'Date',
      dateFormat: 'yyyy-mm-dd',
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      referenceColumn: 'Reference',
      numberFormat: jmdNumberFormat,
    }

    const preview = previewDelimitedStatement({
      content: [
        'Date,Debit,Credit,Reference',
        '2026-09-10,1500.00,,ATM-1',
        '2026-09-11,,2500.25,DEP-1',
      ].join('\n'),
      format: 'csv',
      currency: 'JMD',
      decimalPlaces: 2,
      mapping,
    })

    expect(preview.errors).toEqual([])
    expect(preview.lines.map(({ type, amount, reference }) => ({
      type,
      amount,
      reference,
    }))).toEqual([
      { type: 'debit', amount: '150000', reference: 'ATM-1' },
      { type: 'credit', amount: '250025', reference: 'DEP-1' },
    ])
  })

  it('supports reversed positive direction for credit-card style statements', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'signed',
      dateColumn: 'Date',
      dateFormat: 'yyyy-mm-dd',
      amountColumn: 'Amount',
      positiveDirection: 'debit',
      numberFormat: jmdNumberFormat,
    }

    const preview = previewDelimitedStatement({
      content: ['Date,Amount', '2026-09-10,100.00', '2026-09-11,-40.00'].join(
        '\n'
      ),
      format: 'csv',
      currency: 'USD',
      decimalPlaces: 2,
      mapping,
    })

    expect(preview.errors).toEqual([])
    expect(preview.lines.map(({ type, amount }) => ({ type, amount }))).toEqual([
      { type: 'debit', amount: '10000' },
      { type: 'credit', amount: '4000' },
    ])
  })

  it('normalizes comma decimals and dot thousands without floating point', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'signed',
      dateColumn: 'Date',
      dateFormat: 'yyyy-mm-dd',
      amountColumn: 'Amount',
      positiveDirection: 'credit',
      numberFormat: {
        decimalSeparator: ',',
        thousandsSeparator: '.',
      },
    }

    const preview = previewDelimitedStatement({
      content: ['Date,Amount', '2026-09-10,"1.234,56"'].join('\n'),
      format: 'csv',
      currency: 'EUR',
      decimalPlaces: 2,
      mapping,
    })

    expect(preview.errors).toEqual([])
    expect(preview.lines[0]?.amount).toBe('123456')
  })

  it('keeps valid rows while returning row-level errors for malformed rows', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'debit-credit',
      dateColumn: 'Date',
      dateFormat: 'dd/mm/yyyy',
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      numberFormat: jmdNumberFormat,
    }

    const preview = previewDelimitedStatement({
      content: [
        'Date,Debit,Credit',
        '12/09/2026,100.00,',
        '31/02/2026,50.00,',
        '13/09/2026,25.00,30.00',
      ].join('\n'),
      format: 'csv',
      currency: 'JMD',
      decimalPlaces: 2,
      mapping,
    })

    expect(preview.totalRows).toBe(3)
    expect(preview.lines).toHaveLength(1)
    expect(preview.errors).toHaveLength(2)
    expect(preview.errors.map((error) => error.rowNumber)).toEqual([3, 4])
    expect(preview.errors[0]?.message).toContain('not a valid calendar date')
    expect(preview.errors[1]?.message).toContain('both debit and credit')
  })

  it('rejects structurally invalid CSV before producing a preview', () => {
    const mapping: StatementFileMapping = {
      amountMode: 'signed',
      dateColumn: 'Date',
      dateFormat: 'yyyy-mm-dd',
      amountColumn: 'Amount',
      positiveDirection: 'credit',
      numberFormat: jmdNumberFormat,
    }

    expect(() =>
      previewDelimitedStatement({
        content: 'Date,Amount\n2026-09-10,"100.00',
        format: 'csv',
        currency: 'JMD',
        decimalPlaces: 2,
        mapping,
      })
    ).toThrow(StatementFileParseError)
  })
})
