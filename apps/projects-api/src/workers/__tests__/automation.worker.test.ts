import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  repository,
  automationService,
  subjects,
  issues,
  labels,
  calendar,
  webhook,
  secureField,
  platformWebhooks,
} = vi.hoisted(() => ({
  repository: {
    claimEvents: vi.fn(),
    listRules: vi.fn(),
    findRun: vi.fn(),
    recordRun: vi.fn(),
    markEventProcessed: vi.fn(),
    recordEventAttempt: vi.fn(),
    computeRetryDelaySeconds: vi.fn((attempts: number) => Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1))),
    MAX_EVENT_ATTEMPTS: 5,
  },
  automationService: {
    sweepAutomationEvents: vi.fn(),
    createNotificationRecord: vi.fn(),
  },
  subjects: { buildSubjectSnapshot: vi.fn() },
  issues: { retrieve: vi.fn(), update: vi.fn(), create: vi.fn() },
  labels: { list: vi.fn() },
  calendar: { createReminder: vi.fn(), createEvent: vi.fn() },
  webhook: { postWebhook: vi.fn() },
  secureField: { unsealWebhookSecret: vi.fn() },
  platformWebhooks: {
    enqueueWebhookDeliveries: vi.fn(),
    drainWebhookDeliveries: vi.fn(async () => ({
      claimed: 0,
      delivered: 0,
      scheduled: 0,
      failed: 0,
      disabled: 0,
    })),
  },
}))

vi.mock('../../modules/automation/automation.repository.js', () => repository)
vi.mock('../../modules/automation/automation.service.js', () => automationService)
vi.mock('../../modules/automation/automation.subjects.js', () => subjects)
vi.mock('../../modules/issues/index.js', () => issues)
vi.mock('../../modules/labels/index.js', () => labels)
vi.mock('../../modules/calendar/index.js', () => calendar)
vi.mock('../../modules/automation/webhook.js', () => webhook)
vi.mock('../../modules/webhooks/index.js', () => platformWebhooks)
vi.mock('../../platform/secure-field.js', () => secureField)

const worker = await import('../automation.js')

const tenantId = 'prjten_1'

function eventRow(overrides = {}) {
  return {
    id: 'aev_1',
    tenantId,
    type: 'work-item.state-changed',
    subjectType: 'work-item',
    subjectId: 'iss_1',
    payload: { organizationId: 'org_1', projectId: 'prj_1' },
    causationDepth: 0,
    attempts: 0,
    claimedAt: null,
    processedAt: null,
    nextAttemptAt: null,
    createdAt: 1000n,
    ...overrides,
  }
}

function ruleRow(overrides = {}) {
  return {
    id: 'arl_1',
    tenantId,
    projectId: null,
    name: 'Notify on done',
    enabled: true,
    trigger: 'work-item.state-changed',
    conditions: [{ fieldKey: 'state', op: 'equals', value: 'done' }],
    actions: [{ type: 'notify', userId: 'user_9', title: 'Shipped' }],
    webhookSecret: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

function subject(overrides = {}) {
  return {
    subjectType: 'work-item',
    subjectId: 'iss_1',
    projectId: 'prj_1',
    values: { state: 'done', title: 'Ship' },
    ...overrides,
  }
}

beforeEach(() => {
  repository.listRules.mockResolvedValue([ruleRow()])
  repository.findRun.mockResolvedValue(null)
  repository.recordRun.mockImplementation(async (data: Record<string, unknown>) => data)
  subjects.buildSubjectSnapshot.mockResolvedValue({
    snapshot: subject(),
    error: null,
  })
  issues.update.mockResolvedValue({ data: { id: 'iss_1' }, error: null })
  issues.create.mockResolvedValue({ data: { id: 'iss_2' }, error: null })
  issues.retrieve.mockResolvedValue({
    data: { id: 'iss_1', labels: [{ id: 'lbl_1', name: 'bug' }] },
    error: null,
  })
  labels.list.mockResolvedValue({
    data: [{ id: 'lbl_2', name: 'urgent' }],
    error: null,
  })
  calendar.createReminder.mockResolvedValue({ data: { id: 'prjrem_1' }, error: null })
  calendar.createEvent.mockResolvedValue({ data: { id: 'prjev_1' }, error: null })
  automationService.createNotificationRecord.mockResolvedValue({ id: 'ntf_1' })
  automationService.sweepAutomationEvents.mockResolvedValue({
    tenants: 1,
    dueApproaching: 2,
    budgetThreshold: 0,
  })
  repository.claimEvents.mockResolvedValue([])
  webhook.postWebhook.mockResolvedValue({ status: 200, durationMs: 5 })
  secureField.unsealWebhookSecret.mockResolvedValue('plain-secret')
})

describe('processAutomationEvent', () => {
  it('marks events processed when no rule matches the trigger', async () => {
    repository.listRules.mockResolvedValue([
      ruleRow({ trigger: 'phase.completed' }),
    ])

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts).toEqual({ succeeded: 0, failed: 0, skipped: 0 })
    expect(repository.markEventProcessed).toHaveBeenCalledWith(
      'aev_1',
      expect.any(BigInt)
    )
    expect(repository.recordRun).not.toHaveBeenCalled()
  })

  it('skips automation-caused chains deeper than three', async () => {
    const counts = await worker.processAutomationEvent(
      eventRow({ causationDepth: 4 })
    )

    expect(counts.skipped).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        errorCode: 'automation/max-depth-exceeded',
      })
    )
    expect(automationService.createNotificationRecord).not.toHaveBeenCalled()
    expect(repository.markEventProcessed).toHaveBeenCalled()
  })

  it('still processes depth-three events', async () => {
    const counts = await worker.processAutomationEvent(
      eventRow({ causationDepth: 3 })
    )

    expect(counts.succeeded).toBe(1)
  })

  it('records skipped runs when conditions do not match', async () => {
    subjects.buildSubjectSnapshot.mockResolvedValue({
      snapshot: subject({ values: { state: 'todo' } }),
      error: null,
    })

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.skipped).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'skipped', errorCode: null })
    )
    expect(automationService.createNotificationRecord).not.toHaveBeenCalled()
  })

  it('notifies through the owning notification path on success', async () => {
    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.succeeded).toBe(1)
    expect(automationService.createNotificationRecord).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        userId: 'user_9',
        kind: 'automation',
        title: 'Shipped',
        subjectId: 'iss_1',
      })
    )
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'succeeded', errorCode: null })
    )
    expect(repository.markEventProcessed).toHaveBeenCalled()
  })

  it('never re-executes a rule that already succeeded for the event', async () => {
    repository.findRun.mockResolvedValue({ status: 'succeeded' })

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.skipped).toBe(1)
    expect(automationService.createNotificationRecord).not.toHaveBeenCalled()
    expect(repository.recordRun).not.toHaveBeenCalled()
  })

  it('retries rules whose previous run failed', async () => {
    repository.findRun.mockResolvedValue({ status: 'failed' })

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.succeeded).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'succeeded' })
    )
  })

  it('backs off and requeues the event when an action fails', async () => {
    automationService.createNotificationRecord.mockRejectedValue(
      new Error('db down')
    )
    const failing = async () => {
      throw new Error('db down')
    }
    automationService.createNotificationRecord.mockImplementation(failing)

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.failed).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    )
    expect(repository.recordEventAttempt).toHaveBeenCalledWith(
      'aev_1',
      1,
      expect.any(BigInt)
    )
    expect(repository.markEventProcessed).not.toHaveBeenCalled()
  })

  it('records a later nextAttemptAt as attempts grow', async () => {
    automationService.createNotificationRecord.mockRejectedValue(
      new Error('db down')
    )

    await worker.processAutomationEvent(eventRow({ attempts: 0 }))
    await worker.processAutomationEvent(eventRow({ attempts: 3 }))

    const first = repository.recordEventAttempt.mock.calls[0]?.[2] as bigint
    const second = repository.recordEventAttempt.mock.calls[1]?.[2] as bigint
    expect(second > first).toBe(true)
  })

  it('parks the event after five attempts', async () => {
    automationService.createNotificationRecord.mockRejectedValue(
      new Error('db down')
    )

    const counts = await worker.processAutomationEvent(
      eventRow({ attempts: 4 })
    )

    expect(counts.failed).toBe(1)
    expect(repository.markEventProcessed).toHaveBeenCalledWith(
      'aev_1',
      expect.any(BigInt)
    )
    expect(repository.recordEventAttempt).not.toHaveBeenCalled()
  })

  it('fails fast when the payload lost its organization', async () => {
    const counts = await worker.processAutomationEvent(
      eventRow({ payload: { projectId: 'prj_1' } })
    )

    expect(counts.failed).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'automation/organization-missing',
      })
    )
    expect(repository.markEventProcessed).toHaveBeenCalled()
  })

  it('fails fast when the subject is gone', async () => {
    subjects.buildSubjectSnapshot.mockResolvedValue({
      snapshot: null,
      error: { code: 'projects/issue-not-found' },
    })

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.failed).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'projects/automation-subject-not-found',
      })
    )
    expect(repository.markEventProcessed).toHaveBeenCalled()
  })

  it('ignores project-scoped rules from other projects', async () => {
    repository.listRules.mockResolvedValue([
      ruleRow({ projectId: 'prj_other' }),
    ])

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts).toEqual({ succeeded: 0, failed: 0, skipped: 0 })
    expect(repository.recordRun).not.toHaveBeenCalled()
    expect(repository.markEventProcessed).toHaveBeenCalled()
  })

  it('scopes rule lookup and run records to the event tenant', async () => {
    repository.listRules.mockImplementation(async (lookupTenantId: string) =>
      lookupTenantId === tenantId ? [ruleRow()] : []
    )

    const counts = await worker.processAutomationEvent(eventRow())

    expect(repository.listRules).toHaveBeenCalledWith(tenantId)
    expect(counts.succeeded).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        ruleId: 'arl_1',
        eventId: 'aev_1',
        status: 'succeeded',
      })
    )
    expect(automationService.createNotificationRecord).toHaveBeenCalledWith(
      tenantId,
      expect.anything()
    )
  })
})

describe('automation actions', () => {
  async function runAction(action: Record<string, unknown>) {
    repository.listRules.mockResolvedValue([
      ruleRow({ conditions: [], actions: [action] }),
    ])
    return worker.processAutomationEvent(eventRow())
  }

  it('sets fields through the issues service as the automation actor', async () => {
    const counts = await runAction({
      type: 'set-field',
      fieldKey: 'title',
      value: 'Renamed by automation',
    })

    expect(counts.succeeded).toBe(1)
    expect(issues.update).toHaveBeenCalledWith(
      'org_1',
      'iss_1',
      { title: 'Renamed by automation' },
      expect.objectContaining({
        automationRuleId: 'arl_1',
        causationDepth: 1,
      })
    )
  })

  it('rejects unknown field keys', async () => {
    const counts = await runAction({
      type: 'set-field',
      fieldKey: 'nope',
      value: 'x',
    })

    expect(counts.failed).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'automation/unknown-field',
      })
    )
  })

  it('rejects set-field on non-work-item subjects', async () => {
    subjects.buildSubjectSnapshot.mockResolvedValue({
      snapshot: subject({
        subjectType: 'phase',
        subjectId: 'ms_1',
        values: {},
      }),
      error: null,
    })
    repository.listRules.mockResolvedValue([
      ruleRow({
        trigger: 'phase.completed',
        conditions: [],
        actions: [{ type: 'set-field', fieldKey: 'title', value: 'x' }],
      }),
    ])

    const counts = await worker.processAutomationEvent(
      eventRow({ type: 'phase.completed', subjectType: 'phase', subjectId: 'ms_1' })
    )

    expect(counts.failed).toBe(1)
    expect(issues.update).not.toHaveBeenCalled()
  })

  it('assigns through the issues service', async () => {
    const counts = await runAction({ type: 'assign', userId: 'user_2' })

    expect(counts.succeeded).toBe(1)
    expect(issues.update).toHaveBeenCalledWith(
      'org_1',
      'iss_1',
      { assigneeUserId: 'user_2' },
      expect.objectContaining({ automationRuleId: 'arl_1' })
    )
  })

  it('adds labels by name', async () => {
    const counts = await runAction({ type: 'add-label', label: 'Urgent' })

    expect(counts.succeeded).toBe(1)
    expect(issues.update).toHaveBeenCalledWith(
      'org_1',
      'iss_1',
      { labelIds: ['lbl_1', 'lbl_2'] },
      expect.anything()
    )
  })

  it('removes labels', async () => {
    const counts = await runAction({ type: 'remove-label', label: 'lbl_1' })

    expect(counts.succeeded).toBe(1)
    expect(issues.update).toHaveBeenCalledWith(
      'org_1',
      'iss_1',
      { labelIds: [] },
      expect.anything()
    )
  })

  it('fails unknown labels without touching the issue', async () => {
    const counts = await runAction({ type: 'add-label', label: 'Missing' })

    expect(counts.failed).toBe(1)
    expect(issues.update).not.toHaveBeenCalled()
  })

  it('creates reminders for the subject as the automation actor', async () => {
    const counts = await runAction({
      type: 'create-reminder',
      offsetMinutesBeforeDue: 60,
    })

    expect(counts.succeeded).toBe(1)
    expect(calendar.createReminder).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        issueId: 'iss_1',
        offsetMinutesBeforeDue: 60,
        createdBy: 'automation:arl_1',
      })
    )
  })

  it('creates events in the subject project', async () => {
    const counts = await runAction({
      type: 'create-event',
      title: 'Release review',
      startsAt: 2000,
    })

    expect(counts.succeeded).toBe(1)
    expect(calendar.createEvent).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        projectId: 'prj_1',
        issueId: 'iss_1',
        title: 'Release review',
      })
    )
  })

  it('signs webhook calls without ever logging the secret', async () => {
    repository.listRules.mockResolvedValue([
      ruleRow({
        conditions: [],
        actions: [{ type: 'call-webhook', url: 'https://hooks.example.test/x' }],
        webhookSecret: {
          ciphertext: 'sealed',
          keyId: null,
          provider: 'local_aesgcm',
        },
      }),
    ])

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.succeeded).toBe(1)
    expect(secureField.unsealWebhookSecret).toHaveBeenCalledWith(
      tenantId,
      'arl_1',
      expect.objectContaining({ ciphertext: 'sealed' })
    )
    expect(webhook.postWebhook).toHaveBeenCalledWith(
      'https://hooks.example.test/x',
      'plain-secret',
      expect.objectContaining({ ruleId: 'arl_1', eventId: 'aev_1' })
    )
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'succeeded', responseCode: 200 })
    )
  })

  it('fails webhooks without a configured secret', async () => {
    const counts = await runAction({
      type: 'call-webhook',
      url: 'https://hooks.example.test/x',
    })

    expect(counts.failed).toBe(1)
    expect(webhook.postWebhook).not.toHaveBeenCalled()
  })

  it('fails webhooks with error responses', async () => {
    webhook.postWebhook.mockResolvedValue({ status: 500, durationMs: 5 })
    repository.listRules.mockResolvedValue([
      ruleRow({
        conditions: [],
        actions: [{ type: 'call-webhook', url: 'https://hooks.example.test/x' }],
        webhookSecret: {
          ciphertext: 'sealed',
          keyId: null,
          provider: 'local_aesgcm',
        },
      }),
    ])

    const counts = await worker.processAutomationEvent(eventRow())

    expect(counts.failed).toBe(1)
    expect(repository.recordRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'automation/webhook-failed',
      })
    )
  })

  it('creates sub-items under the subject issue', async () => {
    const counts = await runAction({
      type: 'create-sub-item',
      title: 'Follow-up',
    })

    expect(counts.succeeded).toBe(1)
    expect(issues.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        projectId: 'prj_1',
        title: 'Follow-up',
        parentIssueId: 'iss_1',
      }),
      expect.objectContaining({ automationRuleId: 'arl_1', causationDepth: 1 })
    )
  })
})

describe('drainAutomation', () => {
  it('sweeps, claims a bounded batch, and returns counts', async () => {
    repository.claimEvents.mockResolvedValue([eventRow(), eventRow({ id: 'aev_2' })])

    const result = await worker.drainAutomation(25, 1000)

    expect(repository.claimEvents).toHaveBeenCalledWith(25, expect.any(BigInt))
    expect(automationService.sweepAutomationEvents).toHaveBeenCalledWith(1000)
    expect(result).toMatchObject({
      claimed: 2,
      processedEvents: 2,
      succeeded: 2,
      swept: { tenants: 1, dueApproaching: 2, budgetThreshold: 0 },
    })
  })

  it('fans claimed outbox events out to webhook endpoints in the same drain', async () => {
    repository.claimEvents.mockResolvedValue([eventRow(), eventRow({ id: 'aev_2' })])
    platformWebhooks.drainWebhookDeliveries.mockResolvedValueOnce({
      claimed: 2,
      delivered: 2,
      scheduled: 0,
      failed: 0,
      disabled: 0,
    })

    const result = await worker.drainAutomation(25, 1000)

    expect(platformWebhooks.enqueueWebhookDeliveries).toHaveBeenCalledWith({
      id: 'aev_1',
      tenantId,
      type: 'work-item.state-changed',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      payload: { organizationId: 'org_1', projectId: 'prj_1' },
      createdAt: 1000,
    })
    expect(platformWebhooks.enqueueWebhookDeliveries).toHaveBeenCalledWith({
      id: 'aev_2',
      tenantId,
      type: 'work-item.state-changed',
      subjectType: 'work-item',
      subjectId: 'iss_1',
      payload: { organizationId: 'org_1', projectId: 'prj_1' },
      createdAt: 1000,
    })
    expect(platformWebhooks.drainWebhookDeliveries).toHaveBeenCalled()
    expect(result.webhooks).toMatchObject({ claimed: 2, delivered: 2 })
  })
})
