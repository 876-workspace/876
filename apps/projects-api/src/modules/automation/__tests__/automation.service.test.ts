import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenants,
  repository,
  secureField,
  issues,
  projects,
  finance,
  time,
  workStructure,
} = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  repository: {
    appendOutboxEvent: vi.fn(),
    directWriter: vi.fn(() => ({ automationEvent: { create: vi.fn() } })),
    listRules: vi.fn(),
    retrieveRule: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    softDeleteRule: vi.fn(),
    findRun: vi.fn(),
    recordRun: vi.fn(),
    listRunsForRule: vi.fn(),
    createNotification: vi.fn(),
    listNotificationsForUser: vi.fn(),
    retrieveNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    existsEventSince: vi.fn(),
    listTenantIdentities: vi.fn(),
  },
  secureField: { sealWebhookSecret: vi.fn(), unsealWebhookSecret: vi.fn() },
  issues: { listDueSoon: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
  projects: { list: vi.fn() },
  finance: { getFinancialSummary: vi.fn(), retrieveBudget: vi.fn() },
  time: { retrieveTimeEntry: vi.fn() },
  workStructure: { retrieveMilestone: vi.fn() },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../automation.repository.js', () => repository)
vi.mock('../../../platform/secure-field.js', () => secureField)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../finance/index.js', () => finance)
vi.mock('../../time/index.js', () => time)
vi.mock('../../work-structure/index.js', () => workStructure)

const service = await import('../automation.service.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }

function ruleRow(overrides = {}) {
  return {
    id: 'arl_1',
    tenantId: tenant.id,
    projectId: null,
    name: 'Ship it',
    enabled: true,
    trigger: 'work-item.state-changed',
    conditions: [{ fieldKey: 'state', op: 'equals', value: 'done' }],
    actions: [{ type: 'notify', userId: 'user_1', title: 'Done' }],
    webhookSecret: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

function issueData(overrides = {}) {
  return {
    id: 'iss_1',
    projectId: 'prj_1',
    status: 'done',
    title: 'Ship',
    description: null,
    priority: 'none',
    assigneeUserId: null,
    dueDate: null,
    plannedStartDate: null,
    estimate: null,
    labels: [],
    milestone: null,
    taskListId: null,
    ...overrides,
  }
}

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  repository.retrieveRule.mockResolvedValue(ruleRow())
  repository.createRule.mockImplementation(async (data: Record<string, unknown>) => ({
    ...ruleRow(),
    ...data,
  }))
  repository.updateRule.mockImplementation(
    async (_id: string, data: Record<string, unknown>) => ({
      ...ruleRow(),
      ...data,
    })
  )
  repository.listRules.mockResolvedValue([])
  repository.listRunsForRule.mockResolvedValue([])
  secureField.sealWebhookSecret.mockResolvedValue({
    ciphertext: 'sealed',
    keyId: null,
    provider: 'local_aesgcm',
  })
  issues.listDueSoon.mockResolvedValue({ data: [], error: null })
  issues.retrieve.mockResolvedValue({ data: issueData(), error: null })
  projects.list.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  finance.getFinancialSummary.mockResolvedValue({
    data: { budgets: [] },
    error: null,
  })
  repository.existsEventSince.mockResolvedValue(false)
  repository.listTenantIdentities.mockResolvedValue([])
})

describe('createRule', () => {
  const body = {
    name: 'Ship it',
    trigger: 'work-item.state-changed' as const,
    actions: [{ type: 'notify' as const, userId: 'user_1', title: 'Done' }],
  }

  it('seals the webhook secret and never serializes it', async () => {
    const result = await service.createRule('org_1', {
      ...body,
      webhookSecret: 'super-secret',
    })

    expect(result.error).toBeNull()
    expect(secureField.sealWebhookSecret).toHaveBeenCalledWith(
      tenant.id,
      expect.stringMatching(/^arl_/),
      'super-secret'
    )
    expect(result.data?.hasWebhookSecret).toBe(true)
    expect(result.data).not.toHaveProperty('webhookSecret')
    expect(JSON.stringify(result.data)).not.toContain('super-secret')
    expect(JSON.stringify(result.data)).not.toContain('sealed')
  })

  it('creates rules without a secret', async () => {
    const result = await service.createRule('org_1', body)

    expect(result.error).toBeNull()
    expect(secureField.sealWebhookSecret).not.toHaveBeenCalled()
    expect(result.data?.hasWebhookSecret).toBe(false)
  })

  it('fails closed when sealing fails', async () => {
    secureField.sealWebhookSecret.mockRejectedValue(new Error('no key'))

    const result = await service.createRule('org_1', {
      ...body,
      webhookSecret: 'super-secret',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/internal-error')
    expect(repository.createRule).not.toHaveBeenCalled()
  })
})

describe('updateRule', () => {
  it('rotates the webhook secret', async () => {
    const result = await service.updateRule('org_1', 'arl_1', {
      webhookSecret: 'rotated',
    })

    expect(result.error).toBeNull()
    expect(secureField.sealWebhookSecret).toHaveBeenCalledWith(
      tenant.id,
      'arl_1',
      'rotated'
    )
    expect(result.data?.hasWebhookSecret).toBe(true)
  })

  it('clears the secret when null is provided', async () => {
    repository.updateRule.mockResolvedValue(ruleRow({ webhookSecret: null }))

    const result = await service.updateRule('org_1', 'arl_1', {
      webhookSecret: null,
    })

    expect(result.error).toBeNull()
    expect(repository.updateRule).toHaveBeenCalledWith(
      'arl_1',
      expect.objectContaining({ webhookSecret: null })
    )
    expect(result.data?.hasWebhookSecret).toBe(false)
  })

  it('returns 404 for unknown rules without touching the sealer', async () => {
    repository.retrieveRule.mockResolvedValue(null)

    const result = await service.updateRule('org_1', 'arl_missing', {
      name: 'Renamed',
    })

    expect(result.error?.code).toBe('projects/automation-rule-not-found')
    expect(secureField.sealWebhookSecret).not.toHaveBeenCalled()
  })
})

describe('removeRule', () => {
  it('soft-deletes the rule', async () => {
    const result = await service.removeRule('org_1', 'arl_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.automation-rule',
      id: 'arl_1',
      deleted: true,
    })
    expect(repository.softDeleteRule).toHaveBeenCalledWith(
      'arl_1',
      expect.any(BigInt)
    )
  })

  it('returns 404 for unknown rules', async () => {
    repository.retrieveRule.mockResolvedValue(null)

    const result = await service.removeRule('org_1', 'arl_missing')

    expect(result.error?.code).toBe('projects/automation-rule-not-found')
  })
})

describe('listRuns', () => {
  it('returns 404 for unknown rules', async () => {
    repository.retrieveRule.mockResolvedValue(null)

    const result = await service.listRuns('org_1', 'arl_missing')

    expect(result.error?.code).toBe('projects/automation-rule-not-found')
  })

  it('serializes recorded runs', async () => {
    repository.listRunsForRule.mockResolvedValue([
      {
        id: 'arn_1',
        tenantId: tenant.id,
        ruleId: 'arl_1',
        eventId: 'aev_1',
        status: 'succeeded',
        errorCode: null,
        attempt: 1,
        responseCode: null,
        startedAt: 1000n,
        finishedAt: 1001n,
        durationMs: 1000,
        createdAt: 1001n,
      },
    ])

    const result = await service.listRuns('org_1', 'arl_1')

    expect(result.error).toBeNull()
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.automation-run',
      status: 'succeeded',
    })
  })
})

describe('testRule dry-run', () => {
  it('reports matched conditions and planned actions without performing anything', async () => {
    const result = await service.testRule('org_1', 'arl_1', {
      subjectId: 'iss_1',
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.automation-test',
      ruleId: 'arl_1',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      matched: true,
      conditions: [{ fieldKey: 'state', op: 'equals', matched: true }],
      plannedActions: [{ type: 'notify' }],
    })
    expect(issues.update).not.toHaveBeenCalled()
    expect(repository.createNotification).not.toHaveBeenCalled()
    expect(repository.appendOutboxEvent).not.toHaveBeenCalled()
  })

  it('reports unmatched conditions per condition', async () => {
    issues.retrieve.mockResolvedValue({
      data: issueData({ status: 'todo' }),
      error: null,
    })

    const result = await service.testRule('org_1', 'arl_1', {
      subjectId: 'iss_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.matched).toBe(false)
    expect(result.data?.conditions).toEqual([
      { fieldKey: 'state', op: 'equals', matched: false },
    ])
  })

  it('surfaces missing subjects without side effects', async () => {
    issues.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/issue-not-found' },
    })

    const result = await service.testRule('org_1', 'arl_1', {
      subjectId: 'iss_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(issues.update).not.toHaveBeenCalled()
  })
})

describe('notifications', () => {
  function notificationRow(overrides = {}) {
    return {
      id: 'ntf_1',
      tenantId: tenant.id,
      userId: 'user_1',
      kind: 'automation',
      title: 'Done',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      readAt: null,
      createdAt: 1000n,
      ...overrides,
    }
  }

  it('lists serialized notifications', async () => {
    repository.listNotificationsForUser.mockResolvedValue([notificationRow()])

    const result = await service.listNotifications('org_1', 'user_1')

    expect(result.data?.[0]).toMatchObject({
      object: 'projects.notification',
      readAt: null,
    })
  })

  it('marks unread notifications read', async () => {
    repository.retrieveNotification.mockResolvedValue(notificationRow())
    repository.markNotificationRead.mockResolvedValue(
      notificationRow({ readAt: 2000n })
    )

    const result = await service.readNotification('org_1', 'ntf_1')

    expect(result.data?.readAt).toBe(2000)
  })

  it('leaves already-read notifications untouched', async () => {
    repository.retrieveNotification.mockResolvedValue(
      notificationRow({ readAt: 1500n })
    )

    const result = await service.readNotification('org_1', 'ntf_1')

    expect(result.data?.readAt).toBe(1500)
    expect(repository.markNotificationRead).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown notifications', async () => {
    repository.retrieveNotification.mockResolvedValue(null)

    const result = await service.readNotification('org_1', 'ntf_missing')

    expect(result.error?.code).toBe('projects/notification-not-found')
  })
})

describe('sweep', () => {
  it('produces due-approaching events for issues without one today', async () => {
    issues.listDueSoon.mockResolvedValue({
      data: [
        { id: 'iss_1', projectId: 'prj_1', status: 'todo', dueDate: 2000 },
        { id: 'iss_2', projectId: 'prj_1', status: 'todo', dueDate: 2001 },
      ],
      error: null,
    })
    repository.existsEventSince.mockImplementation(
      async (
        _tenantId: string,
        _type: string,
        _subjectType: string,
        subjectId: string
      ) => subjectId === 'iss_2'
    )
    repository.listTenantIdentities.mockResolvedValue([
      { id: tenant.id, organizationId: 'org_1' },
    ])

    const counts = await service.sweepAutomationEvents(1000)

    expect(counts).toMatchObject({ tenants: 1, dueApproaching: 1 })
    expect(repository.appendOutboxEvent).toHaveBeenCalledTimes(1)
    expect(repository.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'due-date.approaching',
        subjectType: 'work-item',
        subjectId: 'iss_1',
      })
    )
  })

  it('dedupes sweep events per item per day', async () => {
    issues.listDueSoon.mockResolvedValue({
      data: [{ id: 'iss_1', projectId: 'prj_1', status: 'todo', dueDate: 2000 }],
      error: null,
    })
    repository.existsEventSince.mockResolvedValue(true)
    repository.listTenantIdentities.mockResolvedValue([
      { id: tenant.id, organizationId: 'org_1' },
    ])

    const counts = await service.sweepAutomationEvents(1000)

    expect(counts.dueApproaching).toBe(0)
    expect(repository.appendOutboxEvent).not.toHaveBeenCalled()
  })

  it('produces threshold events only for budgets over threshold', async () => {
    projects.list.mockResolvedValue({
      data: {
        items: [{ id: 'prj_1' }],
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
    finance.getFinancialSummary.mockResolvedValue({
      data: {
        budgets: [
          { budgetId: 'bdg_over', overThreshold: true, percent: 90 },
          { budgetId: 'bdg_ok', overThreshold: false, percent: 10 },
        ],
      },
      error: null,
    })
    repository.listTenantIdentities.mockResolvedValue([
      { id: tenant.id, organizationId: 'org_1' },
    ])

    const counts = await service.sweepAutomationEvents(1000)

    expect(counts.budgetThreshold).toBe(1)
    expect(repository.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'budget.threshold-reached',
        subjectType: 'budget',
        subjectId: 'bdg_over',
      })
    )
  })

  it('skips projects whose summary cannot be computed', async () => {
    projects.list.mockResolvedValue({
      data: {
        items: [{ id: 'prj_1' }],
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
    finance.getFinancialSummary.mockResolvedValue({
      data: null,
      error: { code: 'projects/internal-error' },
    })
    repository.listTenantIdentities.mockResolvedValue([
      { id: tenant.id, organizationId: 'org_1' },
    ])

    const counts = await service.sweepAutomationEvents(1000)

    expect(counts.budgetThreshold).toBe(0)
    expect(repository.appendOutboxEvent).not.toHaveBeenCalled()
  })
})

describe('appendOutboxEvent', () => {
  const writer = () => ({
    automationEvent: { create: async () => ({}) },
  })

  it('appends with depth zero by default', async () => {
    const client = writer()

    await service.appendOutboxEvent(client, {
      tenantId: tenant.id,
      type: 'work-item.created',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      payload: { organizationId: 'org_1' },
    })

    expect(repository.appendOutboxEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        id: expect.stringMatching(/^aev_/),
        tenantId: tenant.id,
        type: 'work-item.created',
        subjectType: 'work-item',
        subjectId: 'iss_1',
        causationDepth: 0,
      })
    )
  })

  it('carries automation causation depth forward', async () => {
    const client = writer()

    await service.appendOutboxEvent(client, {
      tenantId: tenant.id,
      type: 'work-item.updated',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      payload: { organizationId: 'org_1' },
      causationDepth: 2,
    })

    expect(repository.appendOutboxEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ causationDepth: 2 })
    )
  })
})
