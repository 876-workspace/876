import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  recomputeCustomerAr: vi.fn(),
  consume: vi.fn(),
  restore: vi.fn(),
  recordLedgerEntry: vi.fn(),
  enqueueBillingEvent: vi.fn(),
  findInvoiceForFinalize: vi.fn(),
  findPaymentTerm: vi.fn(),
  findSalesperson: vi.fn(),
  markInvoiceFinalized: vi.fn(),
  findInvoiceForSend: vi.fn(),
  markInvoiceSent: vi.fn(),
  findInvoiceForVoid: vi.fn(),
  markInvoiceVoid: vi.fn(),
  findInvoiceForWriteOff: vi.fn(),
  markInvoiceWrittenOff: vi.fn(),
  runInvoiceTransaction: vi.fn(),
  resolveDueAt: vi.fn(() => 200),
  settleWithAvailableCredits: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('@/modules/customers', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))
vi.mock('@/modules/inventory', () => ({
  consume: mocks.consume,
  restore: mocks.restore,
}))
vi.mock('@/modules/ledger', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }))
vi.mock('@/modules/outbox', () => ({ enqueueBillingEvent: mocks.enqueueBillingEvent }))
vi.mock('@/platform/prisma-errors', () => ({
  isRetryableTransactionError: () => false,
}))
vi.mock('../repositories/invoice-workflow', () => ({
  findInvoiceForFinalize: mocks.findInvoiceForFinalize,
  findPaymentTerm: mocks.findPaymentTerm,
  findSalesperson: mocks.findSalesperson,
  markInvoiceFinalized: mocks.markInvoiceFinalized,
  findInvoiceForSend: mocks.findInvoiceForSend,
  markInvoiceSent: mocks.markInvoiceSent,
  findInvoiceForVoid: mocks.findInvoiceForVoid,
  markInvoiceVoid: mocks.markInvoiceVoid,
  findInvoiceForWriteOff: mocks.findInvoiceForWriteOff,
  markInvoiceWrittenOff: mocks.markInvoiceWrittenOff,
  runInvoiceTransaction: mocks.runInvoiceTransaction,
}))
vi.mock('../repositories/payment-terms', () => ({
  resolveDueAt: mocks.resolveDueAt,
}))
vi.mock('../repositories/invoices/settlement', () => ({
  settleWithAvailableCredits: mocks.settleWithAvailableCredits,
}))

import { finalizeInvoiceWorkflow } from './finalize-invoice'
import { sendInvoiceWorkflow } from './send-invoice'
import { voidInvoiceWorkflow } from './void-invoice'
import { writeOffInvoiceWorkflow } from './write-off-invoice'

const idempotency = { key: 'retry-key', requestHash: 'hash_1' }
const finalizeParams = { autoApplyCredits: false }

function draftInvoice() {
  return {
    id: 'inv_1',
    status: 'DRAFT',
    customerId: 'cus_1',
    subscriptionId: null,
    number: 'INV-001',
    currency: 'JMD',
    totalAmount: 1000n,
    issueAt: null,
    dueAt: null,
    paymentTermId: null,
    salespersonId: null,
    billingReason: 'MANUAL',
    customer: { salespersonId: null },
    lines: [{ itemId: 'item_1', variantId: null, quantity: 2 }],
  }
}

function openInvoice() {
  return {
    id: 'inv_1',
    status: 'OPEN',
    customerId: 'cus_1',
    subscriptionId: null,
    number: 'INV-001',
    currency: 'JMD',
    amountDue: 1000n,
    sentAt: null,
    metadata: null,
    allocations: [],
    creditNoteAllocations: [],
  }
}

describe('Invoice application workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.runInvoiceTransaction.mockImplementation(async (work) => work({}))
    mocks.completeCommand.mockResolvedValue(undefined)
    mocks.recomputeCustomerAr.mockResolvedValue(undefined)
    mocks.recordLedgerEntry.mockResolvedValue(undefined)
    mocks.enqueueBillingEvent.mockResolvedValue({ id: 'evt_1' })
    mocks.markInvoiceFinalized.mockResolvedValue(undefined)
    mocks.markInvoiceSent.mockResolvedValue(undefined)
    mocks.markInvoiceVoid.mockResolvedValue(undefined)
    mocks.markInvoiceWrittenOff.mockResolvedValue(undefined)
    mocks.findPaymentTerm.mockResolvedValue({
      id: 'pterm_1',
      name: 'Due on receipt',
      rule: 'DUE_ON_RECEIPT',
    })
    mocks.findSalesperson.mockResolvedValue(null)
    mocks.consume.mockResolvedValue({ data: { movementCount: 1 }, error: null })
    mocks.restore.mockResolvedValue({ data: { movementCount: 1 }, error: null })
  })

  it('short-circuits a completed finalize replay before current Invoice state', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: {
        state: 'replayed',
        claimId: 'idem_1',
        resource: { type: 'invoice', id: 'inv_1' },
        httpStatus: 201,
      },
      error: null,
    })

    await expect(
      finalizeInvoiceWorkflow('ten_1', 'inv_1', finalizeParams, idempotency)
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.findInvoiceForFinalize).not.toHaveBeenCalled()
    expect(mocks.consume).not.toHaveBeenCalled()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
    expect(mocks.completeCommand).not.toHaveBeenCalled()
  })

  it('finalizes stock, ledger, AR, event, then completes the replay claim', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'idem_1' },
      error: null,
    })
    mocks.findInvoiceForFinalize.mockResolvedValue(draftInvoice())

    await expect(
      finalizeInvoiceWorkflow('ten_1', 'inv_1', finalizeParams, idempotency)
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.consume).toHaveBeenCalledWith({}, 'ten_1', {
      reference: { type: 'invoice', id: 'inv_1' },
      reason: 'sale',
      lines: [{ target: { type: 'item', id: 'item_1' }, quantity: 2 }],
      occurredAt: 100,
    })
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith({}, 'ten_1', {
      type: 'invoice.finalized',
      version: 1,
      resource: { type: 'invoice', id: 'inv_1' },
      payload: {
        invoiceId: 'inv_1',
        customerId: 'cus_1',
        number: 'INV-001',
        currency: 'JMD',
        totalAmount: '1000',
        finalizedAt: 100,
        issueAt: 100,
        dueAt: 100,
      },
      occurredAt: 100,
    })
    expect(mocks.completeCommand).toHaveBeenCalledWith(
      {},
      'ten_1',
      'idem_1',
      100
    )
    expect(mocks.enqueueBillingEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.completeCommand.mock.invocationCallOrder[0]!
    )
  })

  it('does not finalize, emit, or complete the claim when Inventory rejects the sale', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'idem_1' },
      error: null,
    })
    mocks.findInvoiceForFinalize.mockResolvedValue(draftInvoice())
    mocks.consume.mockResolvedValue({
      data: null,
      error: 'Only 1 units of Widget are currently in stock.',
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    await expect(
      finalizeInvoiceWorkflow('ten_1', 'inv_1', finalizeParams, idempotency)
    ).resolves.toEqual({
      data: null,
      error: 'Only 1 units of Widget are currently in stock.',
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    expect(mocks.markInvoiceFinalized).not.toHaveBeenCalled()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
    expect(mocks.completeCommand).not.toHaveBeenCalled()
  })

  it('records sending an open invoice without changing its financial state first', async () => {
    mocks.findInvoiceForSend.mockResolvedValue(openInvoice())

    await expect(
      sendInvoiceWorkflow('ten_1', 'inv_1')
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.markInvoiceSent).toHaveBeenCalledWith({}, {
      id: 'inv_1',
      status: 'OPEN',
      now: 100,
    })
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith({}, 'ten_1', {
      type: 'invoice.sent',
      version: 1,
      resource: { type: 'invoice', id: 'inv_1' },
      payload: {
        invoiceId: 'inv_1',
        customerId: 'cus_1',
        number: 'INV-001',
        currency: 'JMD',
        sentAt: 100,
      },
      occurredAt: 100,
    })
  })

  it('preserves overdue as the financial status when recording a send', async () => {
    mocks.findInvoiceForSend.mockResolvedValue({
      ...openInvoice(),
      status: 'OVERDUE',
    })

    await expect(
      sendInvoiceWorkflow('ten_1', 'inv_1')
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.markInvoiceSent).toHaveBeenCalledWith({}, {
      id: 'inv_1',
      status: 'OVERDUE',
      now: 100,
    })
  })

  it('rejects recording a send for a draft invoice', async () => {
    mocks.findInvoiceForSend.mockResolvedValue({
      ...openInvoice(),
      status: 'DRAFT',
    })

    await expect(
      sendInvoiceWorkflow('ten_1', 'inv_1')
    ).resolves.toEqual({
      data: null,
      error: 'Only a finalized collectible invoice can be sent.',
      status: 409,
    })

    expect(mocks.markInvoiceSent).not.toHaveBeenCalled()
    expect(mocks.enqueueBillingEvent).not.toHaveBeenCalled()
  })

  it('short-circuits a completed void replay before the VOID-state guard', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: {
        state: 'replayed',
        claimId: 'idem_2',
        resource: { type: 'invoice', id: 'inv_1' },
        httpStatus: 201,
      },
      error: null,
    })

    await expect(
      voidInvoiceWorkflow('ten_1', 'inv_1', {}, idempotency)
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.findInvoiceForVoid).not.toHaveBeenCalled()
    expect(mocks.restore).not.toHaveBeenCalled()
  })

  it('restores Inventory and emits the void event before completing the claim', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'idem_2' },
      error: null,
    })
    mocks.findInvoiceForVoid.mockResolvedValue(openInvoice())

    await expect(
      voidInvoiceWorkflow('ten_1', 'inv_1', {}, idempotency)
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.restore).toHaveBeenCalledWith({}, 'ten_1', {
      reference: { type: 'invoice', id: 'inv_1' },
      reason: 'sale',
      occurredAt: 100,
    })
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith({}, 'ten_1', {
      type: 'invoice.voided',
      version: 1,
      resource: { type: 'invoice', id: 'inv_1' },
      payload: {
        invoiceId: 'inv_1',
        customerId: 'cus_1',
        number: 'INV-001',
        currency: 'JMD',
        amountReversed: '1000',
        voidedAt: 100,
      },
      occurredAt: 100,
    })
    expect(mocks.enqueueBillingEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.completeCommand.mock.invocationCallOrder[0]!
    )
  })

  it('rejects voiding a written-off invoice without restoring Inventory', async () => {
    mocks.findInvoiceForVoid.mockResolvedValue({
      ...openInvoice(),
      status: 'UNCOLLECTIBLE',
      amountDue: 0n,
    })

    await expect(
      voidInvoiceWorkflow('ten_1', 'inv_1', {})
    ).resolves.toEqual({
      data: null,
      error: 'Only an unsettled collectible invoice can be voided.',
      status: 409,
    })

    expect(mocks.restore).not.toHaveBeenCalled()
    expect(mocks.markInvoiceVoid).not.toHaveBeenCalled()
  })

  it('writes off the full remaining receivable without restoring Inventory', async () => {
    mocks.findInvoiceForWriteOff.mockResolvedValue(openInvoice())

    await expect(
      writeOffInvoiceWorkflow('ten_1', 'inv_1', { reason: 'Collection exhausted' })
    ).resolves.toEqual({ data: { id: 'inv_1' }, error: null })

    expect(mocks.markInvoiceWrittenOff).toHaveBeenCalledWith({}, {
      id: 'inv_1',
      amount: 1000n,
      now: 100,
      reason: 'Collection exhausted',
      metadata: null,
    })
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith({}, {
      tenantId: 'ten_1',
      customerId: 'cus_1',
      subscriptionId: null,
      invoiceId: 'inv_1',
      type: 'WRITE_OFF',
      direction: 'CREDIT',
      amount: 1000n,
      currency: 'JMD',
      description: 'Invoice INV-001 written off',
      idempotencyKey: 'invoice:inv_1:write-off',
      effectiveAt: 100,
      createdAt: 100,
    })
    expect(mocks.restore).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledWith(
      {},
      'ten_1',
      'cus_1',
      100
    )
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith({}, 'ten_1', {
      type: 'invoice.written-off',
      version: 1,
      resource: { type: 'invoice', id: 'inv_1' },
      payload: {
        invoiceId: 'inv_1',
        customerId: 'cus_1',
        number: 'INV-001',
        currency: 'JMD',
        amountWrittenOff: '1000',
        reason: 'Collection exhausted',
        writtenOffAt: 100,
      },
      occurredAt: 100,
    })
  })

  it('rejects writing off an invoice that no longer has a collectible balance', async () => {
    mocks.findInvoiceForWriteOff.mockResolvedValue({
      ...openInvoice(),
      status: 'PAID',
      amountDue: 0n,
    })

    await expect(
      writeOffInvoiceWorkflow('ten_1', 'inv_1', { reason: 'Collection exhausted' })
    ).resolves.toEqual({
      data: null,
      error: 'Only an invoice with an open balance can be written off.',
      status: 409,
    })

    expect(mocks.markInvoiceWrittenOff).not.toHaveBeenCalled()
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).not.toHaveBeenCalled()
  })
})
