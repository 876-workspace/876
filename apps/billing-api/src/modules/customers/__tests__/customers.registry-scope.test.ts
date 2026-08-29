import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    customer: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
    },
  },
}))

import {
  findCustomerDetailRow,
  findCustomerRow,
  listCustomerRows,
} from '../customers.repository'

/**
 * The org-customer registry is shared across every app serving the
 * organization. A read is authorized by the tenant plus the granted
 * `billing.customers.read` scope, never by which app created the row —
 * otherwise an app cannot resolve the identity of a registry customer its own
 * profile points at. See `.claude/rules/customer-architecture.md`.
 */
describe('registry read scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMany.mockResolvedValue([])
    mocks.findFirst.mockResolvedValue(null)
  })

  function whereOf(mock: typeof mocks.findMany) {
    return (mock.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
  }

  it('does not filter a list by the calling app', async () => {
    await listCustomerRows('ten_1', { limit: 100, ids: undefined })

    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(whereOf(mocks.findMany)).toEqual({ tenantId: 'ten_1' })
  })

  it('scopes a list to the tenant', async () => {
    await listCustomerRows('ten_1', { limit: 100, ids: undefined })

    expect(whereOf(mocks.findMany).tenantId).toBe('ten_1')
  })

  it('applies an explicit ids filter', async () => {
    await listCustomerRows('ten_1', { limit: 1, ids: ['cust_a'] })

    expect(whereOf(mocks.findMany)).toEqual({
      tenantId: 'ten_1',
      AND: [{ id: { in: ['cust_a'] } }],
    })
  })

  it('keeps the ids filter when a pagination cursor is also supplied', async () => {
    // Regression: both predicates wrote the same `id` key on one object
    // literal, so the later spread silently discarded the earlier filter.
    await listCustomerRows('ten_1', {
      limit: 10,
      ids: ['cust_a', 'cust_b'],
      starting_after: 'cust_a',
    })

    expect(whereOf(mocks.findMany).AND).toEqual([
      { id: { in: ['cust_a', 'cust_b'] } },
      { id: { gt: 'cust_a' } },
    ])
  })

  it('keeps the ids filter when paging backwards', async () => {
    await listCustomerRows('ten_1', {
      limit: 10,
      ids: ['cust_a'],
      ending_before: 'cust_z',
    })

    expect(whereOf(mocks.findMany).AND).toEqual([
      { id: { in: ['cust_a'] } },
      { id: { lt: 'cust_z' } },
    ])
  })

  it('omits the AND clause entirely when no id predicate applies', async () => {
    await listCustomerRows('ten_1', {
      limit: 10,
      ids: undefined,
      status: 'ACTIVE',
    })

    expect(whereOf(mocks.findMany)).toEqual({
      tenantId: 'ten_1',
      status: 'ACTIVE',
    })
    expect('AND' in whereOf(mocks.findMany)).toBe(false)
  })

  it('still filters a list by user and organization links', async () => {
    await listCustomerRows('ten_1', {
      limit: 10,
      ids: undefined,
      userId: 'user_1',
      organizationId: 'org_1',
    })

    expect(whereOf(mocks.findMany)).toEqual({
      tenantId: 'ten_1',
      userId: 'user_1',
      organizationId: 'org_1',
    })
  })

  it('resolves a platform-created customer that no app owns', async () => {
    // The core outbox writes org-derived customers with a null sourceAppId.
    // Filtering reads on the calling app made them unreadable by every app.
    mocks.findMany.mockResolvedValue([
      { id: 'cust_org', name: 'Test Org', sourceAppId: null },
    ])

    const rows = await listCustomerRows('ten_1', {
      limit: 1,
      ids: ['cust_org'],
    })

    expect(rows).toEqual([
      { id: 'cust_org', name: 'Test Org', sourceAppId: null },
    ])
    expect(whereOf(mocks.findMany)).not.toHaveProperty('sourceAppId')
  })

  it('does not filter a single-row read by the calling app', async () => {
    await findCustomerRow('ten_1', 'cust_a')

    expect(mocks.findFirst).toHaveBeenCalledTimes(1)
    expect(whereOf(mocks.findFirst)).toEqual({
      tenantId: 'ten_1',
      id: 'cust_a',
    })
  })

  it('does not filter a detail read by the calling app', async () => {
    await findCustomerDetailRow('ten_1', 'cust_a')

    expect(mocks.findFirst).toHaveBeenCalledTimes(1)
    expect(whereOf(mocks.findFirst)).toEqual({
      tenantId: 'ten_1',
      id: 'cust_a',
    })
  })

  it('never leaks a customer from another tenant on a detail read', async () => {
    await findCustomerDetailRow('ten_1', 'cust_a')

    expect(whereOf(mocks.findFirst).tenantId).toBe('ten_1')
  })
})
