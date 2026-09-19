import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { Refund, RefundCreated, RefundList } from '../types'

const refund: Refund = {
  object: 'refund',
  id: 'rfnd_1',
  customerId: 'blcus_1',
  creditNoteId: null,
  paymentId: 'pay_1',
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
  number: 'RFD-0001',
  amount: '5000',
  currency: 'JMD',
  reason: 'Duplicate charge',
  notes: null,
  refundedAt: 1_788_825_600,
  createdAt: 1_788_825_600,
  updatedAt: 1_788_825_600,
}

const list: RefundList = {
  object: 'list',
  data: [refund],
  has_more: false,
  total_count: 1,
  url: '/api/v1/refunds',
}

function clientFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return {
    client: create876Client({ baseUrl: 'https://billing.example.test', fetch }),
    fetch,
  }
}

describe('refunds resource', () => {
  it('lists refunds at the tenant refunds path and returns the parsed list', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })

    const result = await client.refunds.list()

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/refunds',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns the parsed refund row with minor-unit money as a string', async () => {
    const { client } = clientFor({ data: list, error: null })

    const result = await client.refunds.list()

    expect(result.data?.data[0]).toEqual(refund)
    expect(result.data?.data[0]?.amount).toBe('5000')
    expect(result.error).toBeNull()
  })

  it('creates a refund with the exact body', async () => {
    const created: RefundCreated = { object: 'refund', id: 'rfnd_1' }
    const { client, fetch } = clientFor({ data: created, error: null })
    const params = {
      customerId: 'blcus_1',
      currency: 'JMD',
      amount: '5000',
      paymentId: 'pay_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      reason: 'Duplicate charge',
      refundedAt: 1_788_825_600,
    }

    const result = await client.refunds.create(params)

    expect(result).toEqual({ data: created, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/refunds',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      })
    )
  })

  it('surfaces a list failure as a value instead of throwing', async () => {
    const { client } = clientFor({
      data: null,
      error: { code: 'refund/forbidden', message: 'Not allowed.' },
    })

    const result = await client.refunds.list()

    expect(result).toEqual({
      data: null,
      error: { code: 'refund/forbidden', message: 'Not allowed.' },
    })
  })

  it('surfaces a create failure as a value instead of throwing', async () => {
    const { client } = clientFor({
      data: null,
      error: {
        code: 'refund/invalid-source',
        message: 'Provide exactly one refund source.',
        param: 'creditNoteId',
      },
    })

    const result = await client.refunds.create({
      customerId: 'blcus_1',
      currency: 'JMD',
      amount: '5000',
      refundedAt: 1_788_825_600,
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'refund/invalid-source',
        message: 'Provide exactly one refund source.',
        param: 'creditNoteId',
      },
    })
  })
})
