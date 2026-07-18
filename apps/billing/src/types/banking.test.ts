import { describe, expect, it } from 'vitest'

import {
  BankAccountCreateSchema,
  BankTransactionCreateSchema,
  BankTransactionUpdateSchema,
} from './banking'

describe('banking schemas', () => {
  it('normalizes a bank account currency', () => {
    const result = BankAccountCreateSchema.parse({
      name: '  Operating account  ',
      accountType: 'CHECKING',
      currency: 'jmd',
    })

    expect(result).toEqual({
      name: 'Operating account',
      accountType: 'CHECKING',
      currency: 'JMD',
    })
  })

  it('requires a positive transaction amount', () => {
    const result = BankTransactionCreateSchema.safeParse({
      type: 'CREDIT',
      amount: '0',
      date: 1_788_825_600,
    })

    expect(result.success).toBe(false)
  })

  it('does not allow manual transactions to become payment matched', () => {
    const result = BankTransactionUpdateSchema.safeParse({ status: 'MATCHED' })

    expect(result.success).toBe(false)
  })
})
