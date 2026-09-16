import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, layouts, core, structureRepository, details, automation } =
  vi.hoisted(() => ({
    tenants: { resolveTenant: vi.fn() },
    layouts: { enforceLayoutRules: vi.fn() },
    core: { retrieveMilestone: vi.fn(), updateMilestone: vi.fn() },
    structureRepository: { transaction: vi.fn() },
    details: {
      listMilestoneCustomFieldValues: vi.fn(),
      createMilestoneEvent: vi.fn(),
    },
    automation: { appendOutboxEvent: vi.fn() },
  }))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../layouts/index.js', () => layouts)
vi.mock('../work-structure.service.js', () => core)
vi.mock('../work-structure.repository.js', () => structureRepository)
vi.mock('../milestone-details.repository.js', () => details)
vi.mock('../../automation/index.js', () => automation)

const service = await import('../milestone-details.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
let activeTx: Record<string, unknown>

function milestoneData(overrides = {}) {
  return {
    id: 'ms_1',
    tenantId: tenant.id,
    projectId: 'prj_1',
    key: 'M1',
    name: 'Phase one',
    description: null,
    status: 'open',
    ownerUserId: null,
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  layouts.enforceLayoutRules.mockResolvedValue({ data: null, error: null })
  details.listMilestoneCustomFieldValues.mockResolvedValue([])
  details.createMilestoneEvent.mockResolvedValue({})
  core.retrieveMilestone.mockResolvedValue({
    data: milestoneData(),
    error: null,
  })
  core.updateMilestone.mockImplementation(
    async (
      _org: string,
      _id: string,
      input: Record<string, unknown>,
    ) => ({
      data: milestoneData({
        status: (input.status as string | undefined) ?? 'open',
        ...(input as Record<string, unknown>),
      }),
      error: null,
    })
  )
  activeTx = { client: { tag: 'milestone-transaction-client' } }
  structureRepository.transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) => callback(activeTx)
  )
})

describe('phase completion outbox', () => {
  it('appends phase.completed in the same transaction as completion', async () => {
    const result = await service.updateMilestone('org_1', 'ms_1', {
      status: 'completed',
    })

    expect(result.error).toBeNull()
    expect(core.updateMilestone).toHaveBeenCalledWith(
      'org_1',
      'ms_1',
      expect.objectContaining({ status: 'completed' }),
      expect.objectContaining({ client: activeTx.client })
    )
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      activeTx.client,
      expect.objectContaining({
        tenantId: tenant.id,
        type: 'phase.completed',
        subjectType: 'phase',
        subjectId: 'ms_1',
      })
    )
  })

  it('appends nothing when the phase does not complete', async () => {
    const result = await service.updateMilestone('org_1', 'ms_1', {
      name: 'Renamed phase',
    })

    expect(result.error).toBeNull()
    expect(automation.appendOutboxEvent).not.toHaveBeenCalled()
  })
})
