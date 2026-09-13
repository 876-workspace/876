import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  findActiveInvoiceForSalesOrder: vi.fn(),
  findSalesOrderForLifecycle: vi.fn(),
  applySalesOrderTransition: vi.fn(),
  runSalesOrderTransaction: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('../repositories/sales-orders', () => ({
  findActiveInvoiceForSalesOrder: mocks.findActiveInvoiceForSalesOrder,
  findSalesOrderForLifecycle: mocks.findSalesOrderForLifecycle,
  applySalesOrderTransition: mocks.applySalesOrderTransition,
  runSalesOrderTransaction: mocks.runSalesOrderTransaction,
}))

import { transitionSalesOrderWorkflow } from './transition-sales-order'

function order(status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED') {
  mocks.findSalesOrderForLifecycle.mockResolvedValue({ id: 'so_123', status })
}

describe('transitionSalesOrderWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.runSalesOrderTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) => work({})
    )
    mocks.applySalesOrderTransition.mockResolvedValue({ count: 1 })
    mocks.findActiveInvoiceForSalesOrder.mockResolvedValue(null)
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'cmd_123' },
      error: null,
    })
    mocks.completeCommand.mockResolvedValue(undefined)
  })

  it('confirms a draft Sales Order', async () => {
    order('DRAFT')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm'
    )
    expect(result).toEqual({ data: { id: 'so_123' }, error: null })
    expect(mocks.applySalesOrderTransition).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ from: 'DRAFT', to: 'CONFIRMED' })
    )
  })

  it('cancels a draft Sales Order', async () => {
    order('DRAFT')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'cancel'
    )
    expect(result.error).toBeNull()
    expect(mocks.applySalesOrderTransition).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ from: 'DRAFT', to: 'CANCELED' })
    )
  })

  it('completes a confirmed Sales Order', async () => {
    order('CONFIRMED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'complete'
    )
    expect(result.error).toBeNull()
    expect(mocks.applySalesOrderTransition).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ from: 'CONFIRMED', to: 'COMPLETED' })
    )
  })

  it('cancels a confirmed Sales Order when it has no active invoice', async () => {
    order('CONFIRMED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'cancel'
    )
    expect(result.error).toBeNull()
    expect(mocks.findActiveInvoiceForSalesOrder).toHaveBeenCalledOnce()
  })

  it('rejects canceling a confirmed Sales Order with an active invoice', async () => {
    order('CONFIRMED')
    mocks.findActiveInvoiceForSalesOrder.mockResolvedValue({
      id: 'inv_123',
      status: 'OPEN',
    })
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'cancel'
    )
    expect(result).toMatchObject({
      data: null,
      code: 'billing/sales-order-invalid-state',
      status: 409,
    })
    expect(mocks.applySalesOrderTransition).not.toHaveBeenCalled()
  })

  it('rejects completing a draft Sales Order', async () => {
    order('DRAFT')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'complete'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects confirming an already confirmed Sales Order', async () => {
    order('CONFIRMED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects confirming a completed Sales Order', async () => {
    order('COMPLETED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects canceling a completed Sales Order', async () => {
    order('COMPLETED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'cancel'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects completing a completed Sales Order', async () => {
    order('COMPLETED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'complete'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects confirming a canceled Sales Order', async () => {
    order('CANCELED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('rejects canceling an already canceled Sales Order', async () => {
    order('CANCELED')
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'cancel'
    )
    expect(result).toMatchObject({ code: 'billing/sales-order-invalid-state' })
  })

  it('returns not-found for another tenant or missing Sales Order', async () => {
    mocks.findSalesOrderForLifecycle.mockResolvedValue(null)
    const result = await transitionSalesOrderWorkflow(
      'tenant_other',
      'so_123',
      'confirm'
    )
    expect(result).toMatchObject({
      code: 'billing/sales-order-not-found',
      status: 404,
    })
  })

  it('replays an idempotent lifecycle command without a second state mutation', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: {
        state: 'replayed',
        resource: { type: 'sales-order', id: 'so_123' },
      },
      error: null,
    })
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm',
      { key: 'retry-1', requestHash: 'hash' }
    )
    expect(result).toEqual({ data: { id: 'so_123' }, error: null })
    expect(mocks.findSalesOrderForLifecycle).not.toHaveBeenCalled()
    expect(mocks.applySalesOrderTransition).not.toHaveBeenCalled()
  })

  it('returns a conflict when compare-and-set loses a concurrent transition', async () => {
    order('DRAFT')
    mocks.applySalesOrderTransition.mockResolvedValue({ count: 0 })
    const result = await transitionSalesOrderWorkflow(
      'tenant_123',
      'so_123',
      'confirm'
    )
    expect(result).toMatchObject({
      code: 'billing/sales-order-invalid-state',
      status: 409,
    })
  })
})
