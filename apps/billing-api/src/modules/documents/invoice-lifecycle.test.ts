import { describe, expect, it } from 'vitest'
import type { InvoiceStatus } from '@/db'
import {
  collectibleInvoiceStatuses,
  isCollectibleInvoiceStatus,
  projectCollectibleInvoiceStatus,
} from './invoice-lifecycle'

const NOW = 1_788_830_000

describe('invoice lifecycle projection', () => {
  it('keeps the collectible status catalog exact', () => {
    // ARRANGE
    const expected: InvoiceStatus[] = [
      'OPEN',
      'SENT',
      'PARTIALLY_PAID',
      'OVERDUE',
    ]

    // ACT
    const result = [...collectibleInvoiceStatuses]

    // ASSERT
    expect(result).toEqual(expected)

    // AFTER — no teardown needed.
  })

  it.each<InvoiceStatus>([
    'OPEN',
    'SENT',
    'PARTIALLY_PAID',
    'OVERDUE',
  ])('accepts %s as a collectible invoice status', (status) => {
    // ARRANGE
    const input = status

    // ACT
    const result = isCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe(true)

    // AFTER — no teardown needed.
  })

  it.each<InvoiceStatus>(['DRAFT', 'PAID', 'UNCOLLECTIBLE', 'VOID'])(
    'rejects %s as a collectible invoice status',
    (status) => {
      // ARRANGE
      const input = status

      // ACT
      const result = isCollectibleInvoiceStatus(input)

      // ASSERT
      expect(result).toBe(false)

      // AFTER — no teardown needed.
    }
  )

  it('projects a zero balance as paid', () => {
    // ARRANGE
    const input = {
      amountDue: 0n,
      amountPaid: 50_000n,
      amountCredited: 0n,
      dueAt: NOW - 10,
      sentAt: NOW - 20,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('PAID')

    // AFTER — no teardown needed.
  })

  it('keeps a partially settled past-due invoice overdue', () => {
    // ARRANGE
    const input = {
      amountDue: 60_000n,
      amountPaid: 40_000n,
      amountCredited: 0n,
      dueAt: NOW - 1,
      sentAt: NOW - 100,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('OVERDUE')

    // AFTER — no teardown needed.
  })

  it('projects a partially settled invoice before its due date as partially paid', () => {
    // ARRANGE
    const input = {
      amountDue: 60_000n,
      amountPaid: 40_000n,
      amountCredited: 0n,
      dueAt: NOW + 1,
      sentAt: NOW - 100,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('PARTIALLY_PAID')

    // AFTER — no teardown needed.
  })

  it('projects a credited invoice before its due date as partially paid', () => {
    // ARRANGE
    const input = {
      amountDue: 80_000n,
      amountPaid: 0n,
      amountCredited: 20_000n,
      dueAt: NOW + 1,
      sentAt: null,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('PARTIALLY_PAID')

    // AFTER — no teardown needed.
  })

  it('preserves sent as the compatibility status for an unsettled current invoice', () => {
    // ARRANGE
    const input = {
      amountDue: 100_000n,
      amountPaid: 0n,
      amountCredited: 0n,
      dueAt: NOW + 1,
      sentAt: NOW - 100,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('SENT')

    // AFTER — no teardown needed.
  })

  it('projects an unsettled current unsent invoice as open', () => {
    // ARRANGE
    const input = {
      amountDue: 100_000n,
      amountPaid: 0n,
      amountCredited: 0n,
      dueAt: NOW + 1,
      sentAt: null,
      asOf: NOW,
    }

    // ACT
    const result = projectCollectibleInvoiceStatus(input)

    // ASSERT
    expect(result).toBe('OPEN')

    // AFTER — no teardown needed.
  })
})
