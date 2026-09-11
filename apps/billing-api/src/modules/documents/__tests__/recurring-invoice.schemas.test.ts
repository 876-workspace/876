import { describe, expect, it } from 'vitest'

import {
  RecurringInvoiceCreateSchema,
  RecurringInvoiceUpdateSchema,
} from '../schemas/recurring-invoice'

const valid = {
  profileName: 'Monthly retainer',
  customerId: 'cus_1',
  currency: 'JMD',
  frequency: { intervalUnit: 'month' as const, intervalCount: 1 },
  startAt: 1_706_659_200,
  generationMode: 'finalize' as const,
  lines: [
    {
      description: 'Retainer',
      quantity: 1,
      unitAmount: '4500000',
      taxAmount: '0',
      discountAmount: '0',
    },
  ],
}

describe('Recurring Invoice schemas', () => {
  it('accepts a canonical recurring template', () =>
    expect(RecurringInvoiceCreateSchema.parse(valid).currency).toBe('JMD'))
  it('requires a positive frequency interval count', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({
        ...valid,
        frequency: { intervalUnit: 'month', intervalCount: 0 },
      }).success
    ).toBe(false))
  it('rejects an end date before its start date', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({
        ...valid,
        endAt: valid.startAt - 1,
      }).success
    ).toBe(false))
  it('requires maxCycles to be positive', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({ ...valid, maxCycles: 0 }).success
    ).toBe(false))
  it('rejects an empty template line collection', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({ ...valid, lines: [] }).success
    ).toBe(false))
  it('rejects unexpected create keys', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({ ...valid, unexpected: true })
        .success
    ).toBe(false))
  it('accepts an editable partial template update', () =>
    expect(
      RecurringInvoiceUpdateSchema.parse({ profileName: 'Revised retainer' })
        .profileName
    ).toBe('Revised retainer'))
  it('rejects an invalid generation mode', () =>
    expect(
      RecurringInvoiceCreateSchema.safeParse({
        ...valid,
        generationMode: 'send',
      }).success
    ).toBe(false))
})
